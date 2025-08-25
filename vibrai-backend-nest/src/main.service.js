// Servicio Principal - Orquestador de la aplicación
const DatabaseService = require('./services/database.service');
const MqttService = require('./services/mqtt.service');
const AnalysisService = require('./services/analysis.service');
const AlertService = require('./services/alert.service');
const ConnectivityService = require('./services/connectivity.service');
const PayloadService = require('./services/payload.service');
const DeviceService = require('./services/device.service');

class MainService {
  constructor() {
    // Inicializar servicios siguiendo el patrón de inyección de dependencias
    this.databaseService = new DatabaseService();
    this.alertService = new AlertService(this.databaseService);
    this.connectivityService = new ConnectivityService(this.databaseService, this.alertService);
    this.payloadService = new PayloadService(this.databaseService);
    this.deviceService = new DeviceService(this.databaseService, this.alertService);
    this.analysisService = new AnalysisService(this.databaseService);
    this.mqttService = new MqttService();
    
    this.isRunning = false;
  }

  // Inicia todos los servicios
  async start() {
    try {
      console.log('[MAIN] Iniciando Basic Analysis Service...');
      
      // Inicializar conexión a la base de datos
      await this.databaseService.initialize();
      console.log('[MAIN] Conexión a base de datos establecida');

      // Configurar manejador de mensajes MQTT
      this.mqttService.setMessageHandler(this.handleMqttMessage.bind(this));

      // Conectar a MQTT
      await this.mqttService.connect();
      console.log('[MAIN] Conexión MQTT establecida');

      // Suscribirse a tópicos
      await this.mqttService.subscribe('Advantech/#');
      console.log('[MAIN] Suscrito a tópicos MQTT');

      // Iniciar monitoreo de conectividad
      this.connectivityService.startConnectivityMonitoring();

      this.isRunning = true;
      console.log('[MAIN] Basic Analysis Service iniciado correctamente');

    } catch (error) {
      console.error('[MAIN] Error al iniciar el servicio:', error.message);
      throw error;
    }
  }

  // Detiene todos los servicios
  async stop() {
    try {
      console.log('[MAIN] Deteniendo Basic Analysis Service...');
      
      this.isRunning = false;

      // Detener monitoreo de conectividad
      this.connectivityService.stopConnectivityMonitoring();

      // Desconectar MQTT
      await this.mqttService.disconnect();

      console.log('[MAIN] Basic Analysis Service detenido correctamente');

    } catch (error) {
      console.error('[MAIN] Error al detener el servicio:', error.message);
    }
  }

  // Maneja mensajes MQTT entrantes
  async handleMqttMessage(topic, message) {
    try {
      console.log(`[MQTT] Mensaje recibido en tópico: ${topic}`);

      // Extraer código del sensor del tópico
      const sensorCode = this.mqttService.extractSensorCode(topic);
      if (!sensorCode) {
        console.log(`[MQTT] No se pudo extraer código de sensor del tópico: ${topic}`);
        return;
      }

      // Procesar el payload
      const payloadResult = await this.payloadService.processPayload(sensorCode, message.toString());
      if (!payloadResult.success) {
        console.error(`[MQTT] Error al procesar payload: ${payloadResult.error}`);
        return;
      }

      const { sensors, readings, deviceInfo } = payloadResult;

      // Procesar TODOS los sensores encontrados (como basic-analysis.js)
      if (!sensors || sensors.length === 0) {
        console.log(`[MQTT] No se encontraron sensores para el código: ${sensorCode}`);
        return;
      }

      console.log(`[MQTT] Procesando ${sensors.length} sensor(es) con código ${sensorCode}:`);
      sensors.forEach((s, index) => {
        console.log(`[MQTT]   ${index + 1}. ${s.name} (ID: ${s.id}, Tipo: ${s.type})`);
      });

      // Procesar cada sensor individualmente
      for (const sensor of sensors) {
        console.log(`[MQTT] Procesando sensor: '${sensor.name}' (ID: ${sensor.id}, Tipo: ${sensor.type})`);
        
        // Verificar estado del sensor
        if (['inactive', 'maintenance'].includes(sensor.status)) {
          console.log(`[DATA IGNORED] Sensor '${sensor.name}' tiene estado '${sensor.status}'. Datos ignorados.`);
          continue;
        }

        // Procesar conectividad (marcar sensor como activo si estaba en error)
        await this.connectivityService.processConnectivityOnReading(sensor);

        // Procesar estado del dispositivo
        await this.deviceService.processDeviceStatus(sensor, deviceInfo);

        // Extraer lecturas específicas para este sensor según su tipo
        const sensorReadings = this.payloadService.extractReadingsForSensor(readings, sensor);
        
        const validReadings = this.payloadService.filterValidReadings(sensorReadings);
        if (validReadings.length === 0) {
          console.log(`[MQTT] No hay lecturas válidas para el sensor ${sensor.name} (tipo: ${sensor.type})`);
          continue;
        }

        console.log(`[MQTT] Lecturas válidas extraídas para ${sensor.name}: ${validReadings.length}`);

        // Procesar y analizar lecturas para este sensor específico
        await this.processReadings(sensor, validReadings);

        console.log(`[MQTT] Procesamiento completado para sensor ${sensor.name}`);
        
        // Actualizar timestamp de última lectura del sensor
        await this.databaseService.updateSensorLastReading(sensor.id, validReadings[0]);
      }

    } catch (error) {
      console.error('[MQTT] Error al procesar mensaje:', error.message);
    }
  }

