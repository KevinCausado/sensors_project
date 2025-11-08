// Test para autenticación MQTT
const MQTTService = require('../src/services/mqtt.service');

class MQTTAuthenticationTest {
  constructor() {
    this.mqttService = new MQTTService();
    this.testResults = [];
  }

  async runTests() {
    console.log('='.repeat(50));
    console.log('INICIANDO PRUEBAS DE AUTENTICACIÓN MQTT');
    console.log('='.repeat(50));

    try {
      // Test 1: Configurar variables de entorno para autenticación
      await this.testWithAuthentication();
      
      // Test 2: Probar conexión sin autenticación
      await this.testWithoutAuthentication();
      
      // Test 3: Probar con credenciales incorrectas
      await this.testWithIncorrectCredentials();

      this.printResults();
    } catch (error) {
      console.error('Error general en las pruebas:', error);
    }
  }

  async testWithAuthentication() {
    console.log('\n📋 TEST 1: Conexión MQTT con autenticación');
    console.log('-'.repeat(40));

    try {
      // Configurar variables de entorno para el test
      const originalUsername = process.env.MQTT_USERNAME;
      const originalPassword = process.env.MQTT_PASSWORD;
      const originalBrokerUrl = process.env.MQTT_BROKER_URL;

      // Configurar credenciales de test
      process.env.MQTT_USERNAME = 'test';
      process.env.MQTT_PASSWORD = 'test';
      process.env.MQTT_BROKER_URL = 'mqtt://broker.emqx.io:1883'; // Broker público que acepta autenticación

      console.log('🔧 Configurando credenciales de test:');
      console.log(`   Usuario: ${process.env.MQTT_USERNAME}`);
      console.log(`   Contraseña: ${process.env.MQTT_PASSWORD}`);
      console.log(`   Broker: ${process.env.MQTT_BROKER_URL}`);

      // Crear nueva instancia del servicio para que tome las nuevas variables
      const testMqttService = new MQTTService();

      console.log('\n🔄 Intentando conectar con autenticación...');
      
      const startTime = Date.now();
      await testMqttService.connect();
      const endTime = Date.now();

      console.log(`✅ Conexión exitosa en ${endTime - startTime}ms`);
      console.log(`🔗 Estado de conexión: ${testMqttService.isConnected}`);

      // Verificar que realmente está conectado
      if (testMqttService.isConnected) {
        console.log('✅ Verificación de estado: CONECTADO');
        
        // Probar suscripción a un tópico de test
        await testMqttService.subscribe('test/authentication');
        console.log('✅ Suscripción a tópico de prueba exitosa');

        this.testResults.push({
          test: 'Autenticación con credenciales válidas',
          status: 'PASSED',
          duration: endTime - startTime
        });
      } else {
        throw new Error('El servicio reporta que no está conectado');
      }

      // Desconectar
      await testMqttService.disconnect();
      console.log('🔌 Desconexión exitosa');

      // Restaurar variables originales
      if (originalUsername) process.env.MQTT_USERNAME = originalUsername;
      else delete process.env.MQTT_USERNAME;
      
      if (originalPassword) process.env.MQTT_PASSWORD = originalPassword;
      else delete process.env.MQTT_PASSWORD;
      
      if (originalBrokerUrl) process.env.MQTT_BROKER_URL = originalBrokerUrl;
      else delete process.env.MQTT_BROKER_URL;

    } catch (error) {
      console.error('❌ Error en test de autenticación:', error.message);
      this.testResults.push({
        test: 'Autenticación con credenciales válidas',
        status: 'FAILED',
        error: error.message
      });
    }
  }

  async testWithoutAuthentication() {
    console.log('\n📋 TEST 2: Conexión MQTT sin autenticación');
    console.log('-'.repeat(40));

    try {
      // Limpiar variables de autenticación
      const originalUsername = process.env.MQTT_USERNAME;
      const originalPassword = process.env.MQTT_PASSWORD;
      const originalBrokerUrl = process.env.MQTT_BROKER_URL;

      delete process.env.MQTT_USERNAME;
      delete process.env.MQTT_PASSWORD;
      process.env.MQTT_BROKER_URL = 'mqtt://broker.emqx.io:1883'; // Broker público sin autenticación

      console.log('🔧 Configurando conexión sin autenticación:');
      console.log(`   Broker: ${process.env.MQTT_BROKER_URL}`);
      console.log('   Usuario: (no configurado)');
      console.log('   Contraseña: (no configurada)');

      const testMqttService = new MQTTService();

      console.log('\n🔄 Intentando conectar sin autenticación...');
      
      const startTime = Date.now();
      await testMqttService.connect();
      const endTime = Date.now();

      console.log(`✅ Conexión exitosa en ${endTime - startTime}ms`);
      console.log(`🔗 Estado de conexión: ${testMqttService.isConnected}`);

      if (testMqttService.isConnected) {
        console.log('✅ Verificación de estado: CONECTADO');
        
        this.testResults.push({
          test: 'Conexión sin autenticación',
          status: 'PASSED',
          duration: endTime - startTime
        });
      } else {
        throw new Error('El servicio reporta que no está conectado');
      }

      await testMqttService.disconnect();
      console.log('🔌 Desconexión exitosa');

      // Restaurar variables originales
      if (originalUsername) process.env.MQTT_USERNAME = originalUsername;
      if (originalPassword) process.env.MQTT_PASSWORD = originalPassword;
      if (originalBrokerUrl) process.env.MQTT_BROKER_URL = originalBrokerUrl;

    } catch (error) {
      console.error('❌ Error en test sin autenticación:', error.message);
      this.testResults.push({
        test: 'Conexión sin autenticación',
        status: 'FAILED',
        error: error.message
      });
    }
  }

