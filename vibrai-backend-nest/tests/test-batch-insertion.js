const DatabaseService = require('./src/services/database.service');

async function testBatchInsertion() {
  console.log('🧪 Iniciando prueba de inserción en bloque de datos de vibración...\n');

  const dbService = new DatabaseService();
  
  try {
    // Inicializar conexión a la base de datos
    await dbService.initialize();
    console.log('✅ Conexión a base de datos establecida\n');

    // Simular datos de vibración para los tres ejes con el mismo timestamp
    const timestamp = new Date().toISOString();
    const sensorId = '43199abb-54a2-4432-847f-fa8f10cfa16f'; // UUID real del sensor

    const vibrationReadings = [
      {
        sensor_id: sensorId,
        axis: 'X',
        timestamp: timestamp,
        oavelocity: 2.45,
        peak: 4.12,
        rms: 1.89,
        crestfactor: 2.18,
        kurtosis: 3.45,
        skewness: 0.12,
        deviation: 0.08,
        peak_to_peak_displacement: 0.9
      },
      {
        sensor_id: sensorId,
        axis: 'Y',
        timestamp: timestamp,
        oavelocity: 2.67,
        peak: 4.33,
        rms: 2.01,
        crestfactor: 2.15,
        kurtosis: 3.52,
        skewness: 0.08,
        deviation: 0.06,
        peak_to_peak_displacement: 0.6
      },
      {
        sensor_id: sensorId,
        axis: 'Z',
        timestamp: timestamp,
        oavelocity: 2.23,
        peak: 3.89,
        rms: 1.76,
        crestfactor: 2.21,
        kurtosis: 3.38,
        skewness: 0.15,
        deviation: 0.07,
        peak_to_peak_displacement: 0.7
      }
    ];

    console.log('📊 Datos de prueba preparados:');
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Sensor ID: ${sensorId}`);
    console.log(`   Ejes: ${vibrationReadings.map(r => r.axis).join(', ')}`);
    console.log(`   Cantidad de lecturas: ${vibrationReadings.length}\n`);

    // Medir tiempo de inserción en bloque
    const startTime = Date.now();
    
    console.log('🚀 Ejecutando inserción en bloque...');
    await dbService.saveVibrationReadingsBatch(vibrationReadings);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n✅ Inserción en bloque completada exitosamente`);
    console.log(`⏱️  Tiempo de ejecución: ${duration}ms`);
    console.log(`📈 Rendimiento: ${vibrationReadings.length} lecturas en ${duration}ms`);

    // Verificar que los datos se insertaron correctamente
    console.log('\n🔍 Verificando datos insertados...');
    
    // Consultar las lecturas recién insertadas
    const { data: insertedReadings, error } = await dbService.client
      .from('vibration_readings')
      .select('*')
      .eq('sensor_id', sensorId)
      .eq('timestamp', timestamp)
      .order('axis');

    if (error) {
      throw new Error(`Error al verificar datos: ${error.message}`);
    }

    console.log(`✅ Se encontraron ${insertedReadings.length} lecturas insertadas`);
    
    if (insertedReadings.length === 3) {
      console.log('✅ Verificación exitosa: Se insertaron los 3 ejes correctamente');
      
      insertedReadings.forEach(reading => {
        console.log(`   Eje ${reading.axis}: OAVelocity = ${reading.oavelocity} mm/s`);
      });
      
      // Verificar que todos tienen el mismo timestamp
      const timestamps = [...new Set(insertedReadings.map(r => r.timestamp))];
      if (timestamps.length === 1) {
        console.log('✅ Todos los ejes tienen el mismo timestamp');
      } else {
        console.log('❌ Error: Los ejes tienen timestamps diferentes');
      }
    } else {
      console.log(`❌ Error: Se esperaban 3 lecturas, pero se encontraron ${insertedReadings.length}`);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n🏁 Prueba de inserción en bloque finalizada');
}

// Ejecutar la prueba
testBatchInsertion().catch(console.error);