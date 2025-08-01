// Descripción: Este servicio se conecta a un broker MQTT, escucha los mensajes de los sensores
// los procesa, genera análisis, los guarda o actualiza en la base de datos y gestiona las alertas.

require('dotenv').config();
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
const { get } = require('lodash');

// --- 1. Configuración y Conexión a Servicios ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://direct.miobox.io';

// --- CONSTANTES DE CONFIGURACIÓN ---
const SPIKE_THRESHOLD_MULTIPLIER = 5;
const SPIKE_MIN_ABSOLUTE_VALUE = 20.0;
const CONNECTIVITY_TIMEOUT_MINUTES = 15;
const CONNECTIVITY_CHECK_INTERVAL_MINUTES = 5;
const LOW_BATTERY_THRESHOLD_VOLT = 3.2;

// const mqttTopics = ['Advantech/#'];

const mqttTopics = ['Advantech/FF907C3C'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Faltan las variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const mqttClient = mqtt.connect(mqttBrokerUrl);

// --- 2. Lógica del Cliente MQTT ---
mqttClient.on('connect', () => {
    console.log(`Conectado exitosamente al broker MQTT en ${mqttBrokerUrl}`);
    mqttClient.subscribe(mqttTopics, (err) => {
        if (!err) {
            console.log(`Suscripción exitosa a los tópicos: ${mqttTopics.join(', ')}`);
        } else {
            console.error('Error al intentar suscribirse:', err);
        }
    });
   
    console.log(`Iniciando chequeo de conectividad de sensores cada ${CONNECTIVITY_CHECK_INTERVAL_MINUTES} minutos.`);
    setInterval(checkSensorConnectivity, CONNECTIVITY_CHECK_INTERVAL_MINUTES * 60 * 1000);
});

mqttClient.on('message', async (topic, message) => {
    console.log(`\n--- Mensaje recibido en el tópico: ${topic} ---`);
    try {
        const topicParts = topic.split('/');        
        const sensorCode = topicParts[1]; 

        if (!sensorCode) {
            console.warn(`Tópico no sigue un formato esperado (Advantech/SENSOR_CODE): ${topic}`);
            return;
        }

        const { data: logicalSensors, error: sensorError } = await supabase
            .from('sensors')
            .select(`
                id, type, code, name, status, organization_id, asset_id, thresholds,
                firmware:sensor_firmwares ( sensor_types, structure )
            `)
            .eq('code', sensorCode);

        if (sensorError) throw new Error(`Error al buscar sensores: ${sensorError.message}`);
        if (!logicalSensors || logicalSensors.length === 0) {
            console.log(`No se encontraron sensores registrados con el código '${sensorCode}'. Se ignora el mensaje.`);
            return;
        }
        
        const payload = JSON.parse(message.toString());

        for (const sensor of logicalSensors) {
            
            if (['inactive', 'maintenance'].includes(sensor.status)) {
                console.log(`[DATA IGNORED] Se recibió un mensaje para el sensor '${sensor.name}' pero su estado es '${sensor.status}'. Los datos serán ignorados.`);
                continue;
            }

            // CORRECCIÓN: Manejo de la recuperación de conexión
            if (sensor.status === 'error') {
                console.log(`[STATUS CHANGE] El sensor '${sensor.name}' estaba en estado 'error' y ha vuelto a enviar datos. Se actualizará a 'active'.`);
                await supabase.from('sensors').update({ status: 'active' }).eq('id', sensor.id);
                // Resuelve la alerta de conectividad si existía
                await resolveConnectivityAlert(sensor);
                 // Opcional: Crear una alerta de cambio de estado para notificar la recuperación
                await manageStatusChangeAlert(sensor, 'active');
            }

            console.log(`\nProcesando para el sensor lógico: '${sensor.name}' (ID: ${sensor.id}, Tipo: ${sensor.type})`);

            if (!sensor.firmware || !sensor.firmware.structure) {
                console.warn(`El sensor lógico '${sensor.name}' no tiene una estructura de firmware válida. Saltando.`);
                continue;
            }
            
            const { readings, deviceStatus } = parsePayload(sensor.id, sensor.type, payload, sensor.firmware);
            
            if (deviceStatus) {
                await processDeviceStatus(sensor, deviceStatus);
            }

            if (readings.length > 0) {
                for (const reading of readings) {
                    await saveReading(reading);
                }
                await processAndAnalyzeReadings(sensor, readings);
            }
        }

    } catch (e) {
        console.error(`Error procesando el mensaje del tópico ${topic}:`, e.message);
    }
});

mqttClient.on('error', (error) => console.error('Error en la conexión con el cliente MQTT:', error));


// --- 3. Suscripción a Cambios de Estado en la Base de Datos ---

function subscribeToSensorStatusChanges() {
    console.log("Iniciando suscripción a cambios de estado de sensores en la base de datos.");
    
    const channel = supabase.channel('sensor-status-changes');

    channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sensors'
    }, async (payload) => {
        if (!payload.old || typeof payload.old.status === 'undefined') {
            console.warn(`[DB CHANGE] No se pudo determinar el estado anterior del sensor. Asegúrese de que la tabla 'sensors' tenga REPLICA IDENTITY FULL.`);
            return;
        }

        const oldStatus = payload.old.status;
        const newStatus = payload.new.status;

        if (oldStatus !== newStatus) {
            console.log(`[DB CHANGE] Cambio de estado detectado para el sensor '${payload.new.name}' (ID: ${payload.new.id}). De '${oldStatus}' a '${newStatus}'.`);
            
            // Lógica unificada para crear y resolver alertas
            if (newStatus === 'error') {
                // Alerta de conectividad cuando el estado pasa a 'error'
                let alertTitle = `Alerta de Conectividad: Pérdida de Conexión con '${payload.new.name}'`;
                let alertMessage = `El sensor '${payload.new.name}' ha perdido la conexión. No se han recibido datos en los últimos ${CONNECTIVITY_TIMEOUT_MINUTES} minutos.`;

                const { data: existingAlert } = await supabase.from('alerts').select('id').eq('sensor_id', payload.new.id).eq('type', 'connectivity').eq('status', 'active').maybeSingle();
                
                if (!existingAlert) {
                    await supabase.from('alerts').insert({
                        organization_id: payload.new.organization_id,
                        sensor_id: payload.new.id,
                        asset_id: payload.new.asset_id,
                        type: 'connectivity',
                        title: alertTitle,
                        description: alertMessage,
                        priority: 'high',
                        status: 'active',
                        alert_time: new Date().toISOString()
                    });
                    console.log(`[ALERTS] Creada nueva alerta de 'connectivity' para el sensor '${payload.new.name}'.`);
                }
            } else if (newStatus === 'active') {
                // Lógica de resolución de alertas cuando el sensor vuelve a estar activo
                console.log(`[ALERTS] Resolviendo alertas de conectividad y estado para el sensor '${payload.new.name}' porque volvió a estar activo.`);
                await supabase.from('alerts')
                    .update({ status: 'resolved', resolved_time: new Date().toISOString() })
                    .eq('sensor_id', payload.new.id)
                    .in('type', ['connectivity', 'status_change'])
                    .eq('status', 'active');
            } else if (['inactive', 'maintenance'].includes(newStatus)) {
                // Lógica para otros cambios de estado
                let priority = (newStatus === 'inactive') ? 'medium' : 'low';
                let alertTitle = `Alerta de Estado: Sensor '${payload.new.name}' ahora está '${newStatus}'`;
                let alertMessage = `El estado del sensor '${payload.new.name}' fue actualizado de '${oldStatus}' a '${newStatus}'.`;
                
                const { data: existingAlert } = await supabase.from('alerts').select('id').eq('sensor_id', payload.new.id).eq('type', 'status_change').eq('status', 'active').maybeSingle();
                
                if (!existingAlert) {
                    await supabase.from('alerts').insert({
                        organization_id: payload.new.organization_id,
                        sensor_id: payload.new.id,
                        asset_id: payload.new.asset_id,
                        type: 'status_change',
                        title: alertTitle,
                        description: alertMessage,
                        priority: priority,
                        status: 'active',
                        alert_time: new Date().toISOString()
                    });
                     console.log(`[ALERTS] Creada nueva alerta de 'status_change' para el sensor '${payload.new.name}'.`);
                }
            }
        }
    }).subscribe((status, err) => {
        if (err) {
            console.error("Error en la suscripción a cambios de estado:", err);
        } else {
            console.log("Suscripción a cambios de estado de sensores establecida correctamente. Estado:", status);
        }
    });

    return channel;
}