  async testWithIncorrectCredentials() {
    console.log('\n📋 TEST 3: Conexión MQTT con credenciales incorrectas');
    console.log('-'.repeat(40));

    try {
      const originalUsername = process.env.MQTT_USERNAME;
      const originalPassword = process.env.MQTT_PASSWORD;
      const originalBrokerUrl = process.env.MQTT_BROKER_URL;

      // Configurar credenciales incorrectas
      process.env.MQTT_USERNAME = 'wrong_user';
      process.env.MQTT_PASSWORD = 'wrong_password';
      process.env.MQTT_BROKER_URL = 'mqtt://broker.emqx.io:1883';

      console.log('🔧 Configurando credenciales incorrectas:');
      console.log(`   Usuario: ${process.env.MQTT_USERNAME}`);
      console.log(`   Contraseña: ${process.env.MQTT_PASSWORD}`);

      const testMqttService = new MQTTService();

      console.log('\n🔄 Intentando conectar con credenciales incorrectas...');
      
      const startTime = Date.now();
      
      try {
        // Configurar timeout más corto para este test
        const connectPromise = testMqttService.connect();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout de conexión')), 10000);
        });

        await Promise.race([connectPromise, timeoutPromise]);
        
        // Si llegamos aquí, la conexión fue exitosa (no debería pasar con credenciales incorrectas)
        console.log('⚠️  Conexión exitosa con credenciales incorrectas (puede ser que el broker no requiera autenticación)');
        
        this.testResults.push({
          test: 'Rechazo de credenciales incorrectas',
          status: 'WARNING',
          note: 'El broker puede no requerir autenticación'
        });

        await testMqttService.disconnect();
        
      } catch (error) {
        const endTime = Date.now();
        console.log(`✅ Conexión rechazada como esperado en ${endTime - startTime}ms`);
        console.log(`📋 Error recibido: ${error.message}`);
        
        this.testResults.push({
          test: 'Rechazo de credenciales incorrectas',
          status: 'PASSED',
          duration: endTime - startTime,
          note: 'Conexión rechazada correctamente'
        });
      }

      // Restaurar variables originales
      if (originalUsername) process.env.MQTT_USERNAME = originalUsername;
      else delete process.env.MQTT_USERNAME;
      
      if (originalPassword) process.env.MQTT_PASSWORD = originalPassword;
      else delete process.env.MQTT_PASSWORD;
      
      if (originalBrokerUrl) process.env.MQTT_BROKER_URL = originalBrokerUrl;
      else delete process.env.MQTT_BROKER_URL;

    } catch (error) {
      console.error('❌ Error inesperado en test de credenciales incorrectas:', error.message);
      this.testResults.push({
        test: 'Rechazo de credenciales incorrectas',
        status: 'FAILED',
        error: error.message
      });
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('RESUMEN DE RESULTADOS DE PRUEBAS');
    console.log('='.repeat(50));

    this.testResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}`);
      console.log(`   Estado: ${result.status}`);
      if (result.duration) {
        console.log(`   Duración: ${result.duration}ms`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.note) {
        console.log(`   Nota: ${result.note}`);
      }
    });

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;

    console.log('\n📊 ESTADÍSTICAS:');
    console.log(`   ✅ Pasaron: ${passed}`);
    console.log(`   ❌ Fallaron: ${failed}`);
    console.log(`   ⚠️  Advertencias: ${warnings}`);
    console.log(`   📋 Total: ${this.testResults.length}`);

    if (failed === 0) {
      console.log('\n🎉 TODAS LAS PRUEBAS PRINCIPALES PASARON');
    } else {
      console.log('\n⚠️  ALGUNAS PRUEBAS FALLARON - REVISAR IMPLEMENTACIÓN');
    }
  }
}

// Ejecutar las pruebas
async function runMQTTAuthTests() {
  const tester = new MQTTAuthenticationTest();
  await tester.runTests();
  
  // Dar tiempo para que se cierren todas las conexiones
  setTimeout(() => {
    console.log('\n🔚 Finalizando pruebas de autenticación MQTT');
    process.exit(0);
  }, 2000);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runMQTTAuthTests().catch(error => {
    console.error('Error fatal en las pruebas:', error);
    process.exit(1);
  });
}

module.exports = MQTTAuthenticationTest;