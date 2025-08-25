// Test para verificar si temperatura y vibración se procesan simultáneamente
const MainService = require('../src/main.service');
const DatabaseService = require('../src/services/database.service');
const MqttService = require('../src/services/mqtt.service');
const PayloadService = require('../src/services/payload.service');
const AnalysisService = require('../src/services/analysis.service');
const AlertService = require('../src/services/alert.service');
const ConnectivityService = require('../src/services/connectivity.service');
const DeviceService = require('../src/services/device.service');

async function testSimultaneousProcessing() {
  console.log('🔍 INICIANDO TEST DE PROCESAMIENTO SIMULTÁNEO');
  console.log('=' .repeat(60));

  try {
    // Inicializar servicios
    const databaseService = new DatabaseService();
    await databaseService.initialize();

    const mqttService = new MqttService();
    const payloadService = new PayloadService(databaseService);
    const analysisService = new AnalysisService(databaseService);
    const alertService = new AlertService(databaseService);
    const connectivityService = new ConnectivityService(databaseService);
    const deviceService = new DeviceService(databaseService);

    const mainService = new MainService(
      databaseService,
      mqttService,
      payloadService,
      analysisService,
      alertService,
      connectivityService,
      deviceService
    );

    // Payload de prueba que contiene TANTO vibración COMO temperatura
    const testPayload = {
      "Timestamp": new Date().toISOString(),
      "SequenceNumber": 12345,
      "Device": {
        "Events": 0,
        "PowerSource": "Battery",
        "BatteryVoltage": 3.7
      },
      "Accelerometer": {
        "X-Axis": {
          "OAVelocity": 2.5,
          "Peak": 1.2,
          "RMS": 0.8,
          "Kurtosis": 3.1,
          "CrestFactor": 1.5,
          "Skewness": 0.2,
          "Deviation": 0.6
        },
        "Y-Axis": {
          "OAVelocity": 3.1,
          "Peak": 1.5,
          "RMS": 1.0,
          "Kurtosis": 2.9,
          "CrestFactor": 1.6,
          "Skewness": 0.1,
          "Deviation": 0.7
        },
        "Z-Axis": {
          "OAVelocity": 1.8,
          "Peak": 0.9,
          "RMS": 0.6,
          "Kurtosis": 3.2,
          "CrestFactor": 1.4,
          "Skewness": 0.3,
          "Deviation": 0.5
        }
      },
      "TempHumi": 24500  // 24.5°C en formato de milésimas
    };

    console.log('\n📦 PAYLOAD DE PRUEBA:');
    console.log('- Contiene datos de vibración (3 ejes)');
    console.log('- Contiene datos de temperatura (24.5°C)');
    console.log('- Mismo timestamp para ambos tipos de datos');

    // Simular procesamiento del mensaje MQTT
    const topic = "vibrai/sensor/TEST001";
    const message = { toString: () => JSON.stringify(testPayload) };

    console.log('\n🚀 INICIANDO PROCESAMIENTO DEL MENSAJE...');
    console.log('=' .repeat(60));

    // Capturar logs para analizar el orden de procesamiento
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      const logMessage = args.join(' ');
      logs.push({
        timestamp: new Date().toISOString(),
        message: logMessage
      });
      originalLog(...args);
    };

    // Procesar el mensaje
    await mainService.handleMqttMessage(topic, message);

    // Restaurar console.log
    console.log = originalLog;

    console.log('\n📊 ANÁLISIS DE PROCESAMIENTO:');
    console.log('=' .repeat(60));

    // Analizar los logs para determinar el orden de procesamiento
    const vibrationLogs = logs.filter(log => 
      log.message.includes('vibración') || 
      log.message.includes('Accelerometer') ||
      log.message.includes('OAVelocity')
    );

    const temperatureLogs = logs.filter(log => 
      log.message.includes('temperatura') || 
      log.message.includes('TEMPERATURA') ||
      log.message.includes('TempHumi')
    );

    const groupingLogs = logs.filter(log => 
      log.message.includes('Agrupando lecturas') ||
      log.message.includes('groupReadingsByType') ||
      log.message.includes('Procesando grupo')
    );

    console.log(`\n🔍 LOGS DE VIBRACIÓN (${vibrationLogs.length}):`);
    vibrationLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. [${log.timestamp}] ${log.message}`);
    });

    console.log(`\n🌡️ LOGS DE TEMPERATURA (${temperatureLogs.length}):`);
    temperatureLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. [${log.timestamp}] ${log.message}`);
    });

    console.log(`\n📋 LOGS DE AGRUPACIÓN (${groupingLogs.length}):`);
    groupingLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. [${log.timestamp}] ${log.message}`);
    });

    // Determinar si el procesamiento es simultáneo
    console.log('\n🎯 CONCLUSIONES:');
    console.log('=' .repeat(60));

    if (vibrationLogs.length > 0 && temperatureLogs.length > 0) {
      const firstVibrationTime = new Date(vibrationLogs[0].timestamp);
      const firstTemperatureTime = new Date(temperatureLogs[0].timestamp);
      const timeDifference = Math.abs(firstVibrationTime - firstTemperatureTime);

      console.log(`✅ AMBOS TIPOS DE DATOS FUERON PROCESADOS`);
      console.log(`📅 Primer log de vibración: ${vibrationLogs[0].timestamp}`);
      console.log(`🌡️ Primer log de temperatura: ${temperatureLogs[0].timestamp}`);
      console.log(`⏱️ Diferencia de tiempo: ${timeDifference}ms`);

      if (timeDifference < 1000) { // Menos de 1 segundo
        console.log(`🎉 PROCESAMIENTO SIMULTÁNEO CONFIRMADO`);
        console.log(`   Los datos se procesaron en el mismo ciclo de ejecución`);
      } else {
        console.log(`⚠️ PROCESAMIENTO SECUENCIAL DETECTADO`);
        console.log(`   Hay una diferencia significativa en los tiempos`);
      }

      // Verificar si están en el mismo grupo de procesamiento
      const sameGroupLogs = logs.filter(log => 
        log.message.includes('Procesando grupo de lecturas') &&
        (log.message.includes('vibration') || log.message.includes('temperature'))
      );

      if (sameGroupLogs.length > 1) {
        console.log(`📦 GRUPOS DE PROCESAMIENTO SEPARADOS:`);
        sameGroupLogs.forEach(log => {
          console.log(`   - ${log.message}`);
        });
        console.log(`   ➡️ Los datos se agrupan por tipo y se procesan en grupos separados`);
      }

    } else {
      console.log(`❌ ERROR: No se detectaron logs de ambos tipos de datos`);
      console.log(`   Vibración: ${vibrationLogs.length} logs`);
      console.log(`   Temperatura: ${temperatureLogs.length} logs`);
    }

    console.log('\n📋 RESUMEN TÉCNICO:');
    console.log('=' .repeat(60));
    console.log('1. Los datos llegan en el MISMO mensaje MQTT');
    console.log('2. Se extraen SIMULTÁNEAMENTE del payload');
    console.log('3. Se agrupan por TIPO (vibration vs temperature)');
    console.log('4. Se procesan en GRUPOS SEPARADOS pero en la misma ejecución');
    console.log('5. Cada tipo tiene su propio flujo de guardado y análisis');

  } catch (error) {
    console.error('❌ Error en el test:', error.message);
    console.error(error.stack);
  }

  console.log('\n✅ TEST COMPLETADO');
}

// Ejecutar el test
testSimultaneousProcessing().catch(console.error);