const PayloadService = require('./src/services/payload.service');
const MainService = require('./src/main.service');

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

// Sensor de prueba
const testSensor = {
  id: '43199abb-54a2-4432-847f-fa8f10cfa16f',
  name: 'Sensor de Vibracion',
  type: 'vibration',
  code: 'WISE6610'
};

async function testCompleteProcessing() {
  console.log('=== PRUEBA COMPLETA DE PROCESAMIENTO CON Peak-to-Peak Displacement ===\n');

  try {
    const payloadService = new PayloadService();
    const mainService = new MainService();

    // Simular inicialización básica
    mainService.databaseService = {
      saveVibrationReading: async (data) => {
        console.log('[DATABASE] Simulando guardado de lectura de vibración:');
        console.log('   Datos:', JSON.stringify(data, null, 2));
        
        // Verificar si peak_to_peak_displacement está presente
        if (data.peak_to_peak_displacement !== undefined) {
          console.log('   ✅ Peak-to-Peak Displacement PRESENTE:', data.peak_to_peak_displacement);
        } else {
          console.log('   ❌ Peak-to-Peak Displacement AUSENTE');
        }
        
        return { success: true };
      },
      updateSensorLastReading: async () => ({ success: true })
    };

    mainService.analysisService = {
      processAndAnalyzeVibrationReading: async () => ({ finalStatus: 'Normal' })
    };

    mainService.alertService = {
      manageAlerts: async () => ({ success: true })
    };

    // 1. Extraer lecturas del payload
    console.log('1. Extrayendo lecturas del payload...');
    const readings = payloadService.extractSensorReadings(testPayload.Data);
    console.log(`   ✅ ${readings.length} lecturas extraídas\n`);

    // 2. Filtrar lecturas válidas
    console.log('2. Filtrando lecturas válidas...');
    const validReadings = payloadService.filterValidReadings(readings);
    console.log(`   ✅ ${validReadings.length} lecturas válidas\n`);

    // 3. Agrupar lecturas por tipo
    console.log('3. Agrupando lecturas por tipo...');
    const groupedReadings = payloadService.groupReadingsByType(validReadings);
    console.log(`   ✅ Grupos creados:`, Object.keys(groupedReadings), '\n');

    // 4. Procesar cada grupo
    console.log('4. Procesando grupos de lecturas...');
    for (const [type, typeReadings] of Object.entries(groupedReadings)) {
      console.log(`\n   Procesando tipo: ${type} (${typeReadings.length} lecturas)`);
      
      if (type === 'vibration') {
        console.log('   📊 Procesando lecturas de vibración...');
        
        for (const reading of typeReadings) {
          console.log(`\n   🔧 Procesando lectura de vibración - Eje ${reading.axis}:`);
          console.log('      Métricas disponibles:', Object.keys(reading.data).filter(k => k !== 'sensor_id' && k !== 'axis' && k !== 'timestamp'));
          
          // Verificar peak_to_peak_displacement específicamente
          if (reading.data.peak_to_peak_displacement !== undefined) {
            console.log(`      ✅ Peak-to-Peak Displacement: ${reading.data.peak_to_peak_displacement} μm`);
          } else {
            console.log('      ❌ Peak-to-Peak Displacement: NO ENCONTRADO');
          }
          
          // Simular guardado
          await mainService.saveVibrationReading(testSensor, reading);
        }
      }
    }

    console.log('\n=== PRUEBA COMPLETADA EXITOSAMENTE ===');

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Ejecutar la prueba
testCompleteProcessing();