subscribeToSensorStatusChanges();


// --- 4. Funciones de Parseo y Almacenamiento ---

function parsePayload(sensorId, sensorType, payload, firmware) {
    const readings = [];
    const timestampSource = get(payload, 'Accelerometer.Time') || get(payload, 'Device.Time') || Date.now() / 1000;
    const dateTimestamp = new Date(timestampSource * 1000).toISOString();
    const deviceStatus = {
        batteryVolt: get(payload, 'Device.BatteryVolt'),
        powerSrc: get(payload, 'Device.PowerSrc')
    };
    if (firmware.sensor_types.includes(sensorType)) {
        const config = firmware.structure[sensorType];
        if (config && config.dataPath) {
            const dataBasePath = get(payload, config.dataPath);
            if (dataBasePath !== undefined) {
                if (sensorType === 'temperature' && config.camposEsperados) {
                    const rawValue = get(dataBasePath, config.camposEsperados[0]);
                    if (rawValue !== undefined) {
                        readings.push({
                            type: 'temperature',
                            data: { sensor_id: sensorId, value: rawValue / 1000.0, timestamp: dateTimestamp }
                        });
                    }
                } else if (sensorType === 'vibration') {
                    ['X-Axis', 'Y-Axis', 'Z-Axis'].forEach(axisKey => {
                        const axisData = dataBasePath[axisKey];
                        if (axisData && axisData.OAVelocity !== undefined) {
                            readings.push({
                                type: 'vibration',
                                axis: axisKey.charAt(0),
                                data: {
                                    sensor_id: sensorId, axis: axisKey.charAt(0),
                                    oavelocity: axisData.OAVelocity, peak: axisData.Peak, rms: axisData.RMS,
                                    kurtosis: axisData.Kurtosis, crestfactor: axisData.CrestFactor,
                                    skewness: axisData.Skewness, deviation: axisData.Deviation,
                                    peak_to_peak_displacement: axisData['Peak-to-Peak Displacement'],
                                    timestamp: dateTimestamp
                                }
                            });
                        }
                    });
                }
            }
        }
    }
    return { readings, deviceStatus };
}

