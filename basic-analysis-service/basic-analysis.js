// index.js (o el nombre que le des, ej. analysisService.js)
// Este servicio backend se encarga de:
// 1. Conectarse al broker MQTT.
// 2. Suscribirse dinámicamente a los topics MQTT de los sensores registrados en Supabase.
// 3. Recibir mensajes de vibración de los sensores.
// 4. Analizar los datos de vibración usando los límites de la ISO 10816 y los perfiles de vibración personalizados del activo.
// 5. Guardar los resultados del análisis en la tabla 'analysis_results' en Supabase.

// Cargar variables de entorno desde el archivo .env.
require('dotenv').config();

// Importar las librerías necesarias:
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

// 1. Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configuradas en el archivo .env del servicio.');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Configuración del Cliente MQTT
const mqttBrokerUrl = process.env.MQTT_BROKER_URL;
if (!mqttBrokerUrl) {
    console.error('Error: La variable de entorno MQTT_BROKER_URL debe estar configurada en el archivo .env del servicio.');
    process.exit(1);
}
const mqttClient = mqtt.connect(mqttBrokerUrl);

// Un Set para mantener un registro de los topics MQTT a los que ya estamos suscritos.
let subscribedTopics = new Set();

/**
 * Función asíncrona para cargar los topics MQTT de todos los sensores desde Supabase
 * y suscribirse a aquellos que aún no estén suscritos.
 */
async function loadAndSubscribeSensorTopics() {
    console.log('[DEBUG] Intentando cargar topics de sensores desde Supabase...');
    const { data: sensors, error } = await supabase
        .from('sensors')
        .select('id, asset_id, mqtt_topic, type');

    if (error) {
        console.error('[ERROR] Error al obtener sensores de Supabase:', error.message);
        return;
    }
    console.log(`[DEBUG] Sensores cargados: ${sensors.length} encontrados.`);

    const topicsToSubscribe = sensors
        .filter(s => s.mqtt_topic && !subscribedTopics.has(s.mqtt_topic))
        .map(s => s.mqtt_topic);

    if (topicsToSubscribe.length > 0) {
        mqttClient.subscribe(topicsToSubscribe, (err) => {
            if (!err) {
                topicsToSubscribe.forEach(topic => subscribedTopics.add(topic));
                console.log('[INFO] Suscrito a nuevos topics:', topicsToSubscribe);
            } else {
                console.error('[ERROR] Error al suscribirse a topics:', err);
            }
        });
    } else {
        console.log('[INFO] No hay nuevos topics de sensores para suscribirse.');
    }
}

// 3. Manejo de Eventos del Cliente MQTT

// Evento 'connect': Se dispara cuando el cliente MQTT se conecta exitosamente al broker.
mqttClient.on('connect', () => {
    console.log('[INFO] Conectado al broker MQTT.');
    loadAndSubscribeSensorTopics(); // Cargar y suscribir a los topics iniciales.

    // Configurar un listener de tiempo real de Supabase para detectar cambios en la tabla 'sensors'.
    const sensorsChannel = supabase.channel('sensors_changes');
    sensorsChannel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensors' }, payload => {
            console.log('[DEBUG] Nuevo sensor insertado (Supabase realtime), recargando topics...');
            loadAndSubscribeSensorTopics();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sensors' }, payload => {
            console.log(`[DEBUG] Sensor eliminado (Supabase realtime): ${payload.old.id}. Desuscribiendo del topic: ${payload.old.mqtt_topic}`);
            if (payload.old.mqtt_topic && subscribedTopics.has(payload.old.mqtt_topic)) {
                mqttClient.unsubscribe(payload.old.mqtt_topic);
                subscribedTopics.delete(payload.old.mqtt_topic);
                console.log(`[INFO] Desuscrito del topic: ${payload.old.mqtt_topic}`);
            }
        })
        .subscribe();
    console.log('[DEBUG] Suscrito a cambios en tiempo real en la tabla de sensores.');
});

