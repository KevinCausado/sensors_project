const PayloadService = require('./src/services/payload.service');
const DatabaseService = require('./src/services/database.service');

// Mock del database service que registra las operaciones de inserción
class MockDatabaseService {
  constructor() {
    this.insertedData = [];
  }

  async getSensorsByCode(code) {
    return [{
      id: 1,
      name: 'Test Sensor',
      code: code,
      type: 'vibration'
    }];
  }

  async saveVibrationReading(vibrationData) {
    console.log(`[MOCK DB] Guardando lectura de vibración para eje ${vibrationData.axis}:`);
    console.log(`[MOCK DB]   - Timestamp: ${vibrationData.timestamp}`);
    console.log(`[MOCK DB]   - Sensor ID: ${vibrationData.sensor_id}`);
    console.log(`[MOCK DB]   - OAVelocity: ${vibrationData.oavelocity}`);
    
    // Registrar los datos insertados para análisis posterior
    this.insertedData.push({
      axis: vibrationData.axis,
      timestamp: vibrationData.timestamp,
      sensor_id: vibrationData.sensor_id,
      oavelocity: vibrationData.oavelocity,
      insertTime: new Date().toISOString()
    });
    
    console.log(`[MOCK DB] ✅ Lectura guardada exitosamente\n`);
  }

  getInsertedData() {
    return this.insertedData;
  }

  clearInsertedData() {
    this.insertedData = [];
  }
}