async function saveReading(reading) {
    const tableName = `${reading.type}_readings`;
    await supabase.from(tableName).insert(reading.data);
}

async function updateSensorLastReading(sensorId, batteryLevel, lastValue, lastUnit) {
    const payloadToUpdate = {
        last_reading_timestamp: new Date().toISOString(),
        last_value: lastValue,
        last_unit: lastUnit,
        battery_level: batteryLevel
    };
    await supabase.from('sensors').update(payloadToUpdate).eq('id', sensorId);
}

// --- 5. Lógica de Análisis y Alertas ---

// FUNCIÓN INTEGRADA: Guarda o actualiza el resultado del análisis
async function saveOrUpdateAnalysisResult(analysisData) {
    const { data: existingRecord, error: findError } = await supabase
        .from('analysis_results')
        .select('id')
        .eq('sensor_id', analysisData.sensor_id)
        .single();

    if (findError && findError.code !== 'PGRST116') {
        console.error(`[ANALYSIS_FIND] Error buscando análisis existente para sensor ${analysisData.sensor_id}:`, findError.message);
        return;
    }

    const dataToSave = {
        ...analysisData,
        analysis_timestamp: new Date().toISOString()
    };

    if (existingRecord) {
        const { error: updateError } = await supabase
            .from('analysis_results')
            .update(dataToSave)
            .eq('id', existingRecord.id);
        
        if (updateError) {
            console.error(`[ANALYSIS_UPDATE] Error al actualizar resultado para sensor ${analysisData.sensor_id}:`, updateError.message);
        } else {
            console.log(`[ANALYSIS_UPDATE] Resultado de análisis actualizado para sensor ${analysisData.sensor_id}. Estado: ${analysisData.final_status}`);
        }
    } else {
        const { error: insertError } = await supabase
            .from('analysis_results')
            .insert(dataToSave);

        if (insertError) {
            console.error(`[ANALYSIS_INSERT] Error al insertar resultado para sensor ${analysisData.sensor_id}:`, insertError.message);
        } else {
            console.log(`[ANALYSIS_INSERT] Resultado de análisis insertado para sensor ${analysisData.sensor_id}. Estado: ${analysisData.final_status}`);
        }
    }
}

