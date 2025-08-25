// Servicio de Alertas - Principio de Responsabilidad Única
const { 
  ALERT_TYPES, 
  ALERT_PRIORITIES, 
  CONNECTIVITY_TIMEOUT_MINUTES 
} = require('../config/constants');

class AlertService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  // Obtiene el valor numérico de prioridad para comparaciones
  getPriorityValue(priority) {
    const priorityMap = { 
      [ALERT_PRIORITIES.LOW]: 1, 
      [ALERT_PRIORITIES.MEDIUM]: 2, 
      [ALERT_PRIORITIES.HIGH]: 3 
    };
    return priorityMap[priority] || 0;
  }

  // Determina si una condición es normal
  isNormalCondition(status) {
    const normalStatuses = [
      'Normal', 
      'Satisfactoria', 
      'Buena', 
      'No Definido', 
      'Perfil Incompleto', 
      'N/A'
    ];
    
    const statusBase = typeof status === 'string' && status.includes(' (') 
      ? status.split(' (')[0] 
      : status;
    
    return normalStatuses.includes(statusBase);
  }

  // Crea una alerta de datos anómalos
  createDataIssueAlert(sensor, reading) {
    return {
      type: ALERT_TYPES.DATA_ISSUE,
      priority: ALERT_PRIORITIES.MEDIUM,
      title: `Lectura Anómala en ${sensor.name}`,
      message: `Se detectó un pico de datos anómalo en el sensor ${sensor.name}. Valor registrado: ${reading.value.toFixed(2)} ${reading.unit}. Esta lectura ha sido ignorada para el análisis, pero se recomienda revisar el sensor.`
    };
  }

  // Crea alertas de vibración
  createVibrationAlert(sensor, reading, finalStatus) {
    const statusParts = finalStatus.match(/(.*) \(Zona ([A-D])\)/);
    
    if (statusParts) {
      const severity = statusParts[2];
      
      switch (severity) {
        case 'C':
          return {
            type: ALERT_TYPES.VIBRATION,
            priority: ALERT_PRIORITIES.MEDIUM,
            title: `Alerta de Vibración: Vibración en Zona C (Insatisfactoria)`,
            message: `El sensor '${sensor.name}' reporta ${reading.value.toFixed(2)} ${reading.unit}. Condición no apta para operación continua.`
          };
        case 'D':
          return {
            type: ALERT_TYPES.VIBRATION,
            priority: ALERT_PRIORITIES.HIGH,
            title: `Alerta de Vibración: Vibración en Zona D (Inaceptable)`,
            message: `¡Peligro de Daño! El sensor '${sensor.name}' reporta ${reading.value.toFixed(2)} ${reading.unit}.`
          };
        default:
          return null;
      }
    } else {
      // Lógica para ISO 10816
      const statusBase = finalStatus.includes(' (') ? finalStatus.split(' (')[0] : finalStatus;
      
      switch (statusBase) {
        case 'Alerta':
          return {
            type: ALERT_TYPES.VIBRATION,
            priority: ALERT_PRIORITIES.MEDIUM,
            title: `Vibración en Alerta`,
            message: `El sensor '${sensor.name}' ha entrado en estado de Alerta con un valor de ${reading.value.toFixed(2)} ${reading.unit}.`
          };
        case 'Precaucion':
          return {
            type: ALERT_TYPES.VIBRATION,
            priority: ALERT_PRIORITIES.HIGH,
            title: `Vibración en Precaución`,
            message: `¡Atención! El sensor '${sensor.name}' ha entrado en estado de Precaución con un valor de ${reading.value.toFixed(2)} ${reading.unit}.`
          };
        case 'Peligro':
          return {
            type: ALERT_TYPES.VIBRATION,
            priority: ALERT_PRIORITIES.HIGH,
            title: `Vibración en Peligro`,
            message: `¡Peligro de Daño! El sensor '${sensor.name}' ha entrado en estado de Peligro con un valor de ${reading.value.toFixed(2)} ${reading.unit}.`
          };
        default:
          return null;
      }
    }
  }

  // Crea alertas de temperatura
  createTemperatureAlert(sensor, reading, finalStatus) {
    const tempValue = reading.value;
    const thresholds = sensor.thresholds || {};

    if (tempValue > thresholds.criticalMax || tempValue < thresholds.criticalMin) {
      const direction = tempValue > thresholds.criticalMax ? 'Alta' : 'Baja';
      const limit = tempValue > thresholds.criticalMax ? thresholds.criticalMax : thresholds.criticalMin;
      
      return {
        type: ALERT_TYPES.TEMPERATURE,
        priority: ALERT_PRIORITIES.HIGH,
        title: `Alerta de Temperatura: Nivel Crítico (${direction})`,
        message: `¡Riesgo Crítico! El sensor '${sensor.name}' registra ${tempValue.toFixed(2)}°C, superando el umbral crítico de ${limit}°C.`
      };
    } else if ((tempValue > thresholds.normalMax && tempValue <= thresholds.criticalMax) || 
               (tempValue < thresholds.normalMin && tempValue >= thresholds.criticalMin)) {
      const direction = tempValue > thresholds.normalMax ? 'Alta' : 'Baja';
      const limit = tempValue > thresholds.normalMax ? thresholds.normalMax : thresholds.normalMin;
      
      return {
        type: ALERT_TYPES.TEMPERATURE,
        priority: ALERT_PRIORITIES.MEDIUM,
        title: `Alerta de Temperatura: Nivel Advertencia (${direction})`,
        message: `Advertencia: El sensor '${sensor.name}' registra ${tempValue.toFixed(2)}°C, fuera del rango normal (Límite: ${limit}°C).`
      };
    }

    return null;
  }

  // Crea alerta de batería baja
  createBatteryAlert(sensor, reading) {
    return {
      type: ALERT_TYPES.BATTERY,
      priority: ALERT_PRIORITIES.HIGH,
      title: `Alerta de Dispositivo: Batería Baja`,
      message: `El nivel de batería del sensor '${sensor.name}' es de ${reading.value.toFixed(2)} V.`
    };
  }

  // Gestiona las alertas principales
  async manageAlerts(sensor, reading, finalStatus, sensorType) {
    let alertConfig = null;

    // Determinar tipo de alerta
    if (finalStatus === 'data_issue') {
      alertConfig = this.createDataIssueAlert(sensor, reading);
    } else if (!this.isNormalCondition(finalStatus)) {
      if (sensorType === ALERT_TYPES.VIBRATION) {
        alertConfig = this.createVibrationAlert(sensor, reading, finalStatus);
      } else if (sensorType === ALERT_TYPES.TEMPERATURE) {
        alertConfig = this.createTemperatureAlert(sensor, reading, finalStatus);
      }
    } else if (sensorType === 'low_battery') {
      alertConfig = this.createBatteryAlert(sensor, reading);
    }

    if (alertConfig) {
      await this.processAlert(sensor, alertConfig, reading.value);
    } else {
      await this.resolveAlert(sensor, sensorType);
    }
  }

  // Procesa una alerta (crear o actualizar)
  async processAlert(sensor, alertConfig, value) {
    try {
      const existingAlert = await this.databaseService.getActiveAlert(
        sensor.id, 
        alertConfig.type
      );

      if (existingAlert) {
        const currentPriorityValue = this.getPriorityValue(existingAlert.priority);
        const newPriorityValue = this.getPriorityValue(alertConfig.priority);

        console.log(`[ALERTS] Condición de alerta de '${alertConfig.type}' persiste para sensor ${sensor.name}.`);

        if (newPriorityValue >= currentPriorityValue) {
          console.log(`[ALERTS] Actualizando prioridad de alerta de '${alertConfig.type}' para sensor ${sensor.name} de ${existingAlert.priority} a ${alertConfig.priority}.`);
          
          await this.databaseService.updateAlert(existingAlert.id, {
            title: alertConfig.title,
            description: alertConfig.message,
            priority: alertConfig.priority,
            value_at_alert: value,
            updated_at: new Date().toISOString(),
          });
        } else {
          console.log(`[ALERTS] Nueva prioridad (${alertConfig.priority}) es menor que la actual (${existingAlert.priority}). No se actualizará la alerta para evitar spam.`);
        }
      } else {
        console.log(`[ALERTS] Creando nueva alerta de '${alertConfig.type}' para sensor ${sensor.name}`);
        
        await this.databaseService.createAlert({
          organization_id: sensor.organization_id,
          sensor_id: sensor.id,
          asset_id: sensor.asset_id,
          type: alertConfig.type,
          title: alertConfig.title,
          description: alertConfig.message,
          priority: alertConfig.priority,
          status: 'active',
          value_at_alert: value,
          alert_time: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`[ALERTS] Error al procesar alerta:`, error.message);
    }
  }

  // Resuelve alertas de un tipo específico
  async resolveAlert(sensor, alertType) {
    try {
      await this.databaseService.resolveAlerts(sensor.id, [alertType]);
      console.log(`[ALERTS] Resolviendo alertas de tipo '${alertType}' para el sensor '${sensor.name}'.`);
    } catch (error) {
      console.error(`[ALERTS] Error al resolver alertas:`, error.message);
    }
  }

  // Maneja alertas de conectividad
  async manageConnectivityAlert(sensor) {
    const alertTitle = `Alerta de Conectividad: Pérdida de Conexión con '${sensor.name}'`;
    const alertMessage = `El sensor '${sensor.name}' ha perdido la conexión. No se han recibido datos en los últimos ${CONNECTIVITY_TIMEOUT_MINUTES} minutos.`;

    try {
      const existingAlert = await this.databaseService.getActiveAlert(
        sensor.id, 
        ALERT_TYPES.CONNECTIVITY
      );

      if (!existingAlert) {
        await this.databaseService.createAlert({
          organization_id: sensor.organization_id,
          sensor_id: sensor.id,
          asset_id: sensor.asset_id,
          type: ALERT_TYPES.CONNECTIVITY,
          title: alertTitle,
          description: alertMessage,
          priority: ALERT_PRIORITIES.HIGH,
          status: 'active',
          alert_time: new Date().toISOString()
        });
        
        console.log(`[ALERTS] Creada nueva alerta de 'connectivity' para el sensor '${sensor.name}'.`);
      }
    } catch (error) {
      console.error(`[CONNECTIVITY ALERT] Error al crear alerta de conectividad:`, error.message);
    }
  }

  // Resuelve alertas de conectividad
  async resolveConnectivityAlert(sensor) {
    try {
      await this.databaseService.resolveAlerts(sensor.id, [ALERT_TYPES.CONNECTIVITY]);
      console.log(`[CONNECTIVITY RESOLVE] Alerta de conectividad resuelta para el sensor ${sensor.name}.`);
    } catch (error) {
      console.error(`[CONNECTIVITY RESOLVE] Error al resolver alerta de conectividad:`, error.message);
    }
  }

  // Maneja alertas de cambio de estado
  async manageStatusChangeAlert(sensor, newStatus) {
    if (newStatus === 'active') {
      await this.databaseService.resolveAlerts(
        sensor.id, 
        [ALERT_TYPES.STATUS_CHANGE]
      );
      console.log(`[ALERTS] Alerta de cambio de estado resuelta para el sensor '${sensor.name}' (volvió a estar activo).`);
    }
  }

  // Resuelve alertas de batería para múltiples sensores
  async resolveBatteryAlerts(sensorIds) {
    try {
      await this.databaseService.resolveBatteryAlerts(sensorIds);
    } catch (error) {
      console.error(`[BATTERY ALERTS] Error al resolver alertas de batería:`, error.message);
    }
  }
}

module.exports = AlertService;