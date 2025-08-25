// Debug para entender por qué no se extraen datos de vibración

const PayloadService = require('./src/services/payload.service.js');
const DatabaseService = require('./src/services/database.service.js');

// Payload de ejemplo basado en los logs
const samplePayload = `{
  "TempHumi": {"SenVal": 25812},
  "Accelerometer": {
    "X-Axis": {"OAVelocity": 1, "Peakmg": 5, "RMSmg": 4, "Kurtosis": -16, "CrestFactor": 658, "Skewness": 23, "Deviation": 0},
    "Y-Axis": {"OAVelocity": 2, "Peakmg": 6, "RMSmg": 5, "Kurtosis": -15, "CrestFactor": 659, "Skewness": 24, "Deviation": 1},
    "Z-Axis": {"OAVelocity": 3, "Peakmg": 7, "RMSmg": 6, "Kurtosis": -14, "CrestFactor": 660, "Skewness": 25, "Deviation": 2}
  },
  "Device": {"Events": 0, "PowerSource": 0, "BatteryVoltage": 3.6}
}`;

async function debugVibrationExtraction() {
  try {
    console.log('🔍 DEBUGGING EXTRACCIÓN DE DATOS DE VIBRACIÓN\n');
    
    const payloadService = new PayloadService();
    const databaseService = new DatabaseService();
    
    // 1. Parsear payload
    console.log('1. Parseando payload...');
    const data = payloadService.parsePayload(samplePayload);
    console.log('   ✓ Payload parseado:', Object.keys(data));
    console.log('   ✓ Accelerometer presente:', !!data.Accelerometer);
    console.log('   ✓ Ejes disponibles:', data.Accelerometer ? Object.keys(data.Accelerometer) : 'Ninguno');
    
    // 2. Simular sensores (sin base de datos)
    console.log('\n2. Simulando configuración de sensores...');
    const mockSensors = [
      {
        id: 'vibration-sensor-id',
        name: 'Sensor de Vibracion',
        type: 'vibration',
        code: 'FF907C3C',
        firmware: {
          structure: {
            vibration: {
              dataPath: 'Accelerometer',
              camposEsperados: ['X-Axis.OAVelocity', 'Y-Axis.OAVelocity', 'Z-Axis.OAVelocity'],
              correctionFactor: 1
            }
          }
        },
        correctionFactor: 1
      },
      {
        id: 'temperature-sensor-id',
        name: 'Sensor de Temperatura',
        type: 'temperature',
        code: 'FF907C3C',
        firmware: {
          structure: {
            temperature: {
              dataPath: 'TempHumi',
              camposEsperados: ['SenVal'],
              correctionFactor: 0.001
            }
          }
        },
        correctionFactor: 1
      }
    ];
    
    console.log('   ✓ Sensores simulados:', mockSensors.length);
    mockSensors.forEach(s => console.log(`     - ${s.name} (${s.type})`));
    
    // 3. Extraer lecturas
    console.log('\n3. Extrayendo lecturas...');
    const readings = payloadService.extractSensorReadings(data, mockSensors);
    
    console.log(`   ✓ Total de lecturas extraídas: ${readings.length}`);
    readings.forEach((reading, index) => {
      console.log(`     ${index + 1}. ${reading.type}${reading.axis ? ` (${reading.axis})` : ''}: ${reading.value || 'Datos completos'} ${reading.unit || ''}`);
      if (reading.type === 'vibration') {
        console.log(`        Métricas: ${Object.keys(reading.data).filter(k => k !== 'sensor_id' && k !== 'axis' && k !== 'timestamp').join(', ')}`);
      }
    });
    
    // 4. Verificar datos específicos de vibración
    console.log('\n4. Verificando datos de vibración específicamente...');
    const vibrationReadings = readings.filter(r => r.type === 'vibration');
    console.log(`   ✓ Lecturas de vibración encontradas: ${vibrationReadings.length}`);
    
    if (vibrationReadings.length > 0) {
      vibrationReadings.forEach(reading => {
        console.log(`     Eje ${reading.axis}:`);
        console.log(`       - OAVelocity: ${reading.data.oavelocity}`);
        console.log(`       - Peak: ${reading.data.peak}`);
        console.log(`       - RMS: ${reading.data.rms}`);
      });
    } else {
      console.log('   ❌ No se encontraron lecturas de vibración');
      
      // Debug adicional
      console.log('\n   🔍 Debug adicional:');
      console.log('     - Datos de Accelerometer:', JSON.stringify(data.Accelerometer, null, 2));
      
      // Probar extracción manual
      const vibrationSensor = mockSensors.find(s => s.type === 'vibration');
      console.log('     - Configuración del sensor de vibración:', JSON.stringify(vibrationSensor.firmware, null, 2));
      
      // Probar extracción directa
      const testReadings = [];
      payloadService.extractVibrationReadings(data, vibrationSensor, new Date().toISOString(), testReadings);
      console.log(`     - Extracción directa resultó en: ${testReadings.length} lecturas`);
    }
    
  } catch (error) {
    console.error('❌ Error durante debug:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugVibrationExtraction();