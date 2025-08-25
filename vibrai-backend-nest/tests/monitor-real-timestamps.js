const DatabaseService = require('./src/services/database.service');

async function monitorRealTimestamps() {
  console.log('=== MONITOR DE TIMESTAMPS REALES EN BASE DE DATOS ===\n');
  
  const dbService = new DatabaseService();
  
  try {
    await dbService.initialize();
    console.log('✅ Conectado a la base de datos\n');
    
    // Consultar las últimas lecturas de vibración agrupadas por timestamp
    console.log('1. Consultando últimas lecturas de vibración...');
    
    const query = `
      SELECT 
        timestamp,
        axis,
        sensor_id,
        oavelocity,
        created_at
      FROM vibration_readings 
      WHERE timestamp >= NOW() - INTERVAL '1 hour'
      ORDER BY timestamp DESC, axis ASC
      LIMIT 30
    `;
    
    const { data, error } = await dbService.client
      .from('vibration_readings')
      .select('timestamp, axis, sensor_id, oavelocity, created_at')
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .order('axis', { ascending: true })
      .limit(30);
    
    if (error) {
      console.error('❌ Error al consultar la base de datos:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('ℹ️  No se encontraron lecturas de vibración en la última hora');
      console.log('   Consultando las últimas 10 lecturas sin filtro de tiempo...\n');
      
      const { data: allData, error: allError } = await dbService.client
        .from('vibration_readings')
        .select('timestamp, axis, sensor_id, oavelocity, created_at')
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (allError) {
        console.error('❌ Error al consultar todas las lecturas:', allError);
        return;
      }
      
      if (!allData || allData.length === 0) {
        console.log('ℹ️  No se encontraron lecturas de vibración en la base de datos');
        return;
      }
      
      data = allData;
    }
    
    console.log(`Encontradas ${data.length} lecturas de vibración\n`);
    
    // Agrupar por timestamp
    const groupedByTimestamp = {};
    data.forEach(reading => {
      const timestamp = reading.timestamp;
      if (!groupedByTimestamp[timestamp]) {
        groupedByTimestamp[timestamp] = [];
      }
      groupedByTimestamp[timestamp].push(reading);
    });
    
    console.log('2. Análisis de consistencia por timestamp:');
    console.log('==========================================');
    
    const timestamps = Object.keys(groupedByTimestamp).sort().reverse();
    
    timestamps.forEach((timestamp, index) => {
      const readings = groupedByTimestamp[timestamp];
      const axes = readings.map(r => r.axis).sort();
      const sensorIds = [...new Set(readings.map(r => r.sensor_id))];
      const createdAts = readings.map(r => r.created_at);
      
      console.log(`\nGrupo ${index + 1}:`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Cantidad de lecturas: ${readings.length}`);
      console.log(`  Ejes: ${axes.join(', ')}`);
      console.log(`  Sensores: ${sensorIds.join(', ')}`);
      console.log(`  ¿Todos los ejes (X,Y,Z)?: ${axes.length === 3 && axes.includes('X') && axes.includes('Y') && axes.includes('Z') ? '✅' : '❌'}`);
      
      // Verificar diferencias en created_at
      const createdAtTimes = createdAts.map(ca => new Date(ca).getTime());
      const minTime = Math.min(...createdAtTimes);
      const maxTime = Math.max(...createdAtTimes);
      const timeDiff = maxTime - minTime;
      
      console.log(`  Diferencia en created_at: ${timeDiff} ms`);
      
      if (timeDiff > 1000) { // Más de 1 segundo
        console.log(`  ⚠️  ADVERTENCIA: Gran diferencia en tiempos de inserción`);
      }
      
      // Mostrar detalles de cada lectura
      readings.forEach(reading => {
        console.log(`    ${reading.axis}: OAVel=${reading.oavelocity}, Created=${reading.created_at}`);
      });
    });
    
    console.log('\n3. Resumen general:');
    console.log('===================');
    console.log(`Total de timestamps únicos: ${timestamps.length}`);
    console.log(`Total de lecturas: ${data.length}`);
    console.log(`Promedio de lecturas por timestamp: ${(data.length / timestamps.length).toFixed(2)}`);
    
    // Verificar si hay timestamps con lecturas incompletas
    const incompleteTimestamps = timestamps.filter(ts => {
      const readings = groupedByTimestamp[ts];
      const axes = readings.map(r => r.axis);
      return !(axes.includes('X') && axes.includes('Y') && axes.includes('Z'));
    });
    
    if (incompleteTimestamps.length > 0) {
      console.log(`\n⚠️  ADVERTENCIA: ${incompleteTimestamps.length} timestamps con lecturas incompletas:`);
      incompleteTimestamps.forEach(ts => {
        const readings = groupedByTimestamp[ts];
        const axes = readings.map(r => r.axis);
        console.log(`  ${ts}: Ejes ${axes.join(', ')} (faltan: ${['X', 'Y', 'Z'].filter(axis => !axes.includes(axis)).join(', ')})`);
      });
    } else {
      console.log(`✅ Todos los timestamps tienen lecturas completas para los 3 ejes`);
    }
    
  } catch (error) {
    console.error('❌ Error durante el monitoreo:', error);
  } finally {
    console.log('\n✅ Finalizando monitoreo');
  }
  
  console.log('\n=== FIN DEL MONITOREO ===');
}

// Ejecutar el monitoreo
monitorRealTimestamps().catch(console.error);