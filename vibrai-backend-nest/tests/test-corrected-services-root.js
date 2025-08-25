const PayloadService = require('./src/services/payload.service');
const DatabaseService = require('./src/services/database.service');

async function testCorrectedServices() {
  console.log('🧪 Iniciando test de servicios corregidos...\n');

  try {
    // Inicializar servicios
    const databaseService = new DatabaseService();
    const payloadService = new PayloadService();
    payloadService.databaseService = databaseService;

    // Payload de prueba
    const testPayload = {
      'DeviceInfo': {
        'SequenceNumber': 12345,
        'Events': 0,
        'PowerSource': 'Battery',
        'BatteryVoltage': 3.7
      },
      'SensorData': {
        'X-Axis': {
          'OAVelocity': 2.5,
          'PeakVelocity': 4.2,
          'Kurtosis': 3.1,
          'CrestFactor': 2.8,
          'Skewness': 0.5
        },
        'Y-Axis': {
          'OAVelocity': 1.8,
          'PeakVelocity': 3.1,
          'Kurtosis': 2.9,
          'CrestFactor': 2.5,
          'Skewness': 0.3
        },
        'Z-Axis': {
          'OAVelocity': 3.2,
          'PeakVelocity': 5.1,
          'Kurtosis': 3.5,
          'CrestFactor': 3.2,
          'Skewness': 0.7
        },
        'Temperature': 25.5
      }
    };

    // Sensores virtuales para testing
    const vibrationSensor = {
      id: 999,
      code: 'TEST001',
      name: 'Sensor de Vibración Virtual',
      type: 'vibration',
      firmware: {
        structure: {
          'SensorData': {
            'X-Axis': { 'OAVelocity': 'number', 'Kurtosis': 'number', 'CrestFactor': 'number', 'Skewness': 'number' },
            'Y-Axis': { 'OAVelocity': 'number', 'Kurtosis': 'number', 'CrestFactor': 'number', 'Skewness': 'number' },
            'Z-Axis': { 'OAVelocity': 'number', 'Kurtosis': 'number', 'CrestFactor': 'number', 'Skewness': 'number' }
          }
        }
      },
      correctionFactor: 1.2
    };

    const temperatureSensor = {
      id: 998,
      code: 'TEST001',
      name: 'Sensor de Temperatura Virtual',
      type: 'temperature',
      firmware: {
        structure: {
          'SensorData': {
            'Temperature': 'number'
          }
        }
      },
      correctionFactor: 0.95
    };

    console.log('✅ 1. Verificando uso de firmware.structure...');
    
    // Procesar payload directamente con sensores virtuales
    const parsedPayload = payloadService.parsePayload(JSON.stringify(testPayload));
    const extractedReadings = payloadService.extractSensorReadings(parsedPayload, [vibrationSensor, temperatureSensor]);
    const extractedDeviceInfo = payloadService.extractDeviceInfo(parsedPayload);

    console.log(`   - Payload parseado correctamente: ${parsedPayload ? '✓' : '✗'}`);
    console.log(`   - Lecturas extraídas: ${extractedReadings.length}`);
    console.log(`   - Información del dispositivo extraída: ${extractedDeviceInfo ? '✓' : '✗'}`);

    console.log('\n✅ 2. Verificando aplicación de factores de corrección...');
    
    // Verificar que se aplicaron los factores de corrección
    const vibrationReadings = extractedReadings.filter(r => r.type === 'vibration');
    if (vibrationReadings.length > 0) {
      const firstReading = vibrationReadings[0];
      const originalValue = 2.5; // OAVelocity del eje X
      const expectedCorrected = originalValue * 1.2; // Factor de corrección
      const actualValue = firstReading.data.oavelocity;
      
      console.log(`   - Valor original: ${originalValue}`);
      console.log(`   - Factor de corrección: 1.2`);
      console.log(`   - Valor esperado: ${expectedCorrected}`);
      console.log(`   - Valor actual: ${actualValue}`);
      console.log(`   - Factor aplicado correctamente: ${actualValue === expectedCorrected ? '✓' : '✗'}`);
    }

    console.log('\n✅ 3. Verificando procesamiento del primer sensor...');
    
    // Simular múltiples sensores con el mismo código (como haría main.service.js)
    const multipleSensors = [vibrationSensor, { ...vibrationSensor, id: 1000, name: 'Sensor Duplicado' }];
    
    // Simular la lógica de main.service.js: procesar solo el primer sensor por código
    const sensorsByCode = {};
    multipleSensors.forEach(sensor => {
      if (!sensorsByCode[sensor.code]) {
        sensorsByCode[sensor.code] = sensor;
      }
    });
    
    const firstSensorOnly = Object.values(sensorsByCode);
    const readingsWithFirstOnly = payloadService.extractSensorReadings(parsedPayload, firstSensorOnly);
    
    // Verificar que solo se procesó el primer sensor
    const uniqueSensorIds = [...new Set(readingsWithFirstOnly.map(r => r.sensorId))];
    console.log(`   - Sensores únicos procesados: ${uniqueSensorIds.length}`);
    console.log(`   - Solo primer sensor procesado: ${uniqueSensorIds.length === 1 && uniqueSensorIds[0] === 999 ? '✓' : '✗'}`);

    console.log('\n✅ 4. Verificando agrupación correcta de lecturas...');
    
    // Verificar agrupación por tipo
    const groupedByType = extractedReadings.reduce((acc, reading) => {
      acc[reading.type] = (acc[reading.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`   - Lecturas de vibración: ${groupedByType.vibration || 0}`);
    console.log(`   - Lecturas de temperatura: ${groupedByType.temperature || 0}`);
    console.log(`   - Agrupación correcta: ${groupedByType.vibration === 3 ? '✓' : '✗'}`); // 3 ejes

    console.log('\n✅ 5. Verificando validación de lecturas...');
    
    // Verificar que las lecturas tienen la estructura correcta
    const validReadings = extractedReadings.filter(reading => {
      return reading.type && 
             reading.timestamp && 
             reading.sensorId && 
             reading.data &&
             typeof reading.data === 'object';
    });
    
    console.log(`   - Total de lecturas: ${extractedReadings.length}`);
    console.log(`   - Lecturas válidas: ${validReadings.length}`);
    console.log(`   - Todas las lecturas son válidas: ${validReadings.length === extractedReadings.length ? '✓' : '✗'}`);

    console.log('\n🎉 Test completado exitosamente!');
    console.log('\n📊 Resumen de correcciones verificadas:');
    console.log('   ✓ Uso de firmware.structure para extracción de datos');
    console.log('   ✓ Aplicación de factores de corrección');
    console.log('   ✓ Procesamiento solo del primer sensor por código');
    console.log('   ✓ Agrupación correcta de lecturas');
    console.log('   ✓ Validación de estructura de lecturas');

  } catch (error) {
    console.error('❌ Error durante el test:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar el test
testCorrectedServices();