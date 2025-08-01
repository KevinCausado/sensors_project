// mqtt-simulator-enhanced.js
// Descripción: Este script simula un sistema de monitoreo de alta fidelidad.
// Incorpora la lógica de análisis y gestión de alertas del servicio 'basicanalysis'
// para proporcionar una simulación realista del comportamiento de los sensores y el backend.
// Simula:
// - Lecturas de sensores (Temperatura y Vibración).
// - Análisis de datos contra perfiles y umbrales de la DB.
// - Creación y resolución de alertas (Umbrales, Batería, Conectividad, Picos de datos).
// - Consumo de batería y fallos de conexión.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// --- 1. CONFIGURACIÓN Y CONEXIÓN A SERVICIOS ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Asegúrate de crear un archivo .env y definir SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- 2. CONSTANTES DE CONFIGURACIÓN (Portadas de basicanalysis) ---
const SPIKE_THRESHOLD_MULTIPLIER = 5;
const SPIKE_MIN_ABSOLUTE_VALUE = 20.0;
const CONNECTIVITY_TIMEOUT_MINUTES = 15; // OJO: Poner un valor bajo (ej. 1) para pruebas rápidas
const CONNECTIVITY_CHECK_INTERVAL_MINUTES = 5; // OJO: Poner un valor bajo (ej. 0.5) para pruebas
const LOW_BATTERY_THRESHOLD_VOLT = 3.2;
const INSERT_INTERVAL_MS = 8000; // Intervalo de inserción de datos por sensor

// --- 3. CONFIGURACIÓN DE SENSORES PARA SIMULACIÓN ---
const SENSOR_CONFIGS = [
  {
    id: '3734c997-56e8-4cea-9e73-3eb0070baf62', // Sensor de temperatura
    type: 'temperature', 
    unit: '°C',
    normalMin: 25,
    normalMax: 75,
    variation: 15.0,
    // Simulación de batería
    currentBatteryVolt: 4.2,
    batteryDrain: 0.001
  },  
  {
    id: '43199abb-54a2-4432-847f-fa8f10cfa16f', // Sensor de vibración
    type: 'vibration',
    unit: 'mm/s RMS',
    // Simulación de batería
    currentBatteryVolt: 4.1,
    batteryDrain: 0.002
  }
];

// Almacena el último valor para una simulación de temperatura más continua
const currentSensorValues = {};
SENSOR_CONFIGS.forEach(config => {
  if (config.type === 'temperature') {
    currentSensorValues[config.id] = (config.normalMin + config.normalMax) / 2;
  }
});


// =================================================================
// SECCIÓN 4: LÓGICA DE ANÁLISIS Y ALERTAS (Portado y adaptado de basicanalysis)
// =================================================================

// --- Funciones de Análisis ---

function analyzeISO10816(v){if(typeof v!=='number')return 'N/A';if(v<=2.3)return 'Normal';if(v<=4.5)return 'Alerta';if(v<=9.0)return 'Precaucion';return 'Peligro';}

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

function analyzeGeneralThresholds(v,t){if(!t||Object.keys(t).length===0)return 'No Definido';const{normalMin,normalMax,criticalMin,criticalMax}=t;if([normalMin,normalMax,criticalMin,criticalMax].some(val=>typeof val!=='number'))return 'Perfil Incompleto';if(v<criticalMin||v>criticalMax)return 'Crítico';if((v>=criticalMin&&v<normalMin)||(v>normalMax&&v<=criticalMax))return 'Advertencia';return 'Normal';}

function determineFinalStatus(profileStatus, isoStatus) {
    const validProfileStatus = profileStatus && profileStatus !== 'No Definido' && profileStatus !== 'Perfil Incompleto';
    if (validProfileStatus) {
        return profileStatus;
    }
    return isoStatus;
}

// --- Funciones de Interacción con DB ---

