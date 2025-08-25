// Test para analizar el comportamiento de basic-analysis.js
// y compararlo con nuestros servicios refactorizados

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { get } = require('lodash');

// Configuración
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Simulamos la función parsePayload de basic-analysis.js
function parsePayloadBasicAnalysis(sensorId, sensorType, payload, firmware) {
    const readings = [];
    const timestampSource = get(payload, 'Accelerometer.Time') || get(payload, 'Device.Time') || Date.now() / 1000;
    const dateTimestamp = new Date(timestampSource * 1000).toISOString();
    const deviceStatus = {
        batteryVolt: get(payload, 'Device.BatteryVolt'),
        powerSrc: get(payload, 'Device.PowerSrc')
    };

    if (firmware.sensor_types.includes(sensorType)) {
        const config = firmware.structure[sensorType];
        if (config) {
            const dataBasePath = config.dataPath ? get(payload, config.dataPath) : payload;                
            
            const correctionFactor = config.correctionFactor || 1;
            console.log(`[BASIC-ANALYSIS] Aplicando factor de corrección de ${correctionFactor} para ${sensorType}.`);

            if (dataBasePath !== undefined) {
                if (sensorType === 'temperature' && config.camposEsperados) {
                    const rawValue = get(dataBasePath, config.camposEsperados[0]);
                    if (rawValue !== undefined) {                        
                        const correctedValue = rawValue * correctionFactor;
                        readings.push({
                            type: 'temperature',
                            data: { sensor_id: sensorId, value: correctedValue, timestamp: dateTimestamp }
                        });
                        console.log(`[BASIC-ANALYSIS] Lectura de Temperatura: ${rawValue} -> ${correctedValue.toFixed(2)} °C`);
                    }
                } else if (sensorType === 'vibration') {
                    ['X-Axis', 'Y-Axis', 'Z-Axis'].forEach(axisKey => {
                        const axisData = dataBasePath[axisKey];
                        if (axisData && axisData.OAVelocity !== undefined) {                            
                            const correctedOAVelocity = axisData.OAVelocity * correctionFactor;

                            readings.push({
                                type: 'vibration',
                                axis: axisKey.charAt(0),
                                data: {
                                    sensor_id: sensorId, axis: axisKey.charAt(0),
                                    oavelocity: correctedOAVelocity, // Se guarda el valor corregido
                                    peak: axisData.Peak, rms: axisData.RMS,
                                    kurtosis: axisData.Kurtosis, crestfactor: axisData.CrestFactor,
                                    skewness: axisData.Skewness, deviation: axisData.Deviation,
                                    peak_to_peak_displacement: axisData['Peak-to-Peak Displacement'],
                                    timestamp: dateTimestamp
                                }
                            });
                            console.log(`[BASIC-ANALYSIS] Lectura de Vibración (${axisKey}): ${axisData.OAVelocity} -> ${correctedOAVelocity.toFixed(3)} mm/s`);
                        }
                    });
                }
            }
        }
    }
    return { readings, deviceStatus };
}