  // Procesa las lecturas de sensores
  async processReadings(sensor, readings) {
    try {
      // Agrupar lecturas por tipo
      const groupedReadings = this.payloadService.groupReadingsByType(readings);

      // Procesar cada grupo de lecturas
      for (const [type, typeReadings] of Object.entries(groupedReadings)) {
        await this.processReadingGroup(sensor, type, typeReadings);
      }

    } catch (error) {
      console.error(`[READINGS] Error al procesar lecturas para sensor ${sensor.name}:`, error.message);
    }
  }

  // Procesa un grupo de lecturas del mismo tipo
  async processReadingGroup(sensor, type, readings) {
    try {
      console.log(`[READINGS] Procesando grupo de lecturas - Sensor: ${sensor.name}, Tipo: ${type}, Cantidad: ${readings.length}`);
      
      if (type.startsWith('vibration')) {
        // Para vibración, usar inserción en bloque optimizada
        console.log(`[READINGS] Procesando lecturas de vibración con inserción en bloque optimizada`);
        await this.saveVibrationReadingsBatch(sensor, readings);
        
        // Analizar cada lectura individualmente después de guardar en bloque
        for (const reading of readings) {
          await this.analyzeVibrationReading(sensor, reading);
        }
      } else {
        // Para otros tipos, procesar individualmente
        for (const reading of readings) {
          console.log(`[READINGS] Procesando lectura individual - Tipo: ${reading.type}, Métrica: ${reading.metric || 'N/A'}`);
          
          if (reading.type === 'temperature') {
            console.log(`[READINGS] 🌡️ DETECTADA LECTURA DE TEMPERATURA - Iniciando procesamiento completo`);
          }
          
          await this.saveReading(sensor, reading);
          
          if (reading.type === 'temperature') {
            console.log(`[READINGS] 🌡️ Iniciando análisis de temperatura...`);
            await this.analyzeReading(sensor, reading);
            console.log(`[READINGS] 🌡️ Análisis de temperatura completado`);
          }

          // Actualizar última lectura del sensor
          await this.databaseService.updateSensorLastReading(sensor.id, reading);
        }
      }

    } catch (error) {
      console.error(`[READINGS] Error al procesar grupo de lecturas ${type}:`, error.message);
    }
  }

  // Guarda una lectura de vibración completa (formato original)
  async saveVibrationReading(sensor, vibrationReading) {
    try {
      // Asignar sensor_id a los datos
      vibrationReading.data.sensor_id = sensor.id;
      
      // Guardar la lectura completa
      await this.databaseService.saveVibrationReading(vibrationReading.data);
      console.log(`[READINGS] Lectura de vibración guardada: ${sensor.name} - Eje ${vibrationReading.axis}`);
      console.log(`[READINGS] Métricas guardadas:`, Object.keys(vibrationReading.data).filter(key => key !== 'sensor_id' && key !== 'axis' && key !== 'timestamp'));

    } catch (error) {
      console.error(`[READINGS] Error al guardar lectura de vibración:`, error.message);
    }
  }

