const mqtt = require('mqtt');
const PayloadService = require('../src/services/payload.service');

// Configuración del broker MQTT real
const MQTT_BROKER = 'mqtt://direct1.miobox.io:1883';
const TOPIC_PATTERN = 'Advantech/#';

console.log('🔌 ANALIZADOR DE MQTT EN TIEMPO REAL');
console.log('=====================================');
console.log(`📡 Conectando a: ${MQTT_BROKER}`);
console.log(`📋 Suscribiéndose a: ${TOPIC_PATTERN}`);
console.log('=====================================\n');

// Crear instancia del PayloadService para análisis
const payloadService = new PayloadService();

// Conectar al broker MQTT
const client = mqtt.connect(MQTT_BROKER, {
  clientId: `vibrai-backend-analyzer-${Math.random().toString(16).substr(2, 8)}`,
  clean: true,
  connectTimeout: 30000,
  reconnectPeriod: 5000
});

// Manejar conexión exitosa
client.on('connect', () => {
  console.log('✅ Conectado al broker MQTT exitosamente!');
  
  // Suscribirse al patrón de tópicos
  client.subscribe(TOPIC_PATTERN, (err) => {
    if (err) {
      console.error('❌ Error al suscribirse al tópico:', err);
      process.exit(1);
    } else {
      console.log(`📡 Suscrito exitosamente a: ${TOPIC_PATTERN}`);
      console.log('🎧 Esperando mensajes...\n');
    }
  });
});

// Contador de mensajes
let messageCount = 0;
const sensorMessages = new Map(); // Para rastrear mensajes por sensor ID

