// Servicio MQTT - Principio de Responsabilidad Única
const mqtt = require('mqtt');
const environmentConfig = require('../config/environment');
const { MQTT_TOPICS } = require('../config/constants');

class MQTTService {
  constructor() {
    this.client = null;
    this.messageHandlers = [];
    this.isConnected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(environmentConfig.mqttBrokerUrl, {
        clientId: `vibrai-backend-${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: 5000
      });

      this.client.on('connect', () => {
        console.log(`[MQTT] Conectado exitosamente al broker MQTT en ${environmentConfig.mqttBrokerUrl}`);
        this.isConnected = true;
        resolve();
      });

      this.client.on('error', (error) => {
        console.error('[MQTT] Error en la conexión con el cliente MQTT:', error);
        this.isConnected = false;
        reject(error);
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.client.on('close', () => {
        console.log('[MQTT] Conexión MQTT cerrada');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        console.log('[MQTT] Reconectando al broker MQTT...');
      });
    });
  }

  async subscribe(topic) {
    if (!this.client || !this.isConnected) {
      throw new Error('Cliente MQTT no conectado');
    }

    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, (err) => {
        if (!err) {
          console.log(`[MQTT] Suscripción exitosa al tópico: ${topic}`);
          resolve();
        } else {
          console.error('[MQTT] Error al intentar suscribirse:', err);
          reject(err);
        }
      });
    });
  }

  setMessageHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('El handler debe ser una función');
    }
    this.messageHandlers = [handler];
  }

  addMessageHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('El handler debe ser una función');
    }
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler) {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  async handleMessage(topic, message) {
    console.log(`[MQTT] Mensaje recibido en el tópico: ${topic}`);
    console.log(`[MQTT] Tamaño del mensaje: ${message.length} bytes`);
    
    // Debug: Mostrar contenido del mensaje (limitado para evitar spam)
    try {
      const messageStr = message.toString();
      const preview = messageStr.length > 200 ? messageStr.substring(0, 200) + '...' : messageStr;
      console.log(`[MQTT] Contenido del mensaje: ${preview}`);
      
      // Intentar parsear como JSON para mostrar estructura
      const parsed = JSON.parse(messageStr);
      console.log(`[MQTT] Estructura del mensaje:`, Object.keys(parsed));
    } catch (e) {
      console.log(`[MQTT] Mensaje no es JSON válido o error al parsear`);
    }
    
    for (const handler of this.messageHandlers) {
      try {
        await handler(topic, message);
      } catch (error) {
        console.error(`[MQTT] Error en handler de mensaje para tópico ${topic}:`, error.message);
      }
    }
  }

  publish(topic, message, options = {}) {
    if (!this.client || !this.isConnected) {
      throw new Error('Cliente MQTT no conectado');
    }

    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, options, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async disconnect() {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(() => {
          this.isConnected = false;
          console.log('[MQTT] Cliente MQTT desconectado');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  isConnected() {
    return this.isConnected;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      client: this.client !== null
    };
  }

  // Método para extraer el código del sensor del tópico
  extractSensorCode(topic) {
    const topicParts = topic.split('/');
    const sensorCode = topicParts[1];

    if (!sensorCode) {
      throw new Error(`Tópico no sigue un formato esperado (Advantech/SENSOR_CODE): ${topic}`);
    }

    return sensorCode;
  }

  // Método para parsear el payload del mensaje
  parseMessage(message) {
    try {
      return JSON.parse(message.toString());
    } catch (error) {
      throw new Error(`Error al parsear mensaje MQTT: ${error.message}`);
    }
  }
}

module.exports = MQTTService;