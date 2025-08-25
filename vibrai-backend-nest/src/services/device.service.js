// Servicio de Dispositivo - Principio de Responsabilidad Única
const { BATTERY_LOW_THRESHOLD } = require('../config/constants');

class DeviceService {
  constructor(databaseService, alertService) {
    this.databaseService = databaseService;
    this.alertService = alertService;
  }

  // Procesa el estado del dispositivo
  async processDeviceStatus(sensor, deviceInfo) {
    if (!deviceInfo) return;

    try {
      // Procesar voltaje de batería
      if (deviceInfo.batteryVoltage !== null) {
        await this.processBatteryStatus(sensor, deviceInfo.batteryVoltage);
      }

      // Procesar eventos del dispositivo
      if (deviceInfo.events) {
        await this.processDeviceEvents(sensor, deviceInfo.events);
      }

      // Actualizar información del dispositivo en la base de datos
      await this.updateDeviceInfo(sensor, deviceInfo);

    } catch (error) {
      console.error(`[DEVICE] Error al procesar estado del dispositivo para sensor ${sensor.name}:`, error.message);
    }
  }

  // Procesa el estado de la batería
  async processBatteryStatus(sensor, batteryVoltage) {
    try {
      console.log(`[DEVICE] Procesando batería para sensor ${sensor.name}: ${batteryVoltage}V`);

      if (batteryVoltage < BATTERY_LOW_THRESHOLD) {
        console.log(`[DEVICE] Batería baja detectada en sensor ${sensor.name}: ${batteryVoltage}V`);
        
        // Crear lectura de batería para el sistema de alertas
        const batteryReading = {
          type: 'battery',
          metric: 'voltage',
          value: batteryVoltage,
          unit: 'V',
          timestamp: new Date().toISOString()
        };

        // Gestionar alerta de batería baja
        await this.alertService.manageAlerts(sensor, batteryReading, 'low_battery', 'low_battery');
      } else {
        // Resolver alertas de batería si el nivel es normal
        await this.alertService.resolveBatteryAlerts([sensor.id]);
      }

      // Guardar lectura de batería
      await this.saveBatteryReading(sensor, batteryVoltage);

    } catch (error) {
      console.error(`[DEVICE] Error al procesar batería para sensor ${sensor.name}:`, error.message);
    }
  }

  // Procesa eventos del dispositivo
  async processDeviceEvents(sensor, events) {
    try {
      console.log(`[DEVICE] Procesando eventos para sensor ${sensor.name}:`, events);

      // Aquí se pueden agregar lógicas específicas para diferentes tipos de eventos
      // Por ejemplo: reinicio del dispositivo, errores de hardware, etc.
      
      // Guardar eventos en la base de datos
      await this.saveDeviceEvents(sensor, events);

    } catch (error) {
      console.error(`[DEVICE] Error al procesar eventos para sensor ${sensor.name}:`, error.message);
    }
  }

  // Guarda una lectura de batería
  async saveBatteryReading(sensor, batteryVoltage) {
    try {
      const reading = {
        sensor_id: sensor.id,
        organization_id: sensor.organization_id,
        asset_id: sensor.asset_id,
        type: 'battery',
        axis: null,
        metric: 'voltage',
        value: batteryVoltage,
        unit: 'V',
        timestamp: new Date().toISOString()
      };

      await this.databaseService.saveReading(reading);
      console.log(`[DEVICE] Lectura de batería guardada para sensor ${sensor.name}: ${batteryVoltage}V`);

    } catch (error) {
      console.error(`[DEVICE] Error al guardar lectura de batería:`, error.message);
    }
  }

  // Guarda eventos del dispositivo
  async saveDeviceEvents(sensor, events) {
    try {
      // Implementar lógica para guardar eventos en la base de datos
      // Esto podría ser una tabla separada para eventos de dispositivos
      console.log(`[DEVICE] Eventos guardados para sensor ${sensor.name}:`, events);

    } catch (error) {
      console.error(`[DEVICE] Error al guardar eventos del dispositivo:`, error.message);
    }
  }

  // Actualiza información del dispositivo
  async updateDeviceInfo(sensor, deviceInfo) {
    try {
      const updateData = {};

      if (deviceInfo.sequenceNumber !== null) {
        updateData.last_sequence_number = deviceInfo.sequenceNumber;
      }

      if (deviceInfo.batteryVoltage !== null) {
        updateData.last_battery_voltage = deviceInfo.batteryVoltage;
      }

      if (deviceInfo.powerSource !== null) {
        updateData.power_source = deviceInfo.powerSource;
      }

      if (Object.keys(updateData).length > 0) {
        updateData.last_seen = new Date().toISOString();
        await this.databaseService.updateSensorDeviceInfo(sensor.id, updateData);
      }

    } catch (error) {
      console.error(`[DEVICE] Error al actualizar información del dispositivo:`, error.message);
    }
  }

  // Obtiene el estado de salud del dispositivo
  getDeviceHealthStatus(sensor, deviceInfo) {
    const health = {
      battery: 'unknown',
      connectivity: 'unknown',
      overall: 'unknown'
    };

    // Evaluar estado de la batería
    if (deviceInfo && deviceInfo.batteryVoltage !== null) {
      if (deviceInfo.batteryVoltage >= BATTERY_LOW_THRESHOLD + 0.5) {
        health.battery = 'good';
      } else if (deviceInfo.batteryVoltage >= BATTERY_LOW_THRESHOLD) {
        health.battery = 'warning';
      } else {
        health.battery = 'critical';
      }
    }

    // Evaluar conectividad basada en el estado del sensor
    switch (sensor.status) {
      case 'active':
        health.connectivity = 'good';
        break;
      case 'inactive':
        health.connectivity = 'warning';
        break;
      case 'error':
        health.connectivity = 'critical';
        break;
      default:
        health.connectivity = 'unknown';
    }

    // Determinar estado general
    if (health.battery === 'critical' || health.connectivity === 'critical') {
      health.overall = 'critical';
    } else if (health.battery === 'warning' || health.connectivity === 'warning') {
      health.overall = 'warning';
    } else if (health.battery === 'good' && health.connectivity === 'good') {
      health.overall = 'good';
    } else {
      health.overall = 'unknown';
    }

    return health;
  }
}

module.exports = DeviceService;