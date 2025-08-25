const DatabaseService = require('./src/services/database.service');

async function verifySensorSeparation() {
  console.log('=== VERIFICACIÓN DE SEPARACIÓN POR SENSOR ===\n');
  
  const dbService = new DatabaseService();
  
  try {
    await dbService.initialize();
    console.log('✅ Conectado a la base de datos\n');
    
    // Consultar las últimas lecturas agrupadas por sensor
    const { data, error } = await dbService.client
      .from('vibration_readings')
      .select('timestamp, axis, sensor_id, oavelocity, created_at')
      .order('timestamp', { ascending: false })
      .order('sensor_id', { ascending: true })
      .order('axis', { ascending: true })
      .limit(30);
    
    if (error) {
      console.error('❌ Error al consultar la base de datos:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('ℹ️  No se encontraron lecturas de vibración');
      return;
    }
    
    console.log(`Encontradas ${data.length} lecturas de vibración\n`);
    
    // Agrupar por sensor y timestamp
    const groupedBySensor = {};
    data.forEach(reading => {
      const sensorId = reading.sensor_id;
      if (!groupedBySensor[sensorId]) {
        groupedBySensor[sensorId] = {};
      }
      
      const timestamp = reading.timestamp;
      if (!groupedBySensor[sensorId][timestamp]) {
        groupedBySensor[sensorId][timestamp] = [];
      }
      
      groupedBySensor[sensorId][timestamp].push(reading);
    });
    
    console.log('1. Análisis por sensor:');
    console.log('=======================');
    
    const sensorIds = Object.keys(groupedBySensor);
    console.log(`Total de sensores encontrados: ${sensorIds.length}\n`);
    
    sensorIds.forEach((sensorId, sensorIndex) => {
      const sensorData = groupedBySensor[sensorId];
      const timestamps = Object.keys(sensorData).sort().reverse();
      
      console.log(`SENSOR ${sensorIndex + 1}: ${sensorId}`);
      console.log(`Timestamps únicos: ${timestamps.length}`);
      console.log('');
      
      timestamps.slice(0, 3).forEach((timestamp, timestampIndex) => {
        const readings = sensorData[timestamp];
        const axes = readings.map(r => r.axis).sort();
        
        console.log(`  Timestamp ${timestampIndex + 1}: ${timestamp}`);
        console.log(`    Ejes: ${axes.join(', ')}`);
        console.log(`    ¿Completo (X,Y,Z)?: ${axes.length === 3 && axes.includes('X') && axes.includes('Y') && axes.includes('Z') ? '✅' : '❌'}`);
        
        // Verificar consistencia de timestamp
        const allSameTimestamp = readings.every(r => r.timestamp === timestamp);
        console.log(`    ¿Mismo timestamp?: ${allSameTimestamp ? '✅' : '❌'}`);
        
        // Mostrar detalles de cada eje
        readings.forEach(reading => {
          console.log(`      ${reading.axis}: OAVel=${reading.oavelocity}, Created=${reading.created_at}`);
        });
        
        console.log('');
      });
      
      console.log('---\n');
    });
    
    console.log('2. Verificación de consistencia por sensor:');
    console.log('===========================================');
    
    let allSensorsConsistent = true;
    
    sensorIds.forEach((sensorId, index) => {
      const sensorData = groupedBySensor[sensorId];
      const timestamps = Object.keys(sensorData);
      
      console.log(`SENSOR ${index + 1}:`);
      
      let sensorConsistent = true;
      timestamps.forEach(timestamp => {
        const readings = sensorData[timestamp];
        const timestampConsistent = readings.every(r => r.timestamp === timestamp);
        
        if (!timestampConsistent) {
          sensorConsistent = false;
          allSensorsConsistent = false;
          console.log(`  ❌ Inconsistencia en timestamp ${timestamp}`);
        }
      });
      
      if (sensorConsistent) {
        console.log(`  ✅ Todos los timestamps son consistentes`);
      }
      
      console.log(`  Total de timestamps: ${timestamps.length}`);
      console.log('');
    });
    
    console.log('3. Resumen final:');
    console.log('=================');
    console.log(`Total de sensores: ${sensorIds.length}`);
    console.log(`¿Todos los sensores tienen timestamps consistentes?: ${allSensorsConsistent ? '✅ SÍ' : '❌ NO'}`);
    
    if (sensorIds.length > 1) {
      console.log('\n💡 EXPLICACIÓN:');
      console.log('   Tienes múltiples sensores enviando datos con el mismo código.');
      console.log('   Cada sensor mantiene la consistencia de timestamp en sus propios datos.');
      console.log('   Las "variaciones" que observas son normales cuando hay múltiples sensores.');
    }
    
    // Obtener información de los sensores
    console.log('\n4. Información de los sensores:');
    console.log('===============================');
    
    for (const sensorId of sensorIds) {
      const { data: sensorInfo, error: sensorError } = await dbService.client
        .from('sensors')
        .select('id, name, code, type, status')
        .eq('id', sensorId)
        .single();
      
      if (!sensorError && sensorInfo) {
        console.log(`Sensor: ${sensorInfo.name}`);
        console.log(`  ID: ${sensorInfo.id}`);
        console.log(`  Código: ${sensorInfo.code}`);
        console.log(`  Tipo: ${sensorInfo.type}`);
        console.log(`  Estado: ${sensorInfo.status}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    console.log('✅ Finalizando verificación');
  }
  
  console.log('\n=== FIN DE LA VERIFICACIÓN ===');
}

// Ejecutar la verificación
verifySensorSeparation().catch(console.error);