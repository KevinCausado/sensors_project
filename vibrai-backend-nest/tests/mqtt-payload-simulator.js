const mqtt = require('mqtt');

// Configuración MQTT
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_TOPIC = 'sensors/data';

// Payload de prueba con Peak-to-Peak Displacement
const createTestPayload = () => {
  const baseOAVelocity = 2 + Math.random() * 8; // Entre 2 y 10 mm/s
  
  return {
    "SensorCode": "WISE6610",
    "Data": {
      "Accelerometer": {
        "X-Axis": { 
          "SenEvent": 1, 
          "OAVelocity": parseFloat((baseOAVelocity * (0.9 + Math.random() * 0.2)).toFixed(2)),
          "Peak": parseFloat((baseOAVelocity * 1.414 * (0.9 + Math.random() * 0.2)).toFixed(2)),
          "RMS": parseFloat((baseOAVelocity * 0.707 * (0.9 + Math.random() * 0.2)).toFixed(2)),
          "Kurtosis": parseFloat((3 + Math.random() * 2 - 1).toFixed(2)),
          "CrestFactor": parseFloat((1.4 + Math.random() * 0.2).toFixed(2)),
          "Skewness": parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)),
          "Deviation": parseFloat((Math.random() * 0.2).toFixed(3)),
          "Peak-to-Peak Displacement": parseFloat((baseOAVelocity * 0.3 * (0.8 + Math.random() * 0.4)).toFixed(2))
        },
        "Y-Axis": { 
          "SenEvent": 1, 
          "OAVelocity": parseFloat((baseOAVelocity * (0.8 + Math.random() * 0.4)).toFixed(2)),
          "Peak": parseFloat((baseOAVelocity * 1.414 * (0.8 + Math.random() * 0.4)).toFixed(2)),
          "RMS": parseFloat((baseOAVelocity * 0.707 * (0.8 + Math.random() * 0.4)).toFixed(2)),
          "Kurtosis": parseFloat((3 + Math.random() * 2 - 1).toFixed(2)),
          "CrestFactor": parseFloat((1.4 + Math.random() * 0.2).toFixed(2)),
          "Skewness": parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)),
          "Deviation": parseFloat((Math.random() * 0.2).toFixed(3)),
          "Peak-to-Peak Displacement": parseFloat((baseOAVelocity * 0.25 * (0.8 + Math.random() * 0.4)).toFixed(2))
        },
        "Z-Axis": { 
          "SenEvent": 1, 
          "OAVelocity": parseFloat((baseOAVelocity * (0.7 + Math.random() * 0.6)).toFixed(2)),
          "Peak": parseFloat((baseOAVelocity * 1.414 * (0.7 + Math.random() * 0.6)).toFixed(2)),
          "RMS": parseFloat((baseOAVelocity * 0.707 * (0.7 + Math.random() * 0.6)).toFixed(2)),
          "Kurtosis": parseFloat((3 + Math.random() * 2 - 1).toFixed(2)),
          "CrestFactor": parseFloat((1.4 + Math.random() * 0.2).toFixed(2)),
          "Skewness": parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)),
          "Deviation": parseFloat((Math.random() * 0.2).toFixed(3)),
          "Peak-to-Peak Displacement": parseFloat((baseOAVelocity * 0.35 * (0.8 + Math.random() * 0.4)).toFixed(2))
        }
      },
      "Temperature": { 
        "Value": parseFloat((20 + Math.random() * 15).toFixed(1))
      },
      "DeviceStatus": { 
        "BatteryVolt": parseFloat((3.8 + Math.random() * 0.4).toFixed(2))
      }
    }
  };
};

console.log('🚀 Iniciando simulador MQTT con Peak-to-Peak Displacement...');
console.log(`📡 Conectando a: ${MQTT_BROKER_URL}`);
console.log(`📤 Publicando en tópico: ${MQTT_TOPIC}`);

// Crear cliente MQTT
const client = mqtt.connect(MQTT_BROKER_URL, {
  clientId: `vibrai-backend-simulator-${Math.random().toString(16).substr(2, 8)}`,
  clean: true,
  connectTimeout: 30000,
  reconnectPeriod: 5000
});

client.on('connect', () => {
  console.log('✅ Conectado al broker MQTT');
  
  // Enviar payload cada 10 segundos
  setInterval(() => {
    const payload = createTestPayload();
    const message = JSON.stringify(payload);
    
    console.log(`\n📤 Enviando payload MQTT...`);
    console.log(`   OAVelocity X: ${payload.Data.Accelerometer['X-Axis'].OAVelocity} mm/s`);
    console.log(`   Peak-to-Peak Displacement X: ${payload.Data.Accelerometer['X-Axis']['Peak-to-Peak Displacement']} μm`);
    console.log(`   OAVelocity Y: ${payload.Data.Accelerometer['Y-Axis'].OAVelocity} mm/s`);
    console.log(`   Peak-to-Peak Displacement Y: ${payload.Data.Accelerometer['Y-Axis']['Peak-to-Peak Displacement']} μm`);
    console.log(`   OAVelocity Z: ${payload.Data.Accelerometer['Z-Axis'].OAVelocity} mm/s`);
    console.log(`   Peak-to-Peak Displacement Z: ${payload.Data.Accelerometer['Z-Axis']['Peak-to-Peak Displacement']} μm`);
    
    client.publish(MQTT_TOPIC, message, (err) => {
      if (err) {
        console.error('❌ Error al publicar:', err);
      } else {
        console.log('✅ Payload enviado exitosamente');
      }
    });
  }, 10000);
});

client.on('error', (err) => {
  console.error('❌ Error de conexión MQTT:', err);
});

client.on('close', () => {
  console.log('🔌 Conexión MQTT cerrada');
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando simulador MQTT...');
  client.end();
  process.exit(0);
});