// FUNCIÓN INTEGRADA: Analiza la vibración según la norma ISO 10816
function analyzeISO10816(v){if(typeof v!=='number')return 'N/A';if(v<=2.3)return 'Normal';if(v<=4.5)return 'Alerta';if(v<=9.0)return 'Precaucion';return 'Peligro';}

// FUNCIÓN INTEGRADA: Analiza la vibración según un perfil personalizado
function analyzeVibrationProfile(v, ranges){
    if (!ranges || ranges.length === 0 || v === null) return 'No Definido';
    const sortedRanges = [...ranges].sort((a, b) => a.max_value - b.max_value);
    for (const range of sortedRanges) {
        if (v >= range.min_value && v <= range.max_value) {
            return `${range.condition_name} (Zona ${range.severity})`;
        }
    }
    const lastRange = sortedRanges[sortedRanges.length - 1];
    if (v > lastRange.max_value) {
        return `${lastRange.condition_name} (Zona ${lastRange.severity})`;
    }
    return 'Indeterminado';
}

// FUNCIÓN INTEGRADA: Analiza umbrales generales (ej. para temperatura)
function analyzeGeneralThresholds(v,t){if(!t||Object.keys(t).length===0)return 'No Definido';const{normalMin,normalMax,criticalMin,criticalMax}=t;if([normalMin,normalMax,criticalMin,criticalMax].some(val=>typeof val!=='number'))return 'Perfil Incompleto';if(v<criticalMin||v>criticalMax)return 'Crítico';if((v>=criticalMin&&v<normalMin)||(v>normalMax&&v<=criticalMax))return 'Advertencia';return 'Normal';}

// FUNCIÓN INTEGRADA: Determina el estado final basándose en perfiles y normas
function determineFinalStatus(profileStatus, isoStatus) {
    const validProfileStatus = profileStatus && profileStatus !== 'No Definido' && profileStatus !== 'Perfil Incompleto';
    if (validProfileStatus) {
        return profileStatus;
    }
    return isoStatus;
}


async function getVibrationProfileForAsset(assetId) {
    if (!assetId) return null;
    try {
        const { data: assetData, error: assetError } = await supabase
            .from('assets_base')
            .select(`
                iso_group_id, 
                custom_vibration_profile_id, 
                rigidity_type_id, 
                iso_group:iso_groups!assets_base_iso_group_id_fkey(name), 
                custom_profile:custom_vibration_profiles!assets_base_custom_vibration_profile_id_fkey(name)
            `)
            .eq('id', assetId)
            .single();
        if (assetError) throw assetError;
        let ranges = [];
        let profileInfo = { name: 'Perfil Desconocido', description: '', ranges: [] };
        const severityDescriptions = { 'A': 'Buena', 'B': 'Satisfactoria', 'C': 'Insatisfactoria', 'D': 'Inaceptable' };
        if (assetData.custom_vibration_profile_id) {
            profileInfo.name = assetData.custom_profile?.name || 'Perfil Personalizado';
            const { data: customRanges, error } = await supabase.from('custom_vibration_ranges').select('*').eq('custom_profile_id', assetData.custom_vibration_profile_id);
            if (error) throw error;
            ranges = customRanges;
        } else if (assetData.iso_group_id && assetData.rigidity_type_id) {
            profileInfo.name = assetData.iso_group?.name || 'Estándar ISO';
            const { data: isoRanges, error } = await supabase.from('vibration_ranges').select('*').eq('iso_groups_id', assetData.iso_group_id).eq('rigidity_id', assetData.rigidity_type_id);
            if (error) throw error;
            ranges = isoRanges.map(r => ({...r, condition_name: severityDescriptions[r.severity] || 'Desconocido' }));
        } else {
            return null;
        }
        profileInfo.ranges = ranges;
        return profileInfo;
    } catch (e) {
        console.error(`[VIBRATION PROFILE] Error obteniendo perfil para asset ${assetId}:`, e.message);
        return null;
    }
}