// Evento 'message': Se dispara cuando se recibe un mensaje MQTT en un topic suscrito.
mqttClient.on('message', async (topic, message) => {
    console.log(`[MESSAGE RECEIVED] Mensaje recibido en topic ${topic}: ${message.toString()}`);

    try {
        const payload = JSON.parse(message.toString());
        console.log('[DEBUG] Payload parseado:', payload);

        const measuredValue = payload.value;
        const sensorTypeFromPayload = payload.type; 

        console.log(`[DEBUG] Buscando sensor en Supabase para topic: ${topic}`);
        const { data: sensorData, error: sensorError } = await supabase
            .from('sensors')
            .select(`
                id,
                asset_id,
                type,
                assets_base (                                
                    vibration_profile_id,                    
                    assets_vibration_config (thresholds)     
                )
            `)
            .eq('mqtt_topic', topic) 
            .single();

        if (sensorError) {
            console.error(`[ERROR] Error al buscar sensor para topic ${topic}:`, sensorError.message);
            // Si el error es "Row not found", significa que no hay un sensor con ese topic.
            if (sensorError.code === 'PGRST116') { // Código para "Row not found" en PostgREST
                console.error('[ERROR] Causa: No se encontró ningún sensor con el mqtt_topic proporcionado. Asegúrate que el topic y los IDs de sensor/activo en Supabase son correctos.');
            }
            return;
        }
        if (!sensorData) {
            console.error(`[ERROR] SensorData es nulo para topic ${topic}. Puede que no exista el sensor o haya RLS.`);
            return;
        }
        console.log('[DEBUG] SensorData obtenido:', JSON.stringify(sensorData, null, 2));


        const {
            id: sensorId,
            asset_id: assetId,
            type: sensorTypeDb, 
            assets_base: {
                vibration_profile_id: assetVibrationProfileId,
                assets_vibration_config: assetVibrationConfig 
            }
        } = sensorData;

        console.log(`[DEBUG] Extrayendo profileThresholds de assets_vibration_config: ${JSON.stringify(assetVibrationConfig)}`);
        const profileThresholds = assetVibrationConfig ? assetVibrationConfig.thresholds : null;
        console.log('[DEBUG] profileThresholds final:', profileThresholds);


        let rawReadingId = null;
        console.log(`[DEBUG] Validando valores para guardar lectura cruda. Value: ${measuredValue}, Type (payload): ${sensorTypeFromPayload}, Type (DB): ${sensorTypeDb}`);
        if (typeof measuredValue === 'number' && (sensorTypeFromPayload === 'vibration' || sensorTypeDb === 'vibration')) {
            console.log('[DEBUG] Guardando lectura cruda en sensor_readings...');
            const { data: rawReading, error: rawError } = await supabase
                .from('sensor_readings') 
                .insert({
                    sensor_id: sensorId,
                    value: measuredValue,
                    unit: payload.unit || null, 
                    timestamp: payload.timestamp || new Date().toISOString(), 
                    created_at: new Date().toISOString()
                })
                .select('id') 
                .single();

            if (rawError) {
                console.error('[ERROR] Error al guardar la lectura cruda:', rawError.message);
            } else {
                rawReadingId = rawReading.id;
                console.log(`[INFO] Lectura cruda guardada con ID: ${rawReadingId}`);
            }
        } else {
            console.log('[INFO] No se guarda lectura cruda: valor no numérico o tipo no es vibración.');
        }

        console.log(`[DEBUG] Iniciando análisis. Measured Value: ${measuredValue}, Profile Thresholds: ${JSON.stringify(profileThresholds)}`);
        if ((sensorTypeFromPayload === 'vibration' || sensorTypeDb === 'vibration') && typeof measuredValue === 'number') {
            const isoStatus = analyzeISO10816(measuredValue);
            const profileStatus = analyzeVibrationProfile(measuredValue, profileThresholds);
            const finalStatus = determineFinalStatus(isoStatus, profileStatus);

            console.log(`[ANALYSIS RESULT] Análisis para sensor ${sensorId} (Activo ${assetId}): Valor=${measuredValue}, Estado ISO=${isoStatus}, Estado Perfil=${profileStatus}, Estado Final=${finalStatus}`);

            console.log('[DEBUG] Guardando resultado del análisis en analysis_results...');
            const { error: insertError } = await supabase
                .from('analysis_results')
                .insert({
                    sensor_id: sensorId,
                    asset_id: assetId,
                    measured_value: measuredValue,
                    iso_status: isoStatus,
                    profile_status: profileStatus,
                    final_status: finalStatus,
                    analysis_timestamp: new Date().toISOString(),
                    raw_reading_id: rawReadingId 
                });

            if (insertError) {
                console.error('[ERROR] Error al guardar el resultado del análisis:', insertError.message);
                // Si el error es de RLS, PostgREST puede dar un código específico (ej. "400" o "PGRST")
                if (insertError.code) { // Verifica si hay un código de error de Supabase/PostgREST
                    console.error(`[ERROR] Posiblemente un error de RLS o Constraint. Código: ${insertError.code}`);
                }
            } else {
                console.log('[INFO] Resultado del análisis guardado exitosamente.');
            }

        } else {
            console.log(`[INFO] Mensaje del sensor ${sensorId} (tipo: ${sensorTypeFromPayload || sensorTypeDb}) no es de vibración o valor inválido. Ignorando análisis.`);
        }

    } catch (e) {
        console.error('[CRITICAL ERROR] Error al parsear o procesar mensaje MQTT:', e.message);
        console.error('[CRITICAL ERROR] Stack Trace:', e.stack); // Muestra el stack trace completo del error.
    }
});

