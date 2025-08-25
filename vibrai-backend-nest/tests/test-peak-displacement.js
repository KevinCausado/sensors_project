const PayloadService = require('./src/services/payload.service');

// Payload de prueba con Peak-to-Peak Displacement
const testPayload = {
  "SensorCode": "WISE6610",
  "Data": {
    "Accelerometer": {
      "X-Axis": { 
        "SenEvent": 1, 
        "OAVelocity": 3.5, 
        "Peak": 4.95, 
        "RMS": 3.5, 
        "Kurtosis": 3.0, 
        "CrestFactor": 1.41, 
        "Skewness": 0.1, 
        "Deviation": 0.08, 
        "Peak-to-Peak Displacement": 0.9 
      },
      "Y-Axis": { 
        "SenEvent": 1, 
        "OAVelocity": 2.1, 
        "Peak": 2.97, 
        "RMS": 2.1, 
        "Kurtosis": 3.1, 
        "CrestFactor": 1.41, 
        "Skewness": -0.05, 
        "Deviation": 0.06, 
        "Peak-to-Peak Displacement": 0.6 
      },
      "Z-Axis": { 
        "SenEvent": 1, 
        "OAVelocity": 2.8, 
        "Peak": 3.96, 
        "RMS": 2.8, 
        "Kurtosis": 3.2, 
        "CrestFactor": 1.41, 
        "Skewness": 0.08, 
        "Deviation": 0.07, 
        "Peak-to-Peak Displacement": 0.7 
      }
    },
    "Temperature": { "Value": 25.5 },
    "DeviceStatus": { "BatteryVolt": 4.1 }
  }
};

console.log('=== PRUEBA DE EXTRACCIÓN DE Peak-to-Peak Displacement ===\n');

const payloadService = new PayloadService();

// Extraer lecturas del payload
const readings = payloadService.extractSensorReadings(testPayload.Data);

console.log('Lecturas extraídas:');
readings.forEach((reading, index) => {
  console.log(`\n${index + 1}. Tipo: ${reading.type}, Eje: ${reading.axis || 'N/A'}`);
  if (reading.type === 'vibration') {
    console.log('   Datos de vibración:');
    console.log('   - OAVelocity:', reading.data.oavelocity);
    console.log('   - Peak:', reading.data.peak);
    console.log('   - RMS:', reading.data.rms);
    console.log('   - Kurtosis:', reading.data.kurtosis);
    console.log('   - CrestFactor:', reading.data.crestfactor);
    console.log('   - Skewness:', reading.data.skewness);
    console.log('   - Deviation:', reading.data.deviation);
    console.log('   - Peak-to-Peak Displacement:', reading.data.peak_to_peak_displacement);
    
    if (reading.data.peak_to_peak_displacement !== undefined) {
      console.log('   ✅ Peak-to-Peak Displacement ENCONTRADO');
    } else {
      console.log('   ❌ Peak-to-Peak Displacement NO ENCONTRADO');
    }
  }
});

console.log('\n=== FIN DE LA PRUEBA ===');