async function processDeviceStatus(sensor, deviceStatus) {
    if (deviceStatus.batteryVolt !== undefined) {
        await supabase.from('sensors').update({ battery_level: deviceStatus.batteryVolt }).eq('id', sensor.id);
        if (deviceStatus.batteryVolt < LOW_BATTERY_THRESHOLD_VOLT) {
            await manageAlerts(sensor, { value: deviceStatus.batteryVolt, unit: 'V' }, 'low_battery');
        } else {
            // Si la batería está OK, resuelve las alertas para todos los sensores del mismo dispositivo físico
            const { data: sensorsWithSameCode } = await supabase.from('sensors').select('id').eq('code', sensor.code);
            if (sensorsWithSameCode) {
                const sensorIds = sensorsWithSameCode.map(s => s.id);
                await resolveBatteryAlert(sensorIds);
            }
        }
    }
}

async function processAndAnalyzeReadings(sensor, readings) {
    let readingForAlert = {};
    let lastValueStr = 'N/A';
    let lastUnitStr = '';
    
    // Obtenemos el perfil de vibración completo para el análisis
    let vibrationProfile = null;
    if (sensor.type === 'vibration' && sensor.asset_id) {
        vibrationProfile = await getVibrationProfileForAsset(sensor.asset_id);
    }

    if (sensor.type === 'vibration') {
        const maxVibrationValue = Math.max(...readings.map(r => r.data.oavelocity || 0));
        const isSpike = await checkForSpikeAndAlert(sensor, maxVibrationValue);
        if (isSpike) {
            return;
        }

        const profileStatus = analyzeVibrationProfile(maxVibrationValue, vibrationProfile?.ranges || []);
        const isoStatus = analyzeISO10816(maxVibrationValue);
        const finalStatus = determineFinalStatus(profileStatus, isoStatus);
        
        const axesValues = readings.reduce((acc, r) => ({ ...acc, [r.axis.toLowerCase()]: (r.data.oavelocity || 0).toFixed(3) }), {});

        console.log(`[ANALYSIS] Sensor ${sensor.name} (Vibration) | Value: ${maxVibrationValue.toFixed(2)} mm/s RMS | Status: ${finalStatus}`);
        
        const analysisData = {
            sensor_id: sensor.id,
            asset_id: sensor.asset_id,
            measured_value: maxVibrationValue,
            iso_status: isoStatus,
            profile_status: profileStatus,
            final_status: finalStatus,
            axes_values: axesValues,
        };
        await saveOrUpdateAnalysisResult(analysisData);

        readingForAlert = { value: maxVibrationValue, unit: 'mm/s RMS' };
        await manageAlerts(sensor, readingForAlert, finalStatus, 'vibration');

        lastValueStr = `X:${axesValues.x || 0} Y:${axesValues.y || 0} Z:${axesValues.z || 0}`;
        lastUnitStr = 'mm/s';
    } else if (sensor.type === 'temperature') {
        const tempValue = readings[0].data.value;
        const finalStatus = analyzeGeneralThresholds(tempValue, sensor.thresholds);

        console.log(`[ANALYSIS] Sensor ${sensor.name} (Temperature) | Value: ${tempValue.toFixed(2)} °C | Status: ${finalStatus}`);

        const analysisData = {
            sensor_id: sensor.id,
            asset_id: sensor.asset_id,
            measured_value: tempValue,
            final_status: finalStatus,
        };
        await saveOrUpdateAnalysisResult(analysisData);
        
        readingForAlert = { value: tempValue, unit: '°C' };
        await manageAlerts(sensor, readingForAlert, finalStatus, 'temperature');

        lastValueStr = tempValue.toFixed(2);
        lastUnitStr = '°C';
    }

    const { data: deviceStatus } = await supabase.from('sensors').select('battery_level').eq('id', sensor.id).single();
    await updateSensorLastReading(sensor.id, deviceStatus?.battery_level, lastValueStr, lastUnitStr);
}

