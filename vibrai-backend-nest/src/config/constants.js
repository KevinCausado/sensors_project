// Constantes de configuración del sistema
module.exports = {
  // Umbrales de análisis
  SPIKE_THRESHOLD_MULTIPLIER: 5,
  SPIKE_MIN_ABSOLUTE_VALUE: 20, // Ajustado para valores convertidos (antes 20.0)
  
  // Configuración de conectividad
  CONNECTIVITY_TIMEOUT_MINUTES: 15,
  CONNECTIVITY_CHECK_INTERVAL_MINUTES: 5,
  
  // Configuración de dispositivos
  LOW_BATTERY_THRESHOLD_VOLT: 3.2,
  
  // Tópicos MQTT
  MQTT_TOPICS: ['Advantech/#'],
  
  // Estados de sensores
  SENSOR_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    MAINTENANCE: 'maintenance',
    ERROR: 'error'
  },
  
  // Tipos de alertas
  ALERT_TYPES: {
    VIBRATION: 'vibration',
    TEMPERATURE: 'temperature',
    CONNECTIVITY: 'connectivity',
    BATTERY: 'battery',
    DATA_ISSUE: 'data_issue',
    STATUS_CHANGE: 'status_change'
  },
  
  // Prioridades de alertas
  ALERT_PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  }
};