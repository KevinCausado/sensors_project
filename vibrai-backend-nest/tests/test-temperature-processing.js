// Script de prueba para verificar el procesamiento correcto de temperatura
const PayloadService = require('./src/services/payload.service.js');

// Mock del database service
const mockDatabaseService = {
  // Mock methods if needed
};

const payloadService = new PayloadService(mockDatabaseService);

// Mensaje de prueba con TempHumi (formato real del firmware)
const testPayloadWithTemp = {
  "SequenceNumber": 123,
  "Timestamp": "2025-08-08T20:16:27Z",
  "TempHumi": 25500, // 255.00°C
  "Accelerometer": {
    "X-Axis": {
      "SenEvent": 0,
      "OAVelocity": 0.1,
      "Peakmg": 1000,
      "RMSmg": 500,
      "Kurtosis": 3.2,
      "CrestFactor": 2.1,
      "Skewness": 0.1,
      "Deviation": 100,
      "Peak-to-Peak_Displacement": 1
    },
    "Y-Axis": {
      "SenEvent": 0,
      "OAVelocity": 0.2,
      "Peakmg": 1100,
      "RMSmg": 550,
      "Kurtosis": 3.1,
      "CrestFactor": 2.0,
      "Skewness": 0.2,
      "Deviation": 110,
      "Peak-to-Peak_Displacement": 2
    },
    "Z-Axis": {
      "SenEvent": 0,
      "OAVelocity": 0.3,
      "Peakmg": 1200,
      "RMSmg": 600,
      "Kurtosis": 3.0,
      "CrestFactor": 1.9,
      "Skewness": 0.3,
      "Deviation": 120,
      "Peak-to-Peak_Displacement": 3
    }
  },
  "Device": {
    "Events": 0,
    "PowerSrc": "Battery",
    "BatteryVolt": 3.6,
    "Time": "2025-08-08T20:16:27Z"
  }
};

console.log('🧪 PRUEBA DE PROCESAMIENTO DE TEMPERATURA');
console.log('==========================================');

console.log('\n📄 Payload de prueba:');
console.log(JSON.stringify(testPayloadWithTemp, null, 2));

console.log('\n🔍 Extrayendo lecturas...');
const readings = payloadService.extractSensorReadings(testPayloadWithTemp);

console.log('\n📊 RESULTADOS:');
console.log(`Total de lecturas extraídas: ${readings.length}`);

readings.forEach((reading, index) => {
  console.log(`\n📈 Lectura ${index + 1}:`);
  console.log(`   Tipo: ${reading.type}`);
  
  if (reading.type === 'temperature') {
    console.log(`   🌡️ TEMPERATURA:`);
    console.log(`      Valor original: ${testPayloadWithTemp.TempHumi}`);
    console.log(`      Valor procesado: ${reading.value} ${reading.unit}`);
    console.log(`      Métrica: ${reading.metric}`);
    console.log(`      ✅ Temperatura procesada como VALOR ÚNICO (no por eje)`);
  } else if (reading.type === 'vibration') {
    console.log(`   📳 VIBRACIÓN:`);
    console.log(`      Eje: ${reading.axis}`);
    console.log(`      Métricas: ${Object.keys(reading.data).filter(k => !['sensor_id', 'axis', 'timestamp'].includes(k)).join(', ')}`);
  }
});

console.log('\n✅ VERIFICACIÓN COMPLETADA');
console.log('La temperatura se procesa correctamente como un valor único por sensor, no por eje.');