// Script de prueba para verificar la escritura completa de temperaturas en la base de datos
const MainService = require('../src/main.service.js');

async function testTemperatureWriteToDatabase() {
  console.log('🧪 PRUEBA DE ESCRITURA DE TEMPERATURA EN BASE DE DATOS');
  console.log('====================================================');

  let mainService;
  
  try {
    // Inicializar el servicio principal
    console.log('\n🔧 Inicializando servicios...');
    mainService = new MainService();
    await mainService.start();
    
    // Esperar un momento para que se establezcan las conexiones
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar estado de conexiones
    const status = mainService.getStatus();
    console.log('\n📊 Estado de servicios:');
    console.log(`   MQTT conectado: ${status.mqttConnected}`);
    console.log(`   Base de datos conectada: ${status.databaseConnected}`);
    
    if (!status.databaseConnected) {
      console.error('❌ Base de datos no conectada. Abortando prueba.');
      return;
    }

    // Simular un mensaje MQTT con temperatura
    const testTopic = 'Advantech/WISE6610/data';
    const testPayload = JSON.stringify({
      "SequenceNumber": 999,
      "Timestamp": new Date().toISOString(),
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
        "Time": new Date().toISOString()
      }
    });

    console.log('\n📨 Simulando mensaje MQTT con temperatura...');
    console.log(`   Tópico: ${testTopic}`);
    console.log(`   TempHumi en payload: 25500 (255.00°C)`);
    
    // Procesar el mensaje simulado
    console.log('\n🔄 Procesando mensaje...');
    await mainService.handleMqttMessage(testTopic, Buffer.from(testPayload));
    
    console.log('\n✅ Procesamiento completado');
    console.log('\n📝 Revisa los logs arriba para verificar:');
    console.log('   1. 🌡️ Detección de lectura de temperatura');
    console.log('   2. 🌡️ Procesamiento de temperatura');
    console.log('   3. 🌡️ Datos a insertar en DB');
    console.log('   4. ✅ Lectura de temperatura guardada exitosamente');
    console.log('   5. 🌡️ Análisis de temperatura completado');

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Limpiar recursos
    if (mainService) {
      try {
        await mainService.stop();
        console.log('\n🛑 Servicios detenidos');
      } catch (stopError) {
        console.error('Error al detener servicios:', stopError.message);
      }
    }
  }
}

// Ejecutar la prueba
testTemperatureWriteToDatabase();