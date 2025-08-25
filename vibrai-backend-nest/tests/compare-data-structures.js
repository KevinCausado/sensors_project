// Script para comparar las estructuras de datos entre basic-analysis.js y los servicios actuales
const DatabaseService = require('../src/services/database.service');

async function compareDataStructures() {
  console.log('🔍 COMPARACIÓN DE ESTRUCTURAS DE DATOS');
  console.log('=' .repeat(70));

  try {
    // Inicializar servicios
    const databaseService = new DatabaseService();
    await databaseService.initialize();

    console.log('\n📊 ANALIZANDO DIFERENCIAS ESTRUCTURALES...\n');

    // 1. Comparar estructura de sensores
    console.log('1️⃣ ESTRUCTURA DE SENSORES:');
    console.log('=' .repeat(50));
    
    const { data: sensors, error: sensorsError } = await databaseService.client
      .from('sensors')
      .select(`
        id, type, code, name, status, organization_id, asset_id, thresholds,
        last_reading_timestamp, last_value, last_unit, battery_level,
        firmware:sensor_firmwares ( sensor_types, structure )
      `)
      .limit(3);

    if (sensorsError) {
      console.error('❌ Error obteniendo sensores:', sensorsError.message);
    } else {
      console.log(`✅ Sensores encontrados: ${sensors.length}`);
      sensors.forEach((sensor, index) => {
        console.log(`\n📍 Sensor ${index + 1}:`);
        console.log(`   ID: ${sensor.id}`);
        console.log(`   Código: ${sensor.code}`);
        console.log(`   Nombre: ${sensor.name}`);
        console.log(`   Tipo: ${sensor.type}`);
        console.log(`   Estado: ${sensor.status}`);
        console.log(`   Asset ID: ${sensor.asset_id}`);
        console.log(`   Última lectura: ${sensor.last_reading_timestamp}`);
        console.log(`   Último valor: ${sensor.last_value} ${sensor.last_unit}`);
        console.log(`   Batería: ${sensor.battery_level}V`);
        console.log(`   Firmware: ${sensor.firmware ? 'Configurado' : 'No configurado'}`);
        
        if (sensor.firmware && sensor.firmware.structure) {
          console.log(`   Tipos soportados: ${sensor.firmware.sensor_types.join(', ')}`);
          console.log(`   Estructura: ${JSON.stringify(sensor.firmware.structure, null, 6)}`);
        }
      });
    }

    // 2. Comparar estructura de lecturas de vibración
    console.log('\n\n2️⃣ ESTRUCTURA DE LECTURAS DE VIBRACIÓN:');
    console.log('=' .repeat(50));
    
    const { data: vibrationReadings, error: vibrationError } = await databaseService.client
      .from('vibration_readings')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(3);

    if (vibrationError) {
      console.error('❌ Error obteniendo lecturas de vibración:', vibrationError.message);
    } else {
      console.log(`✅ Lecturas de vibración encontradas: ${vibrationReadings.length}`);
      vibrationReadings.forEach((reading, index) => {
        console.log(`\n📊 Lectura ${index + 1}:`);
        console.log(`   Sensor ID: ${reading.sensor_id}`);
        console.log(`   Eje: ${reading.axis}`);
        console.log(`   OAVelocity: ${reading.oavelocity} mm/s`);
        console.log(`   Peak: ${reading.peak}`);
        console.log(`   RMS: ${reading.rms}`);
        console.log(`   Kurtosis: ${reading.kurtosis}`);
        console.log(`   CrestFactor: ${reading.crestfactor}`);
        console.log(`   Skewness: ${reading.skewness}`);
        console.log(`   Deviation: ${reading.deviation}`);
        console.log(`   Peak-to-Peak: ${reading.peak_to_peak_displacement}`);
        console.log(`   Timestamp: ${reading.timestamp}`);
      });
    }

    // 3. Comparar estructura de lecturas de temperatura
    console.log('\n\n3️⃣ ESTRUCTURA DE LECTURAS DE TEMPERATURA:');
    console.log('=' .repeat(50));
    
    const { data: temperatureReadings, error: temperatureError } = await databaseService.client
      .from('temperature_readings')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(3);

    if (temperatureError) {
      console.error('❌ Error obteniendo lecturas de temperatura:', temperatureError.message);
    } else {
      console.log(`✅ Lecturas de temperatura encontradas: ${temperatureReadings.length}`);
      temperatureReadings.forEach((reading, index) => {
        console.log(`\n🌡️ Lectura ${index + 1}:`);
        console.log(`   Sensor ID: ${reading.sensor_id}`);
        console.log(`   Valor: ${reading.value} °C`);
        console.log(`   Timestamp: ${reading.timestamp}`);
      });
    }

    // 4. Comparar estructura de resultados de análisis
    console.log('\n\n4️⃣ ESTRUCTURA DE RESULTADOS DE ANÁLISIS:');
    console.log('=' .repeat(50));
    
    const { data: analysisResults, error: analysisError } = await databaseService.client
      .from('analysis_results')
      .select('*')
      .order('analysis_timestamp', { ascending: false })
      .limit(3);

    if (analysisError) {
      console.error('❌ Error obteniendo resultados de análisis:', analysisError.message);
    } else {
      console.log(`✅ Resultados de análisis encontrados: ${analysisResults.length}`);
      analysisResults.forEach((result, index) => {
        console.log(`\n📈 Análisis ${index + 1}:`);
        console.log(`   Sensor ID: ${result.sensor_id}`);
        console.log(`   Asset ID: ${result.asset_id}`);
        console.log(`   Valor medido: ${result.measured_value}`);
        console.log(`   Estado ISO: ${result.iso_status}`);
        console.log(`   Estado perfil: ${result.profile_status}`);
        console.log(`   Estado final: ${result.final_status}`);
        console.log(`   Timestamp: ${result.analysis_timestamp}`);
      });
    }

    // 5. Verificar relaciones entre sensores y assets
    console.log('\n\n5️⃣ RELACIONES SENSOR-ASSET:');
    console.log('=' .repeat(50));
    
    const { data: sensorAssetRelations, error: relationError } = await databaseService.client
      .from('sensors')
      .select(`
        id, name, type, code, asset_id,
        asset:assets_base!sensors_asset_id_fkey(id, name, description)
      `)
      .not('asset_id', 'is', null)
      .limit(5);

    if (relationError) {
      console.error('❌ Error obteniendo relaciones sensor-asset:', relationError.message);
    } else {
      console.log(`✅ Relaciones sensor-asset encontradas: ${sensorAssetRelations.length}`);
      sensorAssetRelations.forEach((relation, index) => {
        console.log(`\n🔗 Relación ${index + 1}:`);
        console.log(`   Sensor: ${relation.name} (ID: ${relation.id}, Código: ${relation.code})`);
        console.log(`   Tipo: ${relation.type}`);
        console.log(`   Asset: ${relation.asset?.name} (ID: ${relation.asset_id})`);
        console.log(`   Descripción Asset: ${relation.asset?.description}`);
      });
    }

    // 6. Análisis de diferencias críticas
    console.log('\n\n6️⃣ ANÁLISIS DE DIFERENCIAS CRÍTICAS:');
    console.log('=' .repeat(50));
    
    console.log('\n🔍 DIFERENCIAS IDENTIFICADAS:');
    
    console.log('\n📌 BASIC-ANALYSIS.JS:');
    console.log('   ✓ Usa firmware.structure para configuración');
    console.log('   ✓ Aplica correctionFactor desde firmware');
    console.log('   ✓ Usa get() de lodash para extraer datos');
    console.log('   ✓ Procesa sensores por tipo individual');
    console.log('   ✓ Guarda directamente en tablas específicas');
    console.log('   ✓ Actualiza last_reading_timestamp en sensors');
    
    console.log('\n📌 SERVICIOS ACTUALES:');
    console.log('   ✓ Extrae datos directamente del payload');
    console.log('   ✓ No usa firmware.structure');
    console.log('   ✓ Procesa múltiples sensores del mismo código');
    console.log('   ✓ Agrupa lecturas por tipo');
    console.log('   ✓ Usa inserción en bloque para vibración');
    console.log('   ✓ Actualiza last_reading via updateSensorLastReading');

    console.log('\n⚠️ POSIBLES CONFLICTOS:');
    console.log('   🔸 Diferentes métodos de extracción de timestamp');
    console.log('   🔸 Aplicación de factores de corrección');
    console.log('   🔸 Estructura de datos guardados');
    console.log('   🔸 Actualización de metadatos del sensor');
    console.log('   🔸 Manejo de múltiples sensores por código');

    // 7. Verificar consistencia de timestamps
    console.log('\n\n7️⃣ VERIFICACIÓN DE TIMESTAMPS:');
    console.log('=' .repeat(50));
    
    const { data: recentData, error: timestampError } = await databaseService.client
      .from('sensors')
      .select(`
        id, name, last_reading_timestamp,
        vibration_readings!vibration_readings_sensor_id_fkey(timestamp),
        temperature_readings!temperature_readings_sensor_id_fkey(timestamp)
      `)
      .not('last_reading_timestamp', 'is', null)
      .limit(3);

    if (timestampError) {
      console.error('❌ Error verificando timestamps:', timestampError.message);
    } else {
      recentData.forEach((sensor, index) => {
        console.log(`\n⏰ Sensor ${index + 1}: ${sensor.name}`);
        console.log(`   Último timestamp en sensor: ${sensor.last_reading_timestamp}`);
        
        if (sensor.vibration_readings && sensor.vibration_readings.length > 0) {
          const latestVibration = sensor.vibration_readings
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
          console.log(`   Último timestamp vibración: ${latestVibration.timestamp}`);
        }
        
        if (sensor.temperature_readings && sensor.temperature_readings.length > 0) {
          const latestTemperature = sensor.temperature_readings
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
          console.log(`   Último timestamp temperatura: ${latestTemperature.timestamp}`);
        }
      });
    }

    console.log('\n\n✅ ANÁLISIS COMPLETADO');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('❌ Error en el análisis:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar el análisis
compareDataStructures().catch(console.error);