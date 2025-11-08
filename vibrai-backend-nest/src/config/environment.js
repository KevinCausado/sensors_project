// Configuración de variables de entorno
require('dotenv').config();

class EnvironmentConfig {
  constructor() {
    this.validateRequiredEnvVars();
  }

  get supabaseUrl() {
    return process.env.SUPABASE_URL;
  }

  get supabaseKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  get mqttBrokerUrl() {
    return process.env.MQTT_BROKER_URL || 'mqtt://direct.miobox.io';
  }

  get mqttUsername() {
    return process.env.MQTT_USERNAME;
  }

  get mqttPassword() {
    return process.env.MQTT_PASSWORD;
  }

  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  }

  get timezone() {
    return process.env.TZ || 'America/Santiago';
  }

  validateRequiredEnvVars() {
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error(`Error: Faltan las siguientes variables de entorno: ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  isProduction() {
    return this.nodeEnv === 'production';
  }

  isDevelopment() {
    return this.nodeEnv === 'development';
  }
}

module.exports = new EnvironmentConfig();