async function manageAlerts(sensor, reading, finalStatus, sensorType) {
    let alertDetected = false;
    let alertPriority = 'low';
    let alertTitle = '';
    let alertMessage = '';
    let alertTypeForDB = sensorType;
    const statusBase = (typeof finalStatus === 'string' && finalStatus.includes(' (')) ? finalStatus.split(' (')[0] : finalStatus;
    const isNormal = ['Normal', 'Satisfactoria', 'No Definido', 'Perfil Incompleto', 'N/A'].includes(statusBase);
    
    // Helper function to get a numerical priority value
    const getPriorityValue = (p) => {
        const priorityMap = { low: 1, medium: 2, high: 3 };
        return priorityMap[p] || 0;
    };
    // Helper function to get a numerical severity value for vibration zones
    const getSeverityValue = (s) => {
        const severityMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
        return severityMap[s] || 0;
    };
    
    if (finalStatus === 'data_issue') {
        alertDetected = true;
        alertPriority = 'medium';
        alertTypeForDB = 'data_issue';
        alertTitle = `Lectura Anómala en ${sensor.name}`;
        alertMessage = `Se detectó un pico de datos anómalo en el sensor ${sensor.name}. Valor registrado: ${reading.value.toFixed(2)} ${reading.unit}. Esta lectura ha sido ignorada para el análisis, pero se recomienda revisar el sensor.`;
    } else if (!isNormal) {
        alertDetected = true;
        
        if (sensorType === 'vibration') {
            const statusParts = finalStatus.match(/(.*) \(Zona ([A-D])\)/);
            if (statusParts) {
                const conditionName = statusParts[1];
                const severity = statusParts[2];
                switch (severity) {
                    case 'A':
                    case 'B':
                        // En estos casos, no se debería generar una alerta si no es un perfil personalizado con umbrales específicos
                        alertDetected = false;
                        break;
                    case 'C':
                        alertPriority = 'medium';
                        alertTitle = `Alerta de Vibración: Vibración en Zona C (Insatisfactoria)`;
                        alertMessage = `El sensor '${sensor.name}' reporta ${reading.value.toFixed(2)} ${reading.unit}. Condición no apta para operación continua.`;
                        break;
                    case 'D':
                        alertPriority = 'high';
                        alertTitle = `Alerta de Vibracion: Vibración en Zona D (Inaceptable)`;
                        alertMessage = `¡Peligro de Daño! El sensor '${sensor.name}' reporta ${reading.value.toFixed(2)} ${reading.unit}.`;
                        break;
                }
            } else {
                // Lógica para ISO 10816
                 switch (statusBase) {
                    case 'Alerta':
                        alertPriority = 'medium';
                        alertTitle = `Vibración en Alerta`;
                        alertMessage = `El sensor '${sensor.name}' ha entrado en estado de Alerta con un valor de ${reading.value.toFixed(2)} ${reading.unit}.`;
                        break;
                    case 'Precaucion':
                        alertPriority = 'high';
                        alertTitle = `Vibración en Precaución`;
                        alertMessage = `¡Atención! El sensor '${sensor.name}' ha entrado en estado de Precaución con un valor de ${reading.value.toFixed(2)} ${reading.unit}.`;
                        break;
                    case 'Peligro':
                        alertPriority = 'high';
                        alertTitle = `Vibración en Peligro`;
                        alertMessage = `¡Peligro de Daño! El sensor '${sensor.name}' ha entrado en estado de Peligro con un valor de ${reading.value.toFixed(2)} ${reading.unit}.`;
                        break;
                    default:
                        alertDetected = false;
                        break;
                 }
            }

        } else if (sensorType === 'temperature') {
            const tempValue = reading.value;
            const thresholds = sensor.thresholds || {};
            if (tempValue > thresholds.criticalMax || tempValue < thresholds.criticalMin) {
                alertPriority = 'high';
                const direction = tempValue > thresholds.criticalMax ? 'Alta' : 'Baja';
                alertTitle = `Alerta de Temperatura: Nivel Crítico (${direction})`;
                const limit = tempValue > thresholds.criticalMax ? thresholds.criticalMax : thresholds.criticalMin;
                alertMessage = `¡Riesgo Crítico! El sensor '${sensor.name}' registra ${tempValue.toFixed(2)}°C, superando el umbral crítico de ${limit}°C.`;
            } else if ((tempValue > thresholds.normalMax && tempValue <= thresholds.criticalMax) || (tempValue < thresholds.normalMin && tempValue >= thresholds.criticalMin)) {
                alertPriority = 'medium';
                const direction = tempValue > thresholds.normalMax ? 'Alta' : 'Baja';
                alertTitle = `Alerta de Temperatura: Nivel Advertencia (${direction})`;
                const limit = tempValue > thresholds.normalMax ? thresholds.normalMax : thresholds.normalMin;
                alertMessage = `Advertencia: El sensor '${sensor.name}' registra ${tempValue.toFixed(2)}°C, fuera del rango normal (Límite: ${limit}°C).`;
            } else {
                alertDetected = false;
            }
        } else if (sensorType === 'low_battery') {
            alertDetected = true;
            alertPriority = 'high';
            alertTypeForDB = 'battery';
            alertTitle = `Alerta de Dispositivo: Batería Baja`;
            alertMessage = `El nivel de batería del sensor '${sensor.name}' es de ${reading.value.toFixed(2)} V.`;
        }
    }

    if (alertDetected) {
        const { data: existingAlertForUpdate } = await supabase.from('alerts')
            .select('id, status, priority')
            .eq('sensor_id', sensor.id)
            .eq('type', alertTypeForDB)
            .eq('status', 'active')
            .maybeSingle();

        const currentPriorityValue = existingAlertForUpdate ? getPriorityValue(existingAlertForUpdate.priority) : 0;
        const newPriorityValue = getPriorityValue(alertPriority);
        
        if (existingAlertForUpdate) {
            console.log(`[ALERTS] Condición de alerta de '${alertTypeForDB}' persiste para sensor ${sensor.name}.`);
            
            if (newPriorityValue >= currentPriorityValue) {
                console.log(`[ALERTS] Actualizando prioridad de alerta de '${alertTypeForDB}' para sensor ${sensor.name} de ${existingAlertForUpdate.priority} a ${alertPriority}.`);
                 await supabase.from('alerts').update({
                    title: alertTitle,
                    description: alertMessage,
                    priority: alertPriority, 
                    value_at_alert: reading.value,
                    updated_at: new Date().toISOString(),
                }).eq('id', existingAlertForUpdate.id);
            } else {
                console.log(`[ALERTS] Nueva prioridad (${alertPriority}) es menor que la actual (${existingAlertForUpdate.priority}). No se actualizará la alerta para evitar spam.`);
            }
        } else {
            console.log(`[ALERTS] Creando nueva alerta de '${alertTypeForDB}' para sensor ${sensor.name}`);
            const { error } = await supabase.from('alerts').insert({
                organization_id: sensor.organization_id, sensor_id: sensor.id, asset_id: sensor.asset_id,
                type: alertTypeForDB, title: alertTitle, description: alertMessage,
                priority: alertPriority, status: 'active', value_at_alert: reading.value,
                alert_time: new Date().toISOString()
            });
            if (error) console.error(`[ALERTS] ERROR al crear alerta:`, error.message);
        }
    } else {
        await supabase.from('alerts').update({ 
            status: 'resolved', 
            resolved_time: new Date().toISOString() 
        })
        .eq('sensor_id', sensor.id)
        .eq('status', 'active')
        .eq('type', alertTypeForDB);
        console.log(`[ALERTS] Resolviendo alertas de tipo '${alertTypeForDB}' para el sensor '${sensor.name}'.`);
    }
}

