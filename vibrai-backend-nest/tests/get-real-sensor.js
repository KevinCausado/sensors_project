const DatabaseService = require('./src/services/database.service');

async function getRealSensor() {
  const dbService = new DatabaseService();
  
  try {
    await dbService.initialize();
    console.log('✅ Conexión establecida');

    // Obtener un sensor real
    const { data: sensors, error } = await dbService.client
      .from('sensors')
      .select('id, name, code, type')
      .limit(1);

    if (error) {
      throw new Error(`Error al obtener sensores: ${error.message}`);
    }

    if (sensors && sensors.length > 0) {
      const sensor = sensors[0];
      console.log('📊 Sensor encontrado:');
      console.log(`   ID: ${sensor.id}`);
      console.log(`   Nombre: ${sensor.name}`);
      console.log(`   Código: ${sensor.code}`);
      console.log(`   Tipo: ${sensor.type}`);
    } else {
      console.log('❌ No se encontraron sensores');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getRealSensor().catch(console.error);