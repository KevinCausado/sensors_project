const DatabaseService = require('./src/services/database.service');

async function performanceComparison() {
  console.log('🏁 Comparación de rendimiento: Inserción Individual vs Inserción en Bloque\n');

  const dbService = new DatabaseService();
  
  try {
    await dbService.initialize();
    console.log('✅ Conexión a base de datos establecida\n');

    const sensorId = '43199abb-54a2-4432-847f-fa8f10cfa16f';

    // Función para generar datos de prueba
    function generateVibrationData(timestamp) {
      return [
        {
          sensor_id: sensorId,
          axis: 'X',
          timestamp: timestamp,
          oavelocity: 2.45 + Math.random() * 0.1,
          peak: 4.12 + Math.random() * 0.1,
          rms: 1.89 + Math.random() * 0.1,
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
          oavelocity: 2.67 + Math.random() * 0.1,
          peak: 4.33 + Math.random() * 0.1,
          rms: 2.01 + Math.random() * 0.1,
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
          oavelocity: 2.23 + Math.random() * 0.1,
          peak: 3.89 + Math.random() * 0.1,
          rms: 1.76 + Math.random() * 0.1,
          crestfactor: 2.21,
          kurtosis: 3.38,
          skewness: 0.15,
          deviation: 0.07,
          peak_to_peak_displacement: 0.7
        }
      ];
    }

    // Prueba 1: Inserción Individual
    console.log('🔄 Prueba 1: Inserción Individual (3 llamadas separadas)');
    const timestamp1 = new Date().toISOString();
    const individualData = generateVibrationData(timestamp1);
    
    const startIndividual = Date.now();
    
    for (const reading of individualData) {
      await dbService.saveVibrationReading(reading);
    }
    
    const endIndividual = Date.now();
    const individualTime = endIndividual - startIndividual;
    
    console.log(`   ✅ Completado en ${individualTime}ms`);
    console.log(`   📊 Promedio por lectura: ${(individualTime / 3).toFixed(1)}ms\n`);

    // Esperar un momento para evitar conflictos de timestamp
    await new Promise(resolve => setTimeout(resolve, 100));

    // Prueba 2: Inserción en Bloque
    console.log('🚀 Prueba 2: Inserción en Bloque (1 llamada)');
    const timestamp2 = new Date().toISOString();
    const batchData = generateVibrationData(timestamp2);
    
    const startBatch = Date.now();
    
    await dbService.saveVibrationReadingsBatch(batchData);
    
    const endBatch = Date.now();
    const batchTime = endBatch - startBatch;
    
    console.log(`   ✅ Completado en ${batchTime}ms`);
    console.log(`   📊 Promedio por lectura: ${(batchTime / 3).toFixed(1)}ms\n`);

    // Análisis de resultados
    console.log('📈 ANÁLISIS DE RENDIMIENTO:');
    console.log('=' .repeat(50));
    console.log(`Inserción Individual:  ${individualTime}ms`);
    console.log(`Inserción en Bloque:   ${batchTime}ms`);
    console.log(`Diferencia:            ${individualTime - batchTime}ms`);
    
    if (batchTime < individualTime) {
      const improvement = ((individualTime - batchTime) / individualTime * 100).toFixed(1);
      const speedup = (individualTime / batchTime).toFixed(1);
      console.log(`Mejora:                ${improvement}% más rápido`);
      console.log(`Factor de velocidad:   ${speedup}x más rápido`);
    } else {
      console.log(`La inserción individual fue más rápida en este caso`);
    }

    // Verificar que ambos conjuntos se insertaron correctamente
    console.log('\n🔍 Verificación de datos insertados:');
    
    const { data: individual, error: error1 } = await dbService.client
      .from('vibration_readings')
      .select('axis')
      .eq('sensor_id', sensorId)
      .eq('timestamp', timestamp1);

    const { data: batch, error: error2 } = await dbService.client
      .from('vibration_readings')
      .select('axis')
      .eq('sensor_id', sensorId)
      .eq('timestamp', timestamp2);

    if (!error1 && !error2) {
      console.log(`   Individual: ${individual?.length || 0} lecturas insertadas`);
      console.log(`   Bloque:     ${batch?.length || 0} lecturas insertadas`);
      
      if (individual?.length === 3 && batch?.length === 3) {
        console.log('   ✅ Ambos métodos insertaron correctamente los 3 ejes');
      }
    }

    console.log('\n💡 CONCLUSIÓN:');
    console.log('La inserción en bloque es más eficiente para múltiples lecturas');
    console.log('del mismo timestamp, reduciendo la latencia de red y mejorando');
    console.log('la consistencia temporal de los datos.');

  } catch (error) {
    console.error('❌ Error en la comparación:', error.message);
  }

  console.log('\n🏁 Comparación de rendimiento finalizada');
}

performanceComparison().catch(console.error);