  // Guarda múltiples lecturas de vibración en un solo bloque (optimizado)
  async saveVibrationReadingsBatch(sensor, vibrationReadings) {
    try {
      console.log(`[READINGS] Guardando ${vibrationReadings.length} lecturas de vibración en bloque para sensor: ${sensor.name}`);
      
      // Preparar datos para inserción en bloque
      const readingsData = vibrationReadings.map(reading => {
        const data = { ...reading.data };
        data.sensor_id = sensor.id;
        return data;
      });
      
      // Guardar todas las lecturas en un solo bloque
      await this.databaseService.saveVibrationReadingsBatch(readingsData);
      
      console.log(`[READINGS] ✅ ${vibrationReadings.length} lecturas de vibración guardadas exitosamente en bloque: ${sensor.name}`);
      console.log(`[READINGS] Ejes procesados: ${vibrationReadings.map(r => r.axis).join(', ')}`);

      // Actualizar última lectura del sensor con formato de 3 ejes
      await this.updateVibrationSensorLastReading(sensor, vibrationReadings);

    } catch (error) {
      console.error(`[READINGS] Error al guardar lecturas de vibración en bloque:`, error.message);
      // Fallback: intentar guardar individualmente si falla el bloque
      console.log(`[READINGS] Intentando fallback con guardado individual...`);
      for (const reading of vibrationReadings) {
        try {
          await this.saveVibrationReading(sensor, reading);
        } catch (individualError) {
          console.error(`[READINGS] Error en fallback individual:`, individualError.message);
        }
      }
    }
  }

  // Actualiza la última lectura del sensor de vibración con formato de 3 ejes
  async updateVibrationSensorLastReading(sensor, vibrationReadings) {
    try {
      // Organizar lecturas por eje
      const readingsByAxis = {};
      vibrationReadings.forEach(reading => {
        readingsByAxis[reading.axis] = reading.data.oavelocity;
      });

      // Crear formato "X:valor Y:valor Z:valor mm/s"
      const axisValues = [];
      ['X', 'Y', 'Z'].forEach(axis => {
        if (readingsByAxis[axis] !== undefined) {
          axisValues.push(`${axis}:${readingsByAxis[axis]}`);
        }
      });

      const formattedValue = axisValues.join(' ');
      
      const lastReading = {
        type: 'vibration',
        value: formattedValue,
        unit: 'mm/s',
        timestamp: vibrationReadings[0].timestamp
      };

      await this.databaseService.updateSensorLastReading(sensor.id, lastReading);
      console.log(`[READINGS] ✅ Última lectura de vibración actualizada: ${sensor.name} - ${formattedValue} mm/s`);

    } catch (error) {
      console.error(`[READINGS] Error al actualizar última lectura de vibración:`, error.message);
    }
  }

  // Analiza una lectura de vibración completa
  async analyzeVibrationReading(sensor, vibrationReading) {
    try {
      // Usar OAVelocity como valor principal para análisis
      if (vibrationReading.data.oavelocity !== undefined) {
        const analysisReading = {
          type: 'vibration',
          axis: vibrationReading.axis,
          metric: 'OAVelocity',
          value: vibrationReading.data.oavelocity,
          unit: 'mm/s',
          timestamp: vibrationReading.timestamp
        };

        await this.analyzeReading(sensor, analysisReading);
        
        // Nota: No actualizar última lectura aquí individualmente
        // La actualización se hace en bloque en saveVibrationReadingsBatch
      }

    } catch (error) {
      console.error(`[READINGS] Error al analizar lectura de vibración:`, error.message);
    }
  }

  // Guarda una lectura en la base de datos
  async saveReading(sensor, reading) {
    try {
      let readingData;

      if (reading.type === 'temperature') {
        console.log(`[READINGS] 🌡️ PROCESANDO TEMPERATURA:`);
        console.log(`[READINGS]    Sensor: ${sensor.name} (ID: ${sensor.id})`);
        console.log(`[READINGS]    Valor original: ${reading.value} ${reading.unit}`);
        console.log(`[READINGS]    Métrica: ${reading.metric}`);
        console.log(`[READINGS]    Timestamp: ${reading.timestamp}`);
        
        // Estructura para temperature_readings
        readingData = {
          sensor_id: sensor.id,
          value: reading.value,
          timestamp: reading.timestamp
        };

        console.log(`[READINGS]    Datos a insertar en DB:`, JSON.stringify(readingData, null, 2));
        
        await this.databaseService.saveTemperatureReading(readingData);
        console.log(`[READINGS] ✅ Lectura de temperatura guardada exitosamente: ${sensor.name} - ${reading.value} °C`);
      } else if (reading.type === 'vibration') {
        // Las lecturas de vibración se procesan por separado en saveVibrationReading
        console.log(`[READINGS] Lectura de vibración omitida (se procesa por separado): ${sensor.name} - ${reading.metric || 'N/A'}`);
      } else {
        // Estructura genérica para otros tipos
        readingData = {
          sensor_id: sensor.id,
          type: reading.type,
          axis: reading.axis,
          metric: reading.metric,
          value: reading.value,
          unit: reading.unit,
          timestamp: reading.timestamp
        };

        await this.databaseService.saveReading(readingData);
        console.log(`[READINGS] Lectura guardada: ${sensor.name} - ${reading.type}/${reading.metric}: ${reading.value} ${reading.unit}`);
      }

    } catch (error) {
      console.error(`[READINGS] Error al guardar lectura:`, error.message);
    }
  }