async function getVibrationProfileForAsset(assetId) {
    if (!assetId) return null;
    try {
        const { data: assetData, error: assetError } = await supabase
            .from('assets_base')
            .select(`iso_group_id, custom_vibration_profile_id, rigidity_type_id, iso_group:iso_groups!assets_base_iso_group_id_fkey(name), custom_profile:custom_vibration_profiles!assets_base_custom_vibration_profile_id_fkey(name)`)
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

    const dataToSave = { ...analysisData, analysis_timestamp: new Date().toISOString() };

    if (existingRecord) {
        const { error: updateError } = await supabase.from('analysis_results').update(dataToSave).eq('id', existingRecord.id);
        if (updateError) console.error(`[ANALYSIS_UPDATE] Error al actualizar resultado para sensor ${analysisData.sensor_id}:`, updateError.message);
        else console.log(`  -> Resultado de análisis actualizado. Estado: ${analysisData.final_status}`);
    } else {
        const { error: insertError } = await supabase.from('analysis_results').insert(dataToSave);
        if (insertError) console.error(`[ANALYSIS_INSERT] Error al insertar resultado para sensor ${analysisData.sensor_id}:`, insertError.message);
        else console.log(`  -> Resultado de análisis insertado. Estado: ${analysisData.final_status}`);
    }
}

// --- Lógica de Gestión de Alertas ---

async function manageAlerts(sensor, reading, finalStatus, sensorType) {
    let alertDetected = false;
    let alertPriority = 'low';
    let alertTitle = '';
    let alertMessage = '';
    let alertTypeForDB = sensorType;
    const statusBase = (typeof finalStatus === 'string' && finalStatus.includes(' (')) ? finalStatus.split(' (')[0] : finalStatus;
    const isNormal = ['Normal', 'Satisfactoria', 'Buena', 'No Definido', 'Perfil Incompleto', 'N/A'].includes(statusBase);

    const getPriorityValue = (p) => ({ low: 1, medium: 2, high: 3 }[p] || 0);
    
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
            if (statusParts) { // Lógica para Perfil Personalizado/ISO con Zonas
                const severity = statusParts[2];
                if (severity === 'C') {
                    alertPriority = 'medium';
                    alertTitle = `Alerta de Vibración: Zona C (Insatisfactoria)`;
                    alertMessage = `El sensor '${sensor.name}' reporta ${reading.value.toFixed(2)} ${reading.unit}. Condición no apta para operación continua.`;
                } else if (severity === 'D') {
                    alertPriority = 'high';
                    alertTitle = `Alerta de Vibracion: Zona D (Inaceptable)`;
                    alertMessage = `¡Peligro de Daño! El sensor '${sensor.name}' reporta ${reading.value.toFixed(2)} ${reading.unit}.`;
                }
            } else { // Lógica para ISO 10816 (fallback)
                 switch (statusBase) {
                    case 'Alerta': alertPriority = 'medium'; alertTitle = `Vibración en Alerta`; break;
                    case 'Precaucion': alertPriority = 'high'; alertTitle = `Vibración en Precaución`; break;
                    case 'Peligro': alertPriority = 'high'; alertTitle = `Vibración en Peligro`; break;
                    default: alertDetected = false; break;
                 }
                 if(alertDetected) alertMessage = `El sensor '${sensor.name}' ha entrado en estado de ${statusBase} con un valor de ${reading.value.toFixed(2)} ${reading.unit}.`;
            }
        } else if (sensorType === 'temperature') {
            const tempValue = reading.value;
            const thresholds = sensor.thresholds || {};
            if (statusBase === 'Crítico') {
                alertPriority = 'high';
                alertTitle = `Alerta de Temperatura: Nivel Crítico`;
                alertMessage = `¡Riesgo Crítico! El sensor '${sensor.name}' registra ${tempValue.toFixed(2)}°C, superando el umbral crítico.`;
            } else if (statusBase === 'Advertencia') {
                alertPriority = 'medium';
                alertTitle = `Alerta de Temperatura: Nivel Advertencia`;
                alertMessage = `Advertencia: El sensor '${sensor.name}' registra ${tempValue.toFixed(2)}°C, fuera del rango normal.`;
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
        const { data: existingAlert } = await supabase.from('alerts').select('id, priority').eq('sensor_id', sensor.id).eq('type', alertTypeForDB).eq('status', 'active').maybeSingle();
        
        if (existingAlert) {
            if (getPriorityValue(alertPriority) >= getPriorityValue(existingAlert.priority)) {
                console.log(`  -> [ALERTS] Actualizando alerta activa de '${alertTypeForDB}' para ${sensor.name} con nueva prioridad '${alertPriority}'.`);
                await supabase.from('alerts').update({ title: alertTitle, description: alertMessage, priority: alertPriority, value_at_alert: reading.value, updated_at: new Date().toISOString() }).eq('id', existingAlert.id);
            }
        } else {
            console.log(`  -> [ALERTS] Creando NUEVA alerta de '${alertTypeForDB}' para ${sensor.name} con prioridad '${alertPriority}'.`);
            await supabase.from('alerts').insert({ organization_id: sensor.organization_id, sensor_id: sensor.id, asset_id: sensor.asset_id, type: alertTypeForDB, title: alertTitle, description: alertMessage, priority: alertPriority, status: 'active', value_at_alert: reading.value, alert_time: new Date().toISOString() });
        }
    } else {
        const { error } = await supabase.from('alerts').update({ status: 'resolved', resolved_time: new Date().toISOString() }).eq('sensor_id', sensor.id).eq('status', 'active').eq('type', alertTypeForDB);
        if (!error) console.log(`  -> [ALERTS] Condición normal. Alertas de tipo '${alertTypeForDB}' para '${sensor.name}' resueltas.`);
    }
}

async function checkForSpikeAndAlert(sensor, newValue) {
    const { data: lastAnalysis } = await supabase.from('analysis_results').select('measured_value').eq('sensor_id', sensor.id).order('analysis_timestamp', { ascending: false }).limit(1).single();
    if (!lastAnalysis) return false;
    const lastValue = lastAnalysis.measured_value;
    const isSpike = newValue > SPIKE_MIN_ABSOLUTE_VALUE && lastValue > 0 && (newValue / lastValue) > SPIKE_THRESHOLD_MULTIPLIER;
    if (isSpike) {
        console.warn(`  -> [SPIKE DETECTED] Valor anómalo detectado para ${sensor.name}. Nuevo: ${newValue.toFixed(2)}, Anterior: ${lastValue.toFixed(2)}`);
        await manageAlerts(sensor, { value: newValue, unit: 'mm/s' }, 'data_issue', 'vibration');
        return true;
    }
    return false;
}

async function processDeviceStatus(sensor, deviceStatus) {
    if (deviceStatus.batteryVolt !== undefined) {
        await supabase.from('sensors').update({ battery_level: deviceStatus.batteryVolt }).eq('id', sensor.id);
        if (deviceStatus.batteryVolt < LOW_BATTERY_THRESHOLD_VOLT) {
            await manageAlerts(sensor, { value: deviceStatus.batteryVolt, unit: 'V' }, 'low_battery', 'low_battery');
        } else {
            // Si la batería está OK, resuelve la alerta
            await supabase.from('alerts').update({ status: 'resolved', resolved_time: new Date().toISOString() }).eq('sensor_id', sensor.id).eq('type', 'battery').eq('status', 'active');
        }
    }
}

// =================================================================
// SECCIÓN 5: SIMULACIÓN Y ESCRITURA EN DB
// =================================================================

function generateBaseValue(sensorConfig) {
  if (sensorConfig.type === 'temperature') {
      let currentValue = currentSensorValues[sensorConfig.id];
      const change = (Math.random() * 2 * sensorConfig.variation) - sensorConfig.variation;
      let newValue = currentValue + change;
      const lowerBound = sensorConfig.normalMin - (sensorConfig.variation * 1.5);
      const upperBound = sensorConfig.normalMax + (sensorConfig.variation * 1.5);
      if (newValue < lowerBound || newValue > upperBound) {
        newValue = (lowerBound + upperBound) / 2;
      }
      currentSensorValues[sensorConfig.id] = newValue;
      return parseFloat(newValue.toFixed(4));
  }
  if (sensorConfig.type === 'vibration') {
      const minVal = 0.5;
      const maxVal = 18.0;
      return parseFloat((Math.random() * (maxVal - minVal) + minVal).toFixed(4));
  }
  return 0;
}

async function updateSensorSummary(sensorId, summaryData) {
    const { error } = await supabase.from('sensors').update({
        last_reading_timestamp: summaryData.timestamp,
        last_value: summaryData.value,
        last_unit: summaryData.unit,
    }).eq('id', sensorId);
    if (error) console.error(`[UPDATE_SUMMARY] Error al actualizar resumen para ${sensorId}:`, error.message);
}

async function runSimulationCycle() {
    console.log(`\n[${new Date().toLocaleTimeString()}] ====== INICIANDO CICLO DE SIMULACIÓN ======`);

    for (const config of SENSOR_CONFIGS) {
        console.log(`\n--- Procesando sensor: ${config.id} (${config.type}) ---`);

        // Simulación de pérdida de conectividad (20% de probabilidad de fallo)
        if (Math.random() < 0.20) {
            console.warn(`  -> [SIM] Simulating connection loss for sensor ${config.id}. Skipping cycle.`);
            continue;
        }

        const { data: sensorData, error: fetchError } = await supabase.from('sensors').select('*').eq('id', config.id).single();
        if (fetchError || !sensorData) {
            console.error(`[ERROR] No se pudo obtener el sensor ${config.id}. Saltando...`, fetchError?.message);
            continue;
        }

        // Si el sensor estaba en error, lo volvemos a 'active' al recibir datos
        if (sensorData.status === 'error') {
            console.log(`  -> [STATUS] Sensor ${sensorData.name} estaba en 'error', ahora 'active'.`);
            await supabase.from('sensors').update({ status: 'active' }).eq('id', sensorData.id);
            await supabase.from('alerts').update({ status: 'resolved', resolved_time: new Date().toISOString() }).eq('sensor_id', sensorData.id).eq('type', 'connectivity').eq('status', 'active');
        }

        // Simulación de batería
        config.currentBatteryVolt -= config.batteryDrain;
        await processDeviceStatus(sensorData, { batteryVolt: config.currentBatteryVolt });
        
        const baseValue = generateBaseValue(config);
        const timestamp = new Date().toISOString();
        let readingForAlert = { value: baseValue, unit: config.unit };

        if (config.type === 'temperature') {
            await supabase.from('temperature_readings').insert({ sensor_id: config.id, value: baseValue, timestamp });
            console.log(`  -> Inserción de Temperatura. Valor: ${baseValue.toFixed(2)}`);
            
            const finalStatus = analyzeGeneralThresholds(baseValue, sensorData.thresholds);
            console.log(`  -> Análisis de Temperatura: [Valor: ${baseValue.toFixed(2)}] -> [Estado: ${finalStatus}]`);
            
            await saveOrUpdateAnalysisResult({ sensor_id: config.id, asset_id: sensorData.asset_id, measured_value: baseValue, final_status: finalStatus });
            await manageAlerts(sensorData, readingForAlert, finalStatus, config.type);
            await updateSensorSummary(config.id, { value: baseValue.toFixed(2), unit: config.unit, timestamp });

        } else if (config.type === 'vibration') {
            const isSpike = await checkForSpikeAndAlert(sensorData, baseValue);
            if (isSpike) continue;

            const readingsToInsert = [];
            const axisValues = {};
            let maxVibrationValue = 0;

            for (const axis of ['X', 'Y', 'Z']) {
                const axisValue = Math.abs(baseValue) * (0.8 + Math.random() * 0.4);
                if (axisValue > maxVibrationValue) maxVibrationValue = axisValue;
                readingsToInsert.push({ sensor_id: config.id, axis, oavelocity: axisValue, peak: axisValue * 1.414, rms: axisValue / 1.414, kurtosis: 3, crestfactor: 1.4, skewness: 0.5, deviation: 0.1, peak_to_peak_displacement: 1, timestamp });
                axisValues[axis.toLowerCase()] = axisValue.toFixed(2);
            }

            await supabase.from('vibration_readings').insert(readingsToInsert);
            console.log(`  -> Inserción de Vibración (3 ejes).`);

            const vibrationProfile = await getVibrationProfileForAsset(sensorData.asset_id);
            const profileStatus = analyzeVibrationProfile(maxVibrationValue, vibrationProfile?.ranges || []);
            const isoStatus = analyzeISO10816(maxVibrationValue);
            const finalStatus = determineFinalStatus(profileStatus, isoStatus);
            
            readingForAlert = { value: maxVibrationValue, unit: config.unit };
            console.log(`  -> Análisis de Vibración: [Valor Máx: ${maxVibrationValue.toFixed(2)}] -> [Estado: ${finalStatus}]`);

            await saveOrUpdateAnalysisResult({ sensor_id: config.id, asset_id: sensorData.asset_id, measured_value: maxVibrationValue, iso_status: isoStatus, profile_status: profileStatus, final_status: finalStatus, axes_values: axisValues });
            await manageAlerts(sensorData, readingForAlert, finalStatus, config.type);
            const summaryValue = `X: ${axisValues.x}, Y: ${axisValues.y}, Z: ${axisValues.z}`;
            await updateSensorSummary(config.id, { value: summaryValue, unit: config.unit, timestamp });
        }
    }
}

// --- 6. VERIFICADOR DE CONECTIVIDAD (Portado de basicanalysis) ---
async function checkSensorConnectivity() {
    console.log('\n[CONNECTIVITY CHECK] Ejecutando chequeo de conectividad...');
    const { data: activeSensors, error } = await supabase.from('sensors').select('id, name, status, last_reading_timestamp, organization_id, asset_id').in('status', ['active', 'warning', 'critical']);
    
    if (error) { 
        console.error('[CONNECTIVITY CHECK] Error al obtener sensores:', error.message); 
        return; 
    }

    const now = new Date();
    const timeout = CONNECTIVITY_TIMEOUT_MINUTES * 60 * 1000;

    for (const sensor of activeSensors) {
        const lastReadingTime = sensor.last_reading_timestamp ? new Date(sensor.last_reading_timestamp) : null;
        
        if (!lastReadingTime || (now - lastReadingTime > timeout)) {
            console.warn(`[CONNECTIVITY CHECK] ¡Pérdida de conexión con ${sensor.name}! Actualizando estado a 'error'.`);
            await supabase.from('sensors').update({ status: 'error' }).eq('id', sensor.id);

            // Crear alerta de conectividad si no existe una activa
            const { data: existingAlert } = await supabase.from('alerts').select('id').eq('sensor_id', sensor.id).eq('type', 'connectivity').eq('status', 'active').maybeSingle();
            if (!existingAlert) {
                await supabase.from('alerts').insert({ organization_id: sensor.organization_id, sensor_id: sensor.id, asset_id: sensor.asset_id, type: 'connectivity', title: `Pérdida de Conexión con Sensor`, description: `No se han recibido datos del sensor '${sensor.name}' en los últimos ${CONNECTIVITY_TIMEOUT_MINUTES} minutos.`, priority: 'high', status: 'active', alert_time: new Date().toISOString() });
                console.log(`  -> [ALERTS] Creada alerta de conectividad para ${sensor.name}.`);
            }
        }
    }
}

// --- 7. INICIO DEL SCRIPT ---
console.log("[INFO] Simulador de alta fidelidad iniciado.");
console.log(`[INFO] Se ejecutará un ciclo de inserción cada ${INSERT_INTERVAL_MS / 1000} segundos.`);
console.log(`[INFO] Se ejecutará un chequeo de conectividad cada ${CONNECTIVITY_CHECK_INTERVAL_MINUTES} minutos.`);

setInterval(runSimulationCycle, INSERT_INTERVAL_MS);
setInterval(checkSensorConnectivity, CONNECTIVITY_CHECK_INTERVAL_MINUTES * 60 * 1000);

runSimulationCycle(); // Ejecutar una vez al inicio
checkSensorConnectivity(); // Ejecutar una vez al inicio