async function checkForSpikeAndAlert(sensor, newValue) {
    const { data: lastAnalysis, error: lastReadingError } = await supabase
        .from('analysis_results')
        .select('measured_value')
        .eq('sensor_id', sensor.id)
        .order('analysis_timestamp', { ascending: false })
        .limit(1)
        .single();
    if (lastReadingError && lastReadingError.code !== 'PGRST116') return false;
    if (!lastAnalysis) return false;
    const lastValue = lastAnalysis.measured_value;
    const isSpike = newValue > SPIKE_MIN_ABSOLUTE_VALUE && lastValue > 0 && (newValue / lastValue) > SPIKE_THRESHOLD_MULTIPLIER;
    if (isSpike) {
        await manageAlerts(sensor, { value: newValue, unit: 'mm/s' }, 'data_issue', { lastValue });
        return true;
    }
    return false;
}

// Lógica de monitoreo de conectividad. Esta es una función genérica que puede ser llamada
// para resolver alertas de conectividad. La creación de la alerta se maneja en el watcher.
async function manageConnectivityAlert(sensor, alertDetected) {
  if (alertDetected) {
    const { data: existingAlert } = await supabase
        .from('alerts')
        .select('id')
        .eq('sensor_id', sensor.id)
        .eq('type', 'connectivity')
        .eq('status', 'active')
        .maybeSingle();
    
    if (!existingAlert) {
      const alertTitle = `Pérdida de Conexión con Sensor`;
      const alertMessage = `No se han recibido datos del sensor '${sensor.name}' en los últimos ${CONNECTIVITY_TIMEOUT_MINUTES} minutos.`;
      const { error } = await supabase.from('alerts').insert({
        organization_id: sensor.organization_id,
        sensor_id: sensor.id,
        asset_id: sensor.asset_id,
        type: 'connectivity',
        title: alertTitle,
        description: alertMessage,
        priority: 'high',
        status: 'active',
        alert_time: new Date().toISOString()
      });
      if (!error) {
        console.warn(`[CONNECTIVITY ALERT] ¡Pérdida de conexión detectada para el sensor ${sensor.name}!`);
      } else {
        console.error(`[CONNECTIVITY ALERT] Error al crear alerta de conectividad para el sensor ${sensor.name}:`, error.message);
      }
    }
  } else {
    // Si la conexión se restablece, se resuelve la alerta.
    await resolveConnectivityAlert(sensor);
  }
}

