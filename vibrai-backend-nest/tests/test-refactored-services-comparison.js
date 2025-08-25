// Test para comparar el comportamiento de nuestros servicios refactorizados
// con basic-analysis.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { get } = require('lodash');

// Configuración
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Simulamos el comportamiento actual de nuestros servicios refactorizados
class MockPayloadService {
    extractReadings(payload, sensor) {
        const readings = [];
        const firmware = sensor.firmware;
        
        if (!firmware || !firmware.structure) {
            console.log(`[REFACTORED] ❌ Sensor ${sensor.name} sin estructura de firmware válida`);
            return readings;
        }

        const sensorTypeConfig = firmware.structure[sensor.type];
        if (!sensorTypeConfig) {
            console.log(`[REFACTORED] ❌ No hay configuración para tipo ${sensor.type} en sensor ${sensor.name}`);
            return readings;
        }

        const dataPath = sensorTypeConfig.dataPath;
        const data = dataPath ? get(payload, dataPath) : payload;
        
        if (!data) {
            console.log(`[REFACTORED] ❌ No se encontraron datos en ${dataPath} para sensor ${sensor.name}`);
            return readings;
        }

        const correctionFactor = sensorTypeConfig.correctionFactor || 1;
        console.log(`[REFACTORED] Aplicando factor de corrección de ${correctionFactor} para ${sensor.type} en sensor ${sensor.name}`);

        if (sensor.type === 'temperature') {
            const expectedFields = sensorTypeConfig.camposEsperados || [];
            if (expectedFields.length > 0) {
                const rawValue = get(data, expectedFields[0]);
                if (rawValue !== undefined) {
                    const correctedValue = rawValue * correctionFactor;
                    readings.push({
                        type: 'temperature',
                        sensor_id: sensor.id,
                        value: correctedValue,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`[REFACTORED] Lectura de Temperatura extraída: ${rawValue} -> ${correctedValue.toFixed(2)} °C`);
                }
            }
        } else if (sensor.type === 'vibration') {
            ['X-Axis', 'Y-Axis', 'Z-Axis'].forEach(axisKey => {
                const axisData = data[axisKey];
                if (axisData && axisData.OAVelocity !== undefined) {
                    const correctedOAVelocity = axisData.OAVelocity * correctionFactor;
                    readings.push({
                        type: 'vibration',
                        sensor_id: sensor.id,
                        axis: axisKey.charAt(0),
                        oavelocity: correctedOAVelocity,
                        peak: axisData.Peakmg,
                        rms: axisData.RMSmg,
                        kurtosis: axisData.Kurtosis,
                        crestfactor: axisData.CrestFactor,
                        skewness: axisData.Skewness,
                        deviation: axisData.Deviation,
                        peak_to_peak_displacement: axisData['Peak-to-Peak Displacement'],
                        timestamp: new Date().toISOString()
                    });
                    console.log(`[REFACTORED] Lectura de Vibración extraída (${axisKey}): ${axisData.OAVelocity} -> ${correctedOAVelocity.toFixed(3)} mm/s`);
                }
            });
        }

        return readings;
    }

    extractDeviceStatus(payload) {
        return {
            batteryVolt: get(payload, 'Device.BatteryVolt'),
            powerSrc: get(payload, 'Device.PowerSrc')
        };
    }
}

// Función para filtrar lecturas por sensor (comportamiento actual problemático)
function isReadingForSensorType(reading, sensorType) {
    if (sensorType === 'temperature') {
        return reading.type === 'temperature';
    } else if (sensorType === 'vibration') {
        return reading.type === 'vibration';
    }
    return false;
}

async function testRefactoredServicesBehavior() {
    console.log('=== COMPARACIÓN: SERVICIOS REFACTORIZADOS vs BASIC-ANALYSIS.JS ===\n');

    // Payload de prueba (mismo que en el test anterior)
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

    // Obtener sensores
    console.log('1. Obteniendo sensores de la base de datos...');
    const { data: sensors, error } = await supabase
        .from('sensors')
        .select(`
            id, type, code, name, status, organization_id, asset_id, thresholds,
            firmware:sensor_firmwares ( sensor_types, structure )
        `)
        .eq('code', 'FF907C3C');

    if (error || !sensors || sensors.length === 0) {
        console.error('Error al obtener sensores o no se encontraron sensores');
        return;
    }

    console.log(`✓ Encontrados ${sensors.length} sensores\n`);

    // Simular comportamiento de servicios refactorizados
    console.log('2. Simulando comportamiento ACTUAL de servicios refactorizados...');
    console.log('--- COMPORTAMIENTO ACTUAL (PROBLEMÁTICO) ---');
    
    const payloadService = new MockPayloadService();
    
    // Simular el comportamiento actual: solo procesar el primer sensor
    const firstSensor = sensors[0];
    console.log(`\n[REFACTORED] Procesando SOLO el primer sensor: ${firstSensor.name} (Tipo: ${firstSensor.type})`);
    
    const allReadings = payloadService.extractReadings(testPayload, firstSensor);
    console.log(`[REFACTORED] Total de lecturas extraídas: ${allReadings.length}`);
    
    // Filtrar lecturas por tipo de sensor (comportamiento actual problemático)
    const filteredReadings = allReadings.filter(reading => isReadingForSensorType(reading, firstSensor.type));
    console.log(`[REFACTORED] Lecturas después del filtrado por tipo '${firstSensor.type}': ${filteredReadings.length}`);
    
    filteredReadings.forEach((reading, index) => {
        console.log(`[REFACTORED]   ${index + 1}. Tipo: ${reading.type}, Sensor ID: ${reading.sensor_id}`);
    });

    console.log('\n--- COMPORTAMIENTO CORRECTO (COMO BASIC-ANALYSIS.JS) ---');
    
    // Simular el comportamiento correcto: procesar todos los sensores
    let totalCorrectReadings = 0;
    for (const sensor of sensors) {
        console.log(`\n[CORRECTED] Procesando sensor: ${sensor.name} (Tipo: ${sensor.type})`);
        
        const sensorReadings = payloadService.extractReadings(testPayload, sensor);
        console.log(`[CORRECTED] Lecturas extraídas para este sensor: ${sensorReadings.length}`);
        
        // No filtrar - cada sensor procesa sus propias lecturas según su tipo
        sensorReadings.forEach((reading, index) => {
            console.log(`[CORRECTED]   ${index + 1}. Tipo: ${reading.type}, Sensor ID: ${reading.sensor_id}`);
        });
        
        totalCorrectReadings += sensorReadings.length;
    }
    
    console.log(`\n[CORRECTED] Total de lecturas procesadas correctamente: ${totalCorrectReadings}`);

    console.log('\n3. COMPARACIÓN DE RESULTADOS:');
    console.log(`   ❌ Comportamiento actual (problemático): ${filteredReadings.length} lecturas guardadas`);
    console.log(`   ✅ Comportamiento correcto (como basic-analysis.js): ${totalCorrectReadings} lecturas guardadas`);
    
    console.log('\n4. PROBLEMAS IDENTIFICADOS EN SERVICIOS REFACTORIZADOS:');
    console.log('   ❌ Solo procesa el PRIMER sensor encontrado');
    console.log('   ❌ Ignora sensores adicionales con el mismo código');
    console.log('   ❌ Filtra lecturas por tipo de sensor incorrectamente');
    console.log('   ❌ Pierde datos de sensores de temperatura cuando el primer sensor es de vibración');

    console.log('\n5. SOLUCIÓN REQUERIDA:');
    console.log('   ✅ Procesar TODOS los sensores con el mismo código');
    console.log('   ✅ Cada sensor debe extraer lecturas según su propio tipo');
    console.log('   ✅ Eliminar filtrado incorrecto de lecturas');
    console.log('   ✅ Mantener la misma estructura de datos que basic-analysis.js');

    console.log('\n=== COMPARACIÓN COMPLETADA ===');
}

// Ejecutar el test
testRefactoredServicesBehavior().catch(console.error);