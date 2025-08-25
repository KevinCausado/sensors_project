const PayloadService = require('./src/services/payload.service');
const DatabaseService = require('./src/services/database.service');

// Mock del database service para evitar conexiones reales
class MockDatabaseService {
  async getSensorsByCode(code) {
    return [{
      id: 1,
      name: 'Test Sensor',
      code: code,
      type: 'vibration'
    }];
  }
}

async function testTimestampConsistency() {
  console.log('=== TEST DE CONSISTENCIA DE TIMESTAMPS ===\n');
  
  const payloadService = new PayloadService();
  payloadService.databaseService = new MockDatabaseService();
  
  // Simular un payload MQTT con datos de vibración para los tres ejes
  const mockPayload = JSON.stringify({
    "Timestamp": "2024-01-15T10:30:45.123Z",
    "Accelerometer": {
      "X-Axis": {
        "OAVelocity": 1.25,
        "Peak": 0.85,
        "RMS": 0.42
      },
      "Y-Axis": {
        "OAVelocity": 1.18,
        "Peak": 0.78,
        "RMS": 0.39
      },
      "Z-Axis": {
        "OAVelocity": 1.32,
        "Peak": 0.91,
        "RMS": 0.45
      }
    }
  });
  
  console.log('1. Payload MQTT simulado:');
  console.log(JSON.stringify(JSON.parse(mockPayload), null, 2));
  console.log('\n');
  
  // Procesar el payload
  const result = await payloadService.processPayload('TEST001', mockPayload);
  
  if (!result.success) {
    console.error('❌ Error al procesar payload:', result.error);
    return;
  }
  
  console.log('2. Análisis de timestamps extraídos:');
  console.log('=====================================');
  
  const vibrationReadings = result.readings.filter(r => r.type === 'vibration');
  
  if (vibrationReadings.length === 0) {
    console.log('❌ No se encontraron lecturas de vibración');
    return;
  }
  
  console.log(`Total de lecturas de vibración: ${vibrationReadings.length}`);
  console.log('');
  
  // Verificar timestamps
  const timestamps = new Set();
  let allSameTimestamp = true;
  let referenceTimestamp = null;
  
  vibrationReadings.forEach((reading, index) => {
    const readingTimestamp = reading.timestamp;
    const dataTimestamp = reading.data.timestamp;
    
    console.log(`Eje ${reading.axis}:`);
    console.log(`  - reading.timestamp: ${readingTimestamp}`);
    console.log(`  - reading.data.timestamp: ${dataTimestamp}`);
    console.log(`  - ¿Son iguales?: ${readingTimestamp === dataTimestamp ? '✅' : '❌'}`);
    
    timestamps.add(readingTimestamp);
    
    if (referenceTimestamp === null) {
      referenceTimestamp = readingTimestamp;
    } else if (referenceTimestamp !== readingTimestamp) {
      allSameTimestamp = false;
    }
    
    console.log('');
  });
  
  console.log('3. Resumen de consistencia:');
  console.log('===========================');
  console.log(`Timestamps únicos encontrados: ${timestamps.size}`);
  console.log(`¿Todos los ejes tienen el mismo timestamp?: ${allSameTimestamp ? '✅ SÍ' : '❌ NO'}`);
  
  if (timestamps.size === 1) {
    console.log(`✅ CORRECTO: Todos los ejes usan el mismo timestamp: ${referenceTimestamp}`);
  } else {
    console.log('❌ PROBLEMA: Se encontraron timestamps diferentes:');
    timestamps.forEach(ts => console.log(`  - ${ts}`));
  }
  
  console.log('\n4. Verificación del timestamp original del MQTT:');
  console.log('================================================');
  const originalTimestamp = "2024-01-15T10:30:45.123Z";
  const extractedTimestamp = payloadService.extractTimestamp(JSON.parse(mockPayload));
  
  console.log(`Timestamp original del MQTT: ${originalTimestamp}`);
  console.log(`Timestamp extraído: ${extractedTimestamp}`);
  console.log(`¿Coinciden?: ${originalTimestamp === extractedTimestamp ? '✅ SÍ' : '❌ NO'}`);
  
  // Test adicional: verificar qué pasa cuando no hay timestamp en el payload
  console.log('\n5. Test sin timestamp en payload:');
  console.log('==================================');
  
  const payloadWithoutTimestamp = JSON.stringify({
    "Accelerometer": {
      "X-Axis": { "OAVelocity": 1.0 },
      "Y-Axis": { "OAVelocity": 1.1 },
      "Z-Axis": { "OAVelocity": 1.2 }
    }
  });
  
  const beforeTime = new Date().toISOString();
  const resultWithoutTimestamp = await payloadService.processPayload('TEST001', payloadWithoutTimestamp);
  const afterTime = new Date().toISOString();
  
  if (resultWithoutTimestamp.success) {
    const vibReadings = resultWithoutTimestamp.readings.filter(r => r.type === 'vibration');
    const timestampsWithoutOriginal = new Set();
    
    vibReadings.forEach(reading => {
      timestampsWithoutOriginal.add(reading.timestamp);
    });
    
    console.log(`Timestamps generados automáticamente: ${timestampsWithoutOriginal.size}`);
    console.log(`¿Todos iguales?: ${timestampsWithoutOriginal.size === 1 ? '✅ SÍ' : '❌ NO'}`);
    
    if (timestampsWithoutOriginal.size === 1) {
      const generatedTimestamp = Array.from(timestampsWithoutOriginal)[0];
      console.log(`Timestamp generado: ${generatedTimestamp}`);
      console.log(`¿Está entre ${beforeTime} y ${afterTime}?: ${generatedTimestamp >= beforeTime && generatedTimestamp <= afterTime ? '✅ SÍ' : '❌ NO'}`);
    }
  }
  
  console.log('\n=== FIN DEL TEST ===');
}

// Ejecutar el test
testTimestampConsistency().catch(console.error);