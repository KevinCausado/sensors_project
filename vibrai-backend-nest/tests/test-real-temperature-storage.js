// Prueba integral: Arrancar aplicación y validar almacenamiento de datos reales de temperatura
const MainService = require('../src/main.service.js');
const DatabaseService = require('../src/services/database.service.js');

class TemperatureStorageValidator {
  constructor() {
    this.mainService = null;
    this.databaseService = null;
    this.initialCount = 0;
    this.targetCount = 5;
    this.maxWaitTime = 300000; // 5 minutos máximo
    this.checkInterval = 10000; // Verificar cada 10 segundos
  }

  async initialize() {
    console.log('🚀 PRUEBA INTEGRAL DE ALMACENAMIENTO DE TEMPERATURA');
    console.log('==================================================');
    
    try {
      // Inicializar servicios
      console.log('\n🔧 Inicializando servicios...');
      this.mainService = new MainService();
      this.databaseService = new DatabaseService();
      
      await this.databaseService.initialize();
      console.log('✅ DatabaseService inicializado');
      
      // Obtener conteo inicial
      await this.getInitialCount();
      
      // Arrancar la aplicación principal
      console.log('\n🚀 Arrancando aplicación principal...');
      await this.mainService.start();
      
      // Esperar un momento para que se establezcan las conexiones
      await this.sleep(3000);
      
      // Verificar estado de conexiones
      const status = this.mainService.getStatus();
      console.log('\n📊 Estado de servicios:');
      console.log(`   ✅ Aplicación corriendo: ${status.isRunning}`);
      console.log(`   ✅ MQTT conectado: ${status.mqttConnected}`);
      console.log(`   ✅ Base de datos conectada: ${status.databaseConnected}`);
      
      if (!status.databaseConnected) {
        throw new Error('Base de datos no conectada');
      }
      
      if (!status.mqttConnected) {
        console.log('⚠️ MQTT no conectado - Los datos pueden no llegar automáticamente');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error en inicialización:', error.message);
      throw error;
    }
  }

  async getInitialCount() {
    try {
      const { data, error } = await this.databaseService.client
        .from('temperature_readings')
        .select('id', { count: 'exact' });
      
      if (error) {
        throw new Error(`Error al obtener conteo inicial: ${error.message}`);
      }
      
      this.initialCount = data?.length || 0;
      console.log(`📊 Conteo inicial de registros de temperatura: ${this.initialCount}`);
      
    } catch (error) {
      console.error('❌ Error al obtener conteo inicial:', error.message);
      this.initialCount = 0;
    }
  }

  async getCurrentCount() {
    try {
      const { data, error } = await this.databaseService.client
        .from('temperature_readings')
        .select('id', { count: 'exact' });
      
      if (error) {
        throw new Error(`Error al obtener conteo actual: ${error.message}`);
      }
      
      return data?.length || 0;
    } catch (error) {
      console.error('❌ Error al obtener conteo actual:', error.message);
      return this.initialCount;
    }
  }

  async getRecentTemperatureData(limit = 5) {
    try {
      const { data, error } = await this.databaseService.client
        .from('temperature_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw new Error(`Error al obtener datos recientes: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error al obtener datos recientes:', error.message);
      return [];
    }
  }

  async monitorTemperatureStorage() {
    console.log(`\n🔍 MONITOREANDO ALMACENAMIENTO DE TEMPERATURA`);
    console.log(`📋 Objetivo: Almacenar al menos ${this.targetCount} nuevos registros`);
    console.log(`⏱️ Tiempo máximo de espera: ${this.maxWaitTime / 1000} segundos`);
    console.log(`🔄 Verificando cada ${this.checkInterval / 1000} segundos`);
    console.log('=====================================');

    const startTime = Date.now();
    let checkCount = 0;
    
    while (Date.now() - startTime < this.maxWaitTime) {
      checkCount++;
      const currentCount = await this.getCurrentCount();
      const newRecords = currentCount - this.initialCount;
      
      console.log(`\n📊 Verificación #${checkCount} (${new Date().toLocaleTimeString()})`);
      console.log(`   📈 Registros iniciales: ${this.initialCount}`);
      console.log(`   📈 Registros actuales: ${currentCount}`);
      console.log(`   🆕 Nuevos registros: ${newRecords}`);
      console.log(`   🎯 Objetivo: ${this.targetCount} registros`);
      
      if (newRecords >= this.targetCount) {
        console.log(`\n🎉 ¡OBJETIVO ALCANZADO! Se han almacenado ${newRecords} nuevos registros de temperatura`);
        
        // Mostrar los datos más recientes
        const recentData = await this.getRecentTemperatureData(this.targetCount);
        console.log(`\n🌡️ ÚLTIMOS ${this.targetCount} REGISTROS DE TEMPERATURA:`);
        console.log('==========================================');
        
        recentData.forEach((record, index) => {
          const date = new Date(record.timestamp);
          console.log(`\n${index + 1}. ID: ${record.id.substring(0, 8)}...`);
          console.log(`   🌡️ Valor: ${record.value}°C`);
          console.log(`   📅 Timestamp: ${date.toLocaleString('es-ES', { 
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}`);
          console.log(`   🆔 Sensor: ${record.sensor_id.substring(0, 8)}...`);
        });
        
        return true;
      }
      
      // Mostrar progreso
      const progress = Math.min((newRecords / this.targetCount) * 100, 100);
      const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
      console.log(`   📊 Progreso: [${progressBar}] ${progress.toFixed(1)}%`);
      
      // Esperar antes de la siguiente verificación
      console.log(`   ⏳ Esperando ${this.checkInterval / 1000} segundos para la siguiente verificación...`);
      await this.sleep(this.checkInterval);
    }
    
    // Tiempo agotado
    const finalCount = await this.getCurrentCount();
    const finalNewRecords = finalCount - this.initialCount;
    
    console.log(`\n⏰ TIEMPO AGOTADO después de ${this.maxWaitTime / 1000} segundos`);
    console.log(`📊 Registros finales almacenados: ${finalNewRecords}`);
    
    if (finalNewRecords > 0) {
      console.log(`✅ Se almacenaron ${finalNewRecords} registros, pero no se alcanzó el objetivo de ${this.targetCount}`);
      return false;
    } else {
      console.log(`❌ No se almacenaron nuevos registros de temperatura`);
      return false;
    }
  }

  async cleanup() {
    console.log('\n🧹 Limpiando recursos...');
    
    if (this.mainService) {
      try {
        await this.mainService.stop();
        console.log('✅ MainService detenido');
      } catch (error) {
        console.error('❌ Error al detener MainService:', error.message);
      }
    }
    
    console.log('✅ Limpieza completada');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Función principal de prueba
async function runTemperatureStorageTest() {
  const validator = new TemperatureStorageValidator();
  
  try {
    // Inicializar
    await validator.initialize();
    
    // Monitorear almacenamiento
    const success = await validator.monitorTemperatureStorage();
    
    // Resultado final
    console.log('\n🏁 RESULTADO FINAL DE LA PRUEBA');
    console.log('===============================');
    
    if (success) {
      console.log('🎉 ✅ PRUEBA EXITOSA: Los datos de temperatura se están almacenando correctamente');
      console.log('📊 Se confirmó el almacenamiento de al menos 5 registros nuevos');
      console.log('🔄 El sistema está funcionando en tiempo real');
    } else {
      console.log('⚠️ ❌ PRUEBA FALLIDA: No se alcanzó el objetivo de almacenamiento');
      console.log('🔍 Posibles causas:');
      console.log('   - No hay datos MQTT llegando');
      console.log('   - Problemas de conectividad');
      console.log('   - Configuración de sensores');
      console.log('   - Tiempo de espera insuficiente');
    }
    
  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO EN LA PRUEBA:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await validator.cleanup();
  }
}

// Ejecutar la prueba
console.log('🧪 Iniciando prueba integral de almacenamiento de temperatura...');
runTemperatureStorageTest();