async function testBasicAnalysisBehavior() {
    console.log('=== ANÁLISIS DEL COMPORTAMIENTO DE BASIC-ANALYSIS.JS ===\n');

    // Payload de prueba (similar al real)
    const testPayload = {
        "TempHumi": {
            "Range": 0,
            "Status": 0,
            "Event": 0,
            "SenVal": 25500
        },
        "Accelerometer": {
            "Time": Math.floor(Date.now() / 1000),
            "X-Axis": {
                "SenEvent": 1,
                "OAVelocity": 6,
                "Peakmg": 5,
                "RMSmg": 4,
                "Kurtosis": -9,
                "CrestFactor": 698,
                "Skewness": 19,
                "Deviation": 0,
                "Peak-to-Peak Displacement": 0.12
            },
            "Y-Axis": {
                "SenEvent": 1,
                "OAVelocity": 8,
                "Peakmg": 7,
                "RMSmg": 6,
                "Kurtosis": -8,
                "CrestFactor": 720,
                "Skewness": 15,
                "Deviation": 0,
                "Peak-to-Peak Displacement": 0.15
            },
            "Z-Axis": {
                "SenEvent": 1,
                "OAVelocity": 4,
                "Peakmg": 3,
                "RMSmg": 2,
                "Kurtosis": -7,
                "CrestFactor": 650,
                "Skewness": 12,
                "Deviation": 0,
                "Peak-to-Peak Displacement": 0.08
            }
        },
        "Device": {
            "Time": Math.floor(Date.now() / 1000),
            "BatteryVolt": 3.8,
            "PowerSrc": 1
        }
    };

    // Obtener sensores reales de la base de datos
    console.log('1. Obteniendo sensores de la base de datos...');
    const { data: sensors, error } = await supabase
        .from('sensors')
        .select(`
            id, type, code, name, status, organization_id, asset_id, thresholds,
            firmware:sensor_firmwares ( sensor_types, structure )
        `)
        .eq('code', 'FF907C3C');

    if (error) {
        console.error('Error al obtener sensores:', error.message);
        return;
    }

    if (!sensors || sensors.length === 0) {
        console.log('No se encontraron sensores con código FF907C3C');
        return;
    }

    console.log(`✓ Encontrados ${sensors.length} sensores:`);
    sensors.forEach((sensor, index) => {
        console.log(`   ${index + 1}. ${sensor.name} (ID: ${sensor.id}, Tipo: ${sensor.type})`);
    });

    console.log('\n2. Analizando comportamiento de basic-analysis.js...');
    
    // Simular el comportamiento de basic-analysis.js
    console.log('\n--- COMPORTAMIENTO DE BASIC-ANALYSIS.JS ---');
    
    for (const sensor of sensors) {
        console.log(`\n[BASIC-ANALYSIS] Procesando sensor: ${sensor.name} (Tipo: ${sensor.type})`);
        
        if (!sensor.firmware || !sensor.firmware.structure) {
            console.log(`[BASIC-ANALYSIS] ❌ Sensor sin estructura de firmware válida`);
            continue;
        }

        console.log(`[BASIC-ANALYSIS] Estructura de firmware:`, JSON.stringify(sensor.firmware.structure, null, 2));
        
        const { readings, deviceStatus } = parsePayloadBasicAnalysis(sensor.id, sensor.type, testPayload, sensor.firmware);
        
        console.log(`[BASIC-ANALYSIS] Lecturas extraídas: ${readings.length}`);
        readings.forEach((reading, index) => {
            console.log(`[BASIC-ANALYSIS]   ${index + 1}. Tipo: ${reading.type}, Datos:`, reading.data);
        });
        
        if (deviceStatus) {
            console.log(`[BASIC-ANALYSIS] Estado del dispositivo:`, deviceStatus);
        }
    }

    console.log('\n3. Puntos clave identificados en basic-analysis.js:');
    console.log('   ✓ Procesa TODOS los sensores con el mismo código');
    console.log('   ✓ Cada sensor extrae lecturas según su tipo y firmware.structure');
    console.log('   ✓ Usa firmware.structure[sensorType].dataPath para navegar el payload');
    console.log('   ✓ Aplica firmware.structure[sensorType].correctionFactor');
    console.log('   ✓ Para vibración: busca en dataPath los ejes X-Axis, Y-Axis, Z-Axis');
    console.log('   ✓ Para temperatura: busca en dataPath el primer campo de camposEsperados');
    console.log('   ✓ Guarda directamente en tablas: temperature_readings, vibration_readings');
    console.log('   ✓ Estructura de datos para vibración: sensor_id, axis, oavelocity, peak, rms, etc.');
    console.log('   ✓ Estructura de datos para temperatura: sensor_id, value, timestamp');

    console.log('\n=== ANÁLISIS COMPLETADO ===');
}

// Ejecutar el test
testBasicAnalysisBehavior().catch(console.error);