// CORRECCIÓN: Esta función ahora se ha unificado dentro de subscribeToSensorStatusChanges
async function resolveConnectivityAlert(sensor) {
    const { error } = await supabase
        .from('alerts')
        .update({ status: 'resolved', resolved_time: new Date().toISOString() })
        .eq('sensor_id', sensor.id)
        .eq('type', 'connectivity')
        .eq('status', 'active');
    if (!error) {
        console.log(`[CONNECTIVITY RESOLVE] Alerta de conectividad resuelta para el sensor ${sensor.name}.`);
    } else {
        console.error(`[CONNECTIVITY RESOLVE] Error al resolver alerta de conectividad para el sensor ${sensor.name}:`, error.message);
    }
}

// Nueva función para manejar las alertas de cambio de estado
async function manageStatusChangeAlert(sensor, newStatus) {
    // La alerta de cambio de estado se creará o resolverá en el watcher de la DB.
    // Esto es solo para la lógica que viene del MQTT.
    if (newStatus === 'active') {
        const { error } = await supabase.from('alerts')
            .update({ status: 'resolved', resolved_time: new Date().toISOString() })
            .eq('sensor_id', sensor.id)
            .eq('type', 'status_change')
            .eq('status', 'active');
        if (!error) {
            console.log(`[ALERTS] Alerta de cambio de estado resuelta para el sensor '${sensor.name}' (volvió a estar activo).`);
        }
    }
}

// FUNCIÓN CORREGIDA: Se eliminó la llamada a manageConnectivityAlert y se dejó solo la actualización de estado.
async function checkSensorConnectivity() {
    console.log('[CONNECTIVITY CHECK] Ejecutando chequeo de conectividad...');
    const { data: activeSensors, error } = await supabase.from('sensors').select('id, name, status, last_reading_timestamp, organization_id, asset_id').eq('status', 'active');
    
    if (error) { 
        console.error('[CONNECTIVITY CHECK] Error al obtener sensores activos:', error.message); 
        return; 
    }

    const now = new Date();
    const timeout = CONNECTIVITY_TIMEOUT_MINUTES * 60 * 1000;

    for (const sensor of activeSensors) {
        const lastReadingTime = sensor.last_reading_timestamp ? new Date(sensor.last_reading_timestamp) : null;
        
        if (!lastReadingTime || (now - lastReadingTime > timeout)) {
            console.warn(`[CONNECTIVITY CHECK] ¡Pérdida de conexión con ${sensor.name}! Actualizando estado a 'error'.`);
            // Simplemente actualizamos el estado, el "watcher" de la DB se encargará de la alerta.
            await supabase.from('sensors').update({ status: 'error' }).eq('id', sensor.id);
        }
    }
}

async function resolveBatteryAlert(sensorIds) {
    // Acepta un array de IDs de sensor
    await supabase.from('alerts').update({ status: 'resolved', resolved_time: new Date().toISOString() }).in('sensor_id', sensorIds).eq('type', 'battery').eq('status', 'active');
}