// Evento 'error': Se dispara si hay un error en el cliente MQTT.
mqttClient.on('error', (err) => {
    console.error('[ERROR] Error en el cliente MQTT:', err.message);
});

// Evento 'close': Se dispara cuando la conexión MQTT se cierra.
mqttClient.on('close', () => {
    console.log('[INFO] Conexión MQTT cerrada.');
});

// --- Funciones de Lógica de Negocio para el Análisis de Vibración ---

/**
 * analyzeISO10816: Analiza un valor de vibración basándose en una interpretación simplificada de la norma ISO 10816.
 * @param {number} value - El valor de vibración medido (ej. en mm/s RMS).
 * @returns {string} El estado de la vibración ('Normal', 'Alerta', 'Precaucion', 'Peligro').
 */
function analyzeISO10816(value) {
    if (value <= 2.3) return 'Normal';     
    if (value <= 4.5) return 'Alerta';     
    if (value <= 9.0) return 'Precaucion'; 
    return 'Peligro';                      
}

/**
 * analyzeVibrationProfile: Analiza un valor de vibración contra un perfil personalizado definido para un activo.
 * @param {number} value - El valor de vibración medido.
 * @param {object | null} profileThresholds - El objeto JSONB 'thresholds' de la tabla 'assets_vibration_config'.
 * @returns {string} El estado de la vibración ('Normal', 'Alerta', 'Peligro', 'No Definido').
 */
function analyzeVibrationProfile(value, profileThresholds) {
    if (!profileThresholds || Object.keys(profileThresholds).length === 0) {
        console.warn('[WARNING] Perfil de vibración no definido o vacío para análisis personalizado.');
        return 'No Definido';
    }

    // ¡CORRECCIÓN AQUÍ! Cambiado de 'alerta_max' a 'alarm_level'
    const { normal_max, alarm_level, critical_level } = profileThresholds;

    if (typeof normal_max !== 'number' || typeof alarm_level !== 'number') { // ¡Ajustado aquí también!
        console.warn('[WARNING] Perfil de vibración incompleto o inválido: faltan normal_max o alarm_level', profileThresholds); // Mensaje de advertencia ajustado
        return 'No Definido'; 
    }

    if (value <= normal_max) return 'Normal';
    if (value <= alarm_level) return 'Alerta'; // ¡Usando alarm_level!
    if (typeof critical_level === 'number' && value > critical_level) return 'Peligro';
    return 'Precaucion'; 
}

/**
 * determineFinalStatus: Consolida los estados obtenidos del análisis ISO y del perfil personalizado.
 * @param {string} isoStatus - El estado de vibración según ISO 10816.
 * @param {string} profileStatus - El estado de vibración según el perfil del activo.
 * @returns {string} El estado final más crítico.
 */
function determineFinalStatus(isoStatus, profileStatus) {
    const statusPriority = {
        'Normal': 1,
        'Alerta': 2,
        'Precaucion': 3,
        'Peligro': 4,
        'No Definido': 0 
    };

    const isoP = statusPriority[isoStatus] || 0;     
    const profileP = statusPriority[profileStatus] || 0; 

    if (isoP >= profileP) {
        return isoStatus;
    } else {
        return profileStatus;
    }
}
