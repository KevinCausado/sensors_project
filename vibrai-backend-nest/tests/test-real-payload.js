const PayloadService = require('./src/services/payload.service');

// Payload MQTT real del sistema
const realMqttPayload = {
  "TempHumi": {
    "Range": 0,
    "Status": 0,
    "Event": 0,
    "SenVal": 25875
  },
  "Accelerometer": {
    "X-Axis": {
      "SenEvent": 1,
      "OAVelocity": 5,
      "Peakmg": 5,
      "RMSmg": 4,
      "Kurtosis": -20,
      "CrestFactor": 623,
      "Skewness": 21,
      "Deviation": 0,
      "Peak-to-Peak_Displacement": 1
    },
    "Y-Axis": {
      "SenEvent": 1,
      "OAVelocity": 5,
      "Peakmg": 4,
      "RMSmg": 3,
      "Kurtosis": 13,
      "CrestFactor": 725,
      "Skewness": 20,
      "Deviation": 0,
      "Peak-to-Peak_Displacement": 1
    },
    "Z-Axis": {
      "SenEvent": 1,
      "OAVelocity": 5,
      "Peakmg": 5,
      "RMSmg": 4,
      "Kurtosis": -14,
      "CrestFactor": 723,
      "Skewness": 7,
      "Deviation": 0,
      "Peak-to-Peak_Displacement": 1
    },
    "LogIndex": 25579,
    "Timestamp": 1754682313
  },
  "Device": {
    "Events": 0,
    "PowerSrc": 1,
    "BatteryVolt": 0,
    "Time": 1754682314
  }
};

console.log('🧪 PROBANDO PAYLOAD MQTT REAL');
console.log('=====================================\n');

try {
  // Simular el procesamiento del payload
  const payloadService = new PayloadService();
  const extractedReadings = payloadService.extractSensorReadings(realMqttPayload);
  
  console.log('📊 Lecturas extraídas:', extractedReadings.length);
  
  extractedReadings.forEach((reading, index) => {
    console.log(`\n   📈 Lectura ${index + 1} - Eje ${reading.axis}:`);
    console.log('      Métricas disponibles:', Object.keys(reading.data).filter(key => !['sensor_id', 'axis', 'timestamp'].includes(key)));
    
    if (reading.data.peak_to_peak_displacement !== undefined) {
      console.log(`      ✅ Peak-to-Peak_Displacement: ${reading.data.peak_to_peak_displacement}`);
    } else {
      console.log('      ❌ Peak-to-Peak_Displacement: NO ENCONTRADO');
    }
    
    console.log('      Datos completos:', JSON.stringify(reading.data, null, 2));
  });
  
  console.log('\n=== PRUEBA COMPLETADA ===');
  
} catch (error) {
  console.error('❌ Error durante la prueba:', error.message);
  console.error(error.stack);
}