// Manejar mensajes recibidos
client.on('message', async (topic, message) => {
  messageCount++;
  const timestamp = new Date().toISOString();
  
  console.log(`\n📨 MENSAJE #${messageCount} - ${timestamp}`);
  console.log(`📍 Tópico: ${topic}`);
  
  try {
    // Extraer ID del sensor del tópico
    const topicParts = topic.split('/');
    const sensorId = topicParts[topicParts.length - 1]; // Último elemento del tópico
    
    console.log(`🆔 ID del Sensor: ${sensorId}`);
    
    // Parsear el mensaje JSON
    const messageStr = message.toString();
    console.log(`📄 Mensaje Raw (${messageStr.length} chars):`, messageStr.substring(0, 200) + (messageStr.length > 200 ? '...' : ''));
    
    const payload = JSON.parse(messageStr);
    console.log(`📊 Estructura del Payload:`, Object.keys(payload));
    
    // Analizar el payload con PayloadService
    console.log(`\n🔍 ANÁLISIS DEL PAYLOAD:`);
    
    // Verificar si hay datos de temperatura
    if (payload.Temperature !== undefined) {
      console.log('🌡️ Datos de Temperatura encontrados:');
      console.log('   - Valor:', payload.Temperature);
      console.log('   - Tipo:', typeof payload.Temperature);
    }
    
    // Verificar si contiene datos de acelerómetro
    if (payload.Accelerometer) {
      console.log(`   ✅ Contiene datos de Accelerometer`);
      
      const axes = Object.keys(payload.Accelerometer).filter(key => key.includes('Axis'));
      console.log(`   📈 Ejes detectados: ${axes.join(', ')}`);
      
      // Analizar cada eje
      axes.forEach(axis => {
        const axisData = payload.Accelerometer[axis];
        console.log(`\n   📊 ${axis}:`);
        console.log(`      Métricas disponibles:`, Object.keys(axisData));
        
        // Verificar Peak-to-Peak_Displacement específicamente
        if (axisData['Peak-to-Peak_Displacement'] !== undefined) {
          console.log(`      ✅ Peak-to-Peak_Displacement: ${axisData['Peak-to-Peak_Displacement']}`);
        } else if (axisData['Peak-to-Peak Displacement'] !== undefined) {
          console.log(`      ✅ Peak-to-Peak Displacement: ${axisData['Peak-to-Peak Displacement']}`);
        } else {
          console.log(`      ❌ Peak-to-Peak Displacement: NO ENCONTRADO`);
        }
        
        // Mostrar otras métricas importantes
        ['OAVelocity', 'Peakmg', 'RMSmg', 'Kurtosis', 'CrestFactor'].forEach(metric => {
          if (axisData[metric] !== undefined) {
            console.log(`      📊 ${metric}: ${axisData[metric]}`);
          }
        });
      });
    }
    
    // Mostrar estructura completa para debugging
    console.log('\n🔍 ESTRUCTURA COMPLETA DEL PAYLOAD:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Verificar específicamente TempHumi
    if (payload.TempHumi !== undefined) {
        console.log(`🌡️ TempHumi encontrado: ${payload.TempHumi} (tipo: ${typeof payload.TempHumi})`);
    } else {
        console.log('❌ TempHumi NO encontrado en el payload');
    }
    
    // Verificar otros tipos de datos
    if (payload.TempHumi) {
      console.log(`   🌡️ Contiene datos de TempHumi: ${payload.TempHumi.SenVal}`);
    }
    
    if (payload.Device) {
      console.log(`   🔋 Contiene datos de Device:`, Object.keys(payload.Device));
    }
    
    // Intentar extraer lecturas usando PayloadService
    try {
      const readings = payloadService.extractSensorReadings(payload);
      console.log(`\n📋 LECTURAS EXTRAÍDAS: ${readings.length}`);
      
      readings.forEach((reading, index) => {
        if (reading.type === 'vibration') {
          console.log(`   📈 Lectura ${index + 1} - Eje ${reading.axis}:`);
          console.log(`      Métricas: ${Object.keys(reading.data).filter(k => !['sensor_id', 'axis', 'timestamp'].includes(k)).join(', ')}`);
          
          if (reading.data.peak_to_peak_displacement !== undefined) {
            console.log(`      ✅ peak_to_peak_displacement extraído: ${reading.data.peak_to_peak_displacement}`);
          }
        } else if (reading.type === 'temperature') {
          console.log(`   🌡️ Lectura ${index + 1} - Temperatura:`);
          console.log(`      Valor: ${reading.value} ${reading.unit}`);
          console.log(`      Métrica: ${reading.metric}`);
          console.log(`      ✅ Temperatura procesada correctamente`);
        }
      });
    } catch (extractError) {
      console.log(`   ❌ Error al extraer lecturas: ${extractError.message}`);
    }
    
    // Rastrear estadísticas por sensor
    if (!sensorMessages.has(sensorId)) {
      sensorMessages.set(sensorId, 0);
    }
    sensorMessages.set(sensorId, sensorMessages.get(sensorId) + 1);
    
    console.log(`\n📊 ESTADÍSTICAS:`);
    console.log(`   Total mensajes: ${messageCount}`);
    console.log(`   Sensores únicos: ${sensorMessages.size}`);
    sensorMessages.forEach((count, id) => {
      console.log(`   - Sensor ${id}: ${count} mensajes`);
    });
    
  } catch (error) {
    console.error(`❌ Error al procesar mensaje:`, error.message);
    console.error(`📄 Mensaje problemático:`, message.toString().substring(0, 500));
  }
  
  console.log(`\n${'='.repeat(80)}`);
});

// Manejar errores de conexión
client.on('error', (error) => {
  console.error('❌ Error de conexión MQTT:', error);
});

// Manejar desconexión
client.on('close', () => {
  console.log('🔌 Conexión MQTT cerrada');
});

// Manejar reconexión
client.on('reconnect', () => {
  console.log('🔄 Intentando reconectar...');
});

// Manejar cierre del proceso
process.on('SIGINT', () => {
  console.log('\n\n🛑 Cerrando analizador MQTT...');
  console.log(`\n📊 RESUMEN FINAL:`);
  console.log(`   Total mensajes procesados: ${messageCount}`);
  console.log(`   Sensores únicos detectados: ${sensorMessages.size}`);
  
  if (sensorMessages.size > 0) {
    console.log(`\n📋 DETALLE POR SENSOR:`);
    sensorMessages.forEach((count, id) => {
      console.log(`   - Sensor ${id}: ${count} mensajes`);
    });
  }
  
  client.end();
  process.exit(0);
});

console.log('💡 Presiona Ctrl+C para detener el analizador\n');