async function testDatabaseTimestampConsistency() {
  console.log('=== TEST DE CONSISTENCIA DE TIMESTAMPS EN BASE DE DATOS ===\n');
  
  const payloadService = new PayloadService();
  const mockDbService = new MockDatabaseService();
  payloadService.databaseService = mockDbService;
  
  // Simular un payload MQTT con timestamp específico
  const specificTimestamp = "2024-01-15T10:30:45.123Z";
  const mockPayload = JSON.stringify({
    "Timestamp": specificTimestamp,
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
  
  console.log('1. Procesando payload con timestamp específico...');
  console.log(`   Timestamp original: ${specificTimestamp}\n`);
  
  // Procesar el payload
  const result = await payloadService.processPayload('TEST001', mockPayload);
  
  if (!result.success) {
    console.error('❌ Error al procesar payload:', result.error);
    return;
  }
  
  // Simular el procesamiento completo como lo haría main.service.js
  console.log('2. Simulando almacenamiento en base de datos...\n');
  
  const vibrationReadings = result.readings.filter(r => r.type === 'vibration');
  
  // Simular el proceso de guardado como en main.service.js
  for (const reading of vibrationReadings) {
    // Asignar sensor_id como lo hace main.service.js
    reading.data.sensor_id = result.sensors[0].id;
    
    // Simular el guardado
    await mockDbService.saveVibrationReading(reading.data);
    
    // Simular un pequeño delay como podría ocurrir en operaciones reales
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  
  console.log('3. Análisis de datos insertados en la base de datos:');
  console.log('====================================================');
  
  const insertedData = mockDbService.getInsertedData();
  
  if (insertedData.length === 0) {
    console.log('❌ No se insertaron datos en la base de datos');
    return;
  }
  
  console.log(`Total de registros insertados: ${insertedData.length}\n`);
  
  // Verificar consistencia de timestamps
  const uniqueTimestamps = new Set();
  const uniqueInsertTimes = new Set();
  
  insertedData.forEach((data, index) => {
    console.log(`Registro ${index + 1} (Eje ${data.axis}):`);
    console.log(`  - Timestamp del dato: ${data.timestamp}`);
    console.log(`  - Tiempo de inserción: ${data.insertTime}`);
    console.log(`  - ¿Timestamp correcto?: ${data.timestamp === specificTimestamp ? '✅' : '❌'}`);
    
    uniqueTimestamps.add(data.timestamp);
    uniqueInsertTimes.add(data.insertTime);
    console.log('');
  });
  
  console.log('4. Resumen de consistencia:');
  console.log('===========================');
  console.log(`Timestamps únicos en los datos: ${uniqueTimestamps.size}`);
  console.log(`Tiempos de inserción únicos: ${uniqueInsertTimes.size}`);
  
  if (uniqueTimestamps.size === 1) {
    const timestamp = Array.from(uniqueTimestamps)[0];
    console.log(`✅ CORRECTO: Todos los registros tienen el mismo timestamp: ${timestamp}`);
    console.log(`✅ CORRECTO: El timestamp coincide con el original del MQTT: ${timestamp === specificTimestamp ? 'SÍ' : 'NO'}`);
  } else {
    console.log('❌ PROBLEMA: Se encontraron timestamps diferentes en los datos:');
    uniqueTimestamps.forEach(ts => console.log(`  - ${ts}`));
  }
  
  if (uniqueInsertTimes.size > 1) {
    console.log(`ℹ️  INFORMACIÓN: Los tiempos de inserción son diferentes (normal en operaciones secuenciales)`);
    console.log(`   Diferencia máxima: ${Math.max(...Array.from(uniqueInsertTimes).map(t => new Date(t).getTime())) - Math.min(...Array.from(uniqueInsertTimes).map(t => new Date(t).getTime()))} ms`);
  }
  
  console.log('\n5. Test adicional: Múltiples payloads consecutivos');
  console.log('===================================================');
  
  mockDbService.clearInsertedData();
  
  // Simular 3 payloads consecutivos con timestamps diferentes
  const timestamps = [
    "2024-01-15T10:30:45.123Z",
    "2024-01-15T10:30:46.456Z", 
    "2024-01-15T10:30:47.789Z"
  ];
  
  for (let i = 0; i < timestamps.length; i++) {
    const payload = JSON.stringify({
      "Timestamp": timestamps[i],
      "Accelerometer": {
        "X-Axis": { "OAVelocity": 1.0 + i * 0.1 },
        "Y-Axis": { "OAVelocity": 1.1 + i * 0.1 },
        "Z-Axis": { "OAVelocity": 1.2 + i * 0.1 }
      }
    });
    
    console.log(`\nProcesando payload ${i + 1} con timestamp: ${timestamps[i]}`);
    
    const result = await payloadService.processPayload('TEST001', payload);
    if (result.success) {
      const vibReadings = result.readings.filter(r => r.type === 'vibration');
      for (const reading of vibReadings) {
        reading.data.sensor_id = result.sensors[0].id;
        await mockDbService.saveVibrationReading(reading.data);
      }
    }
  }
  
  const allInsertedData = mockDbService.getInsertedData();
  console.log(`\nTotal de registros insertados en múltiples payloads: ${allInsertedData.length}`);
  
  // Agrupar por timestamp original
  const groupedByTimestamp = {};
  allInsertedData.forEach(data => {
    if (!groupedByTimestamp[data.timestamp]) {
      groupedByTimestamp[data.timestamp] = [];
    }
    groupedByTimestamp[data.timestamp].push(data);
  });
  
  console.log(`Grupos de timestamp únicos: ${Object.keys(groupedByTimestamp).length}`);
  
  Object.keys(groupedByTimestamp).forEach(timestamp => {
    const group = groupedByTimestamp[timestamp];
    console.log(`\nTimestamp ${timestamp}: ${group.length} registros`);
    const axes = group.map(g => g.axis).sort();
    console.log(`  Ejes: ${axes.join(', ')}`);
    console.log(`  ¿Todos los ejes presentes?: ${axes.length === 3 && axes.includes('X') && axes.includes('Y') && axes.includes('Z') ? '✅' : '❌'}`);
  });
  
  console.log('\n=== FIN DEL TEST ===');
}

// Ejecutar el test
testDatabaseTimestampConsistency().catch(console.error);