  // Analiza una lectura y gestiona alertas
  async analyzeReading(sensor, reading) {
    try {
      // Verificar si es un pico de datos anómalo
      const isSpike = await this.analysisService.checkForSpikeAndAlert(sensor, reading);
      if (isSpike) {
        await this.alertService.manageAlerts(sensor, reading, 'data_issue', reading.type);
        return;
      }

      // Realizar análisis según el tipo de lectura
      let analysisResult;
      if (reading.type === 'vibration') {
        analysisResult = await this.analysisService.processAndAnalyzeVibrationReading(sensor, reading);
      } else if (reading.type === 'temperature') {
        analysisResult = await this.analysisService.processAndAnalyzeTemperatureReading(sensor, reading);
      }

      if (analysisResult) {
        // Gestionar alertas basadas en el resultado del análisis
        await this.alertService.manageAlerts(
          sensor, 
          reading, 
          analysisResult.finalStatus, 
          reading.type
        );

        console.log(`[ANALYSIS] Análisis completado para ${sensor.name} - ${reading.type}: ${analysisResult.finalStatus}`);
      }

    } catch (error) {
      console.error(`[ANALYSIS] Error al analizar lectura:`, error.message);
    }
  }

  // Obtiene el estado del servicio
  getStatus() {
    try {
      // Verificar que los servicios estén inicializados
      if (!this.mqttService || !this.databaseService) {
        console.log('[MAIN] Servicios no inicializados completamente');
        return {
          isRunning: false,
          mqttConnected: false,
          databaseConnected: false,
          services: {
            database: { connected: false },
            mqtt: { connected: false },
            connectivity: false
          }
        };
      }

      // Obtener estado de MQTT de forma segura
      let mqttConnected = false;
      let mqttStatus = { connected: false };
      try {
        if (this.mqttService && typeof this.mqttService.isConnected === 'function') {
          mqttConnected = this.mqttService.isConnected();
        }
        if (this.mqttService && typeof this.mqttService.getStatus === 'function') {
          mqttStatus = this.mqttService.getStatus();
        }
      } catch (mqttError) {
        console.log('[MAIN] Error al obtener estado MQTT:', mqttError.message);
      }

      // Obtener estado de base de datos de forma segura
      let databaseConnected = false;
      let databaseStatus = { connected: false };
      try {
        if (this.databaseService && typeof this.databaseService.isConnected === 'function') {
          databaseConnected = this.databaseService.isConnected();
        }
        if (this.databaseService && typeof this.databaseService.getStatus === 'function') {
          databaseStatus = this.databaseService.getStatus();
        }
      } catch (dbError) {
        console.log('[MAIN] Error al obtener estado de base de datos:', dbError.message);
      }

      // Obtener estado de conectividad de forma segura
      let connectivityStatus = false;
      try {
        if (this.connectivityService && this.connectivityService.connectivityCheckInterval !== null) {
          connectivityStatus = true;
        }
      } catch (connError) {
        console.log('[MAIN] Error al obtener estado de conectividad:', connError.message);
      }

      return {
        isRunning: this.isRunning || false,
        mqttConnected,
        databaseConnected,
        services: {
          database: databaseStatus,
          mqtt: mqttStatus,
          connectivity: connectivityStatus
        }
      };
    } catch (error) {
      console.error('[MAIN] Error crítico al obtener estado del servicio:', error.message);
      return {
        isRunning: false,
        mqttConnected: false,
        databaseConnected: false,
        services: {
          database: { connected: false },
          mqtt: { connected: false },
          connectivity: false
        }
      };
    }
  }
}

module.exports = MainService;