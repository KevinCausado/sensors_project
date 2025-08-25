// Script para identificar y corregir inconsistencias entre basic-analysis.js y servicios actuales
const DatabaseService = require('../src/services/database.service');
const PayloadService = require('../src/services/payload.service');

async function analyzeAndFixInconsistencies() {
  console.log('🔧 ANÁLISIS Y CORRECCIÓN DE INCONSISTENCIAS');
  console.log('=' .repeat(70));

  try {
    // Inicializar servicios
    const databaseService = new DatabaseService();
    await databaseService.initialize();
    const payloadService = new PayloadService();

    console.log('\n📊 IDENTIFICANDO INCONSISTENCIAS ESPECÍFICAS...\n');

    // 1. Verificar estructura de firmware vs extracción directa
    console.log('1️⃣ ANÁLISIS DE EXTRACCIÓN DE DATOS:');
    console.log('=' .repeat(50));
    
    const { data: sensorsWithFirmware, error: firmwareError } = await databaseService.client
      .from('sensors')
      .select(`
        id, name, code, type,
        firmware:sensor_firmwares ( sensor_types, structure )
      `)
      .not('firmware', 'is', null)
      .limit(3);

    if (firmwareError) {
      console.error('❌ Error obteniendo sensores con firmware:', firmwareError.message);
    } else {
      console.log(`✅ Sensores con firmware encontrados: ${sensorsWithFirmware.length}`);
      
      sensorsWithFirmware.forEach((sensor, index) => {
        console.log(`\n📍 Sensor ${index + 1}: ${sensor.name}`);
        console.log(`   Código: ${sensor.code}`);
        console.log(`   Tipo: ${sensor.type}`);
        
        if (sensor.firmware && sensor.firmware.structure) {
          console.log(`   📋 Estructura de firmware:`);
          console.log(`      ${JSON.stringify(sensor.firmware.structure, null, 6)}`);
          
          // Simular extracción con basic-analysis.js vs servicios actuales
          console.log(`\n   🔍 DIFERENCIAS DE EXTRACCIÓN:`);
          
          if (sensor.type === 'vibration') {
            console.log(`      📌 BASIC-ANALYSIS.JS extraería:`);
            console.log(`         - OAVelocity: get(payload, '${sensor.firmware.structure.vibration?.oavelocity || 'AcceleroMeter.X.OAVelocity'}')`);
            console.log(`         - Peak: get(payload, '${sensor.firmware.structure.vibration?.peak || 'AcceleroMeter.X.Peak'}')`);
            console.log(`         - Con correctionFactor aplicado`);
            
            console.log(`      📌 SERVICIOS ACTUALES extraen:`);
            console.log(`         - Directamente de payload.AcceleroMeter[axis]`);
            console.log(`         - Sin correctionFactor`);
          }
          
          if (sensor.type === 'temperature') {
            console.log(`      📌 BASIC-ANALYSIS.JS extraería:`);
            console.log(`         - Temperatura: get(payload, '${sensor.firmware.structure.temperature?.value || 'TempHumi.SenVal'}')`);
            console.log(`         - Con conversión y correctionFactor`);
            
            console.log(`      📌 SERVICIOS ACTUALES extraen:`);
            console.log(`         - Directamente de payload.TempHumi.SenVal o payload.TempHumi`);
            console.log(`         - Con conversión a Celsius pero sin correctionFactor`);
          }
        }
      });
    }

    // 2. Verificar inconsistencias en timestamps
    console.log('\n\n2️⃣ ANÁLISIS DE TIMESTAMPS:');
    console.log('=' .repeat(50));
    
    const { data: timestampInconsistencies, error: timestampError } = await databaseService.client
      .from('sensors')
      .select(`
        id, name, last_reading_timestamp,
        vibration_readings!vibration_readings_sensor_id_fkey(timestamp),
        temperature_readings!temperature_readings_sensor_id_fkey(timestamp)
      `)
      .not('last_reading_timestamp', 'is', null)
      .limit(5);

    if (timestampError) {
      console.error('❌ Error verificando timestamps:', timestampError.message);
    } else {
      console.log(`✅ Sensores para verificar timestamps: ${timestampInconsistencies.length}`);
      
      timestampInconsistencies.forEach((sensor, index) => {
        console.log(`\n⏰ Sensor ${index + 1}: ${sensor.name}`);
        console.log(`   Último timestamp en sensor: ${sensor.last_reading_timestamp}`);
        
        let latestVibrationTimestamp = null;
        let latestTemperatureTimestamp = null;
        
        if (sensor.vibration_readings && sensor.vibration_readings.length > 0) {
          latestVibrationTimestamp = sensor.vibration_readings
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0].timestamp;
          console.log(`   Último timestamp vibración: ${latestVibrationTimestamp}`);
        }
        
        if (sensor.temperature_readings && sensor.temperature_readings.length > 0) {
          latestTemperatureTimestamp = sensor.temperature_readings
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0].timestamp;
          console.log(`   Último timestamp temperatura: ${latestTemperatureTimestamp}`);
        }
        
        // Verificar inconsistencias
        const sensorTimestamp = new Date(sensor.last_reading_timestamp);
        const vibrationTimestamp = latestVibrationTimestamp ? new Date(latestVibrationTimestamp) : null;
        const temperatureTimestamp = latestTemperatureTimestamp ? new Date(latestTemperatureTimestamp) : null;
        
        let hasInconsistency = false;
        
        if (vibrationTimestamp && Math.abs(sensorTimestamp - vibrationTimestamp) > 60000) { // 1 minuto
          console.log(`   ⚠️ INCONSISTENCIA: Diferencia de ${Math.abs(sensorTimestamp - vibrationTimestamp) / 1000}s con vibración`);
          hasInconsistency = true;
        }
        
        if (temperatureTimestamp && Math.abs(sensorTimestamp - temperatureTimestamp) > 60000) { // 1 minuto
          console.log(`   ⚠️ INCONSISTENCIA: Diferencia de ${Math.abs(sensorTimestamp - temperatureTimestamp) / 1000}s con temperatura`);
          hasInconsistency = true;
        }
        
        if (!hasInconsistency) {
          console.log(`   ✅ Timestamps consistentes`);
        }
      });
    }

    // 3. Verificar diferencias en valores guardados
    console.log('\n\n3️⃣ ANÁLISIS DE VALORES GUARDADOS:');
    console.log('=' .repeat(50));
    
    // Obtener lecturas recientes para comparar
    const { data: recentVibrationReadings, error: vibrationError } = await databaseService.client
      .from('vibration_readings')
      .select('sensor_id, axis, oavelocity, peak, rms, timestamp')
      .order('timestamp', { ascending: false })
      .limit(5);

    if (vibrationError) {
      console.error('❌ Error obteniendo lecturas de vibración:', vibrationError.message);
    } else {
      console.log(`✅ Lecturas de vibración recientes: ${recentVibrationReadings.length}`);
      
      recentVibrationReadings.forEach((reading, index) => {
        console.log(`\n📊 Lectura ${index + 1}:`);
        console.log(`   Sensor ID: ${reading.sensor_id}`);
        console.log(`   Eje: ${reading.axis}`);
        console.log(`   OAVelocity: ${reading.oavelocity} mm/s`);
        console.log(`   Peak: ${reading.peak}`);
        console.log(`   RMS: ${reading.rms}`);
        console.log(`   Timestamp: ${reading.timestamp}`);
        
        // Verificar si los valores parecen tener factor de corrección aplicado
        if (reading.oavelocity && reading.oavelocity % 1 !== 0 && reading.oavelocity < 1) {
          console.log(`   🔍 Posible factor de corrección aplicado (valor decimal pequeño)`);
        } else if (reading.oavelocity && reading.oavelocity > 100) {
          console.log(`   🔍 Posible valor sin factor de corrección (valor alto)`);
        }
      });
    }

    // 4. Identificar sensores duplicados por código
    console.log('\n\n4️⃣ ANÁLISIS DE SENSORES DUPLICADOS:');
    console.log('=' .repeat(50));
    
    const { data: sensorCodes, error: codesError } = await databaseService.client
      .from('sensors')
      .select('code, id, name, type')
      .order('code');

    if (codesError) {
      console.error('❌ Error obteniendo códigos de sensores:', codesError.message);
    } else {
      // Agrupar por código
      const codeGroups = {};
      sensorCodes.forEach(sensor => {
        if (!codeGroups[sensor.code]) {
          codeGroups[sensor.code] = [];
        }
        codeGroups[sensor.code].push(sensor);
      });

      const duplicatedCodes = Object.entries(codeGroups).filter(([code, sensors]) => sensors.length > 1);
      
      console.log(`✅ Códigos únicos: ${Object.keys(codeGroups).length}`);
      console.log(`⚠️ Códigos duplicados: ${duplicatedCodes.length}`);
      
      duplicatedCodes.forEach(([code, sensors]) => {
        console.log(`\n🔄 Código duplicado: ${code}`);
        sensors.forEach((sensor, index) => {
          console.log(`   ${index + 1}. ${sensor.name} (ID: ${sensor.id}, Tipo: ${sensor.type})`);
        });
        
        console.log(`   📌 PROBLEMA POTENCIAL:`);
        console.log(`      - basic-analysis.js procesa solo el primer sensor encontrado`);
        console.log(`      - servicios actuales procesan todos los sensores con el mismo código`);
        console.log(`      - Esto puede causar datos inconsistentes en el frontend`);
      });
    }

    // 5. Proponer correcciones
    console.log('\n\n5️⃣ PROPUESTAS DE CORRECCIÓN:');
    console.log('=' .repeat(50));
    
    console.log('\n🔧 CORRECCIONES RECOMENDADAS:');
    
    console.log('\n1. 📐 FACTORES DE CORRECCIÓN:');
    console.log('   ✓ Implementar aplicación de correctionFactor en servicios actuales');
    console.log('   ✓ Usar firmware.structure para configuración de extracción');
    console.log('   ✓ Mantener compatibilidad con extracción directa como fallback');
    
    console.log('\n2. ⏰ TIMESTAMPS:');
    console.log('   ✓ Sincronizar actualización de last_reading_timestamp');
    console.log('   ✓ Usar el mismo timestamp para todas las lecturas del mismo mensaje');
    console.log('   ✓ Verificar que updateSensorLastReading se ejecute correctamente');
    
    console.log('\n3. 🔄 SENSORES DUPLICADOS:');
    console.log('   ✓ Decidir estrategia: ¿procesar todos o solo el primero?');
    console.log('   ✓ Asegurar consistencia entre basic-analysis.js y servicios');
    console.log('   ✓ Considerar usar sensor_id único en lugar de código para identificación');
    
    console.log('\n4. 📊 ESTRUCTURA DE DATOS:');
    console.log('   ✓ Validar que los campos guardados sean idénticos');
    console.log('   ✓ Verificar unidades de medida (mm/s, °C, etc.)');
    console.log('   ✓ Asegurar que los análisis usen los mismos datos base');
    
    console.log('\n5. 🎯 FRONTEND:');
    console.log('   ✓ Verificar que el frontend use los mismos filtros (sensor_id vs code)');
    console.log('   ✓ Asegurar que las consultas sean consistentes');
    console.log('   ✓ Validar que los timestamps se interpreten correctamente');

    console.log('\n\n✅ ANÁLISIS DE INCONSISTENCIAS COMPLETADO');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('❌ Error en el análisis:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar el análisis
analyzeAndFixInconsistencies().catch(console.error);