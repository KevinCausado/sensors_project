// Servicio de Conectividad - Principio de Responsabilidad Única
const { CONNECTIVITY_TIMEOUT_MINUTES, SENSOR_STATUS } = require('../config/constants');

class ConnectivityService {
  constructor(databaseService, alertService) {
    this.databaseService = databaseService;
    this.alertService = alertService;
    this.connectivityCheckInterval = null;
  }

  // Inicia el monitoreo de conectividad
  startConnectivityMonitoring() {
    console.log('[CONNECTIVITY] Iniciando monitoreo de conectividad de sensores...');
    
    this.connectivityCheckInterval = setInterval(async () => {
      await this.checkSensorConnectivity();
    }, CONNECTIVITY_TIMEOUT_MINUTES * 60 * 1000);
  }

  // Detiene el monitoreo de conectividad
  stopConnectivityMonitoring() {
    if (this.connectivityCheckInterval) {
      clearInterval(this.connectivityCheckInterval);
      this.connectivityCheckInterval = null;
      console.log('[CONNECTIVITY] Monitoreo de conectividad detenido.');
    }
  }

  // Verifica la conectividad de todos los sensores
  async checkSensorConnectivity() {
    try {
      console.log('[CONNECTIVITY] Verificando conectividad de sensores...');
      
      const sensors = await this.databaseService.getAllSensors();
      const timeoutDate = new Date(Date.now() - CONNECTIVITY_TIMEOUT_MINUTES * 60 * 1000);
      
      for (const sensor of sensors) {
        await this.checkIndividualSensorConnectivity(sensor, timeoutDate);
      }
      
      console.log('[CONNECTIVITY] Verificación de conectividad completada.');
    } catch (error) {
      console.error('[CONNECTIVITY] Error al verificar conectividad de sensores:', error.message);
    }
  }

  // Verifica la conectividad de un sensor individual
  async checkIndividualSensorConnectivity(sensor, timeoutDate) {
    try {
      const lastReading = await this.databaseService.getLastReading(sensor.id);
      
      if (!lastReading || new Date(lastReading.timestamp) < timeoutDate) {
        await this.handleSensorDisconnection(sensor);
      } else {
        await this.handleSensorReconnection(sensor);
      }
    } catch (error) {
      console.error(`[CONNECTIVITY] Error al verificar sensor ${sensor.name}:`, error.message);
    }
  }

  // Maneja la desconexión de un sensor
  async handleSensorDisconnection(sensor) {
    if (sensor.status !== SENSOR_STATUS.ERROR) {
      console.log(`[CONNECTIVITY] Sensor ${sensor.name} sin lecturas recientes. Marcando como 'error'.`);
      
      await this.databaseService.updateSensorStatus(sensor.id, SENSOR_STATUS.ERROR);
      await this.alertService.manageConnectivityAlert(sensor);
    }
  }

  // Maneja la reconexión de un sensor
  async handleSensorReconnection(sensor) {
    if (sensor.status === SENSOR_STATUS.ERROR) {
      console.log(`[CONNECTIVITY] Sensor ${sensor.name} ha vuelto a conectarse. Marcando como 'active'.`);
      
      await this.databaseService.updateSensorStatus(sensor.id, SENSOR_STATUS.ACTIVE);
      await this.alertService.resolveConnectivityAlert(sensor);
    }
  }

  // Procesa el estado de conectividad cuando llega una nueva lectura
  async processConnectivityOnReading(sensor) {
    try {
      // Si el sensor estaba en error, marcarlo como activo y resolver alertas
      if (sensor.status === SENSOR_STATUS.ERROR) {
        await this.databaseService.updateSensorStatus(sensor.id, SENSOR_STATUS.ACTIVE);
        await this.alertService.resolveConnectivityAlert(sensor);
        await this.alertService.manageStatusChangeAlert(sensor, SENSOR_STATUS.ACTIVE);
        
        console.log(`[CONNECTIVITY] Sensor ${sensor.name} reconectado y marcado como activo.`);
      }
    } catch (error) {
      console.error(`[CONNECTIVITY] Error al procesar conectividad para sensor ${sensor.name}:`, error.message);
    }
  }
}

module.exports = ConnectivityService;