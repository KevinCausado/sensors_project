// Script para verificar que los datos de temperatura están almacenados en la base de datos
const DatabaseService = require('../src/services/database.service.js');

async function verifyTemperatureData() {
  console.log('🔍 VERIFICACIÓN DE DATOS DE TEMPERATURA EN BASE DE DATOS');
  console.log('=====================================================');

  let databaseService;
  
  try {
    // Inicializar el servicio de base de datos
    console.log('\n🔧 Conectando a la base de datos...');
    databaseService = new DatabaseService();
    await databaseService.initialize();
    
    console.log('✅ Conexión establecida');

    // Consultar los últimos registros de temperatura
    console.log('\n📊 Consultando registros de temperatura...');
    
    const { data: temperatureData, error: tempError } = await databaseService.client
      .from('temperature_readings')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (tempError) {
      console.error('❌ Error al consultar temperature_readings:', tempError);
      return;
    }

    console.log(`\n📈 Encontrados ${temperatureData?.length || 0} registros de temperatura:`);
    
    if (temperatureData && temperatureData.length > 0) {
      console.log('\n🌡️ ÚLTIMOS REGISTROS DE TEMPERATURA:');
      console.log('=====================================');
      
      temperatureData.forEach((record, index) => {
        const date = new Date(record.timestamp);
        console.log(`\n${index + 1}. ID: ${record.id}`);
        console.log(`   Sensor ID: ${record.sensor_id}`);
        console.log(`   Valor: ${record.value}°C`);
        console.log(`   Timestamp: ${date.toLocaleString('es-ES', { 
          timeZone: 'America/Mexico_City',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}`);
      });
    } else {
      console.log('⚠️ No se encontraron registros de temperatura');
    }

    // Consultar información de sensores de temperatura
    console.log('\n🔍 Consultando sensores de temperatura...');
    
    const { data: sensorsData, error: sensorsError } = await databaseService.client
      .from('sensors')
      .select('id, name, type, asset_id')
      .eq('type', 'temperature');

    if (sensorsError) {
      console.error('❌ Error al consultar sensores:', sensorsError);
    } else {
      console.log(`\n📡 Sensores de temperatura configurados: ${sensorsData?.length || 0}`);
      
      if (sensorsData && sensorsData.length > 0) {
        sensorsData.forEach((sensor, index) => {
          console.log(`\n${index + 1}. ${sensor.name}`);
          console.log(`   ID: ${sensor.id}`);
          console.log(`   Asset ID: ${sensor.asset_id}`);
        });
      }
    }

    // Estadísticas generales
    console.log('\n📊 ESTADÍSTICAS GENERALES:');
    console.log('==========================');
    
    // Contar registros por día
    const { data: dailyStats, error: statsError } = await databaseService.client
      .from('temperature_readings')
      .select('timestamp')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!statsError && dailyStats) {
      console.log(`📅 Registros en los últimos 7 días: ${dailyStats.length}`);
      
      // Agrupar por día
      const dailyCount = {};
      dailyStats.forEach(record => {
        const date = new Date(record.timestamp).toDateString();
        dailyCount[date] = (dailyCount[date] || 0) + 1;
      });
      
      console.log('\n📈 Registros por día:');
      Object.entries(dailyCount)
        .sort(([a], [b]) => new Date(b) - new Date(a))
        .forEach(([date, count]) => {
          console.log(`   ${date}: ${count} registros`);
        });
    }

    // Verificar el último registro
    if (temperatureData && temperatureData.length > 0) {
      const lastRecord = temperatureData[0];
      const timeDiff = Date.now() - new Date(lastRecord.timestamp).getTime();
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      console.log(`\n⏰ Último registro hace: ${minutesAgo} minutos`);
      
      if (minutesAgo < 60) {
        console.log('✅ Los datos están siendo almacenados recientemente');
      } else if (minutesAgo < 1440) {
        console.log('⚠️ El último registro es de hace más de 1 hora');
      } else {
        console.log('❌ El último registro es de hace más de 1 día');
      }
    }

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Nota: DatabaseService no requiere cierre explícito de conexión
    if (databaseService) {
      console.log('\n🔌 Verificación completada');
    }
  }
}

// Ejecutar la verificación
verifyTemperatureData();