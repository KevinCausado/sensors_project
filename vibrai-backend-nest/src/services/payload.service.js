// Servicio de Procesamiento de Payload - Principio de Responsabilidad Única
const { SENSOR_STATUS } = require('../config/constants');

class PayloadService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  // Parsea el payload del mensaje MQTT
  parsePayload(payload) {
    try {
      return JSON.parse(payload);
    } catch (error) {
      console.error('[PAYLOAD] Error al parsear payload JSON:', error.message);
      return null;
    }
  }

  // Extrae lecturas de sensores del payload usando firmware.structure como basic-analysis.js
  extractSensorReadings(data, sensors = []) {
    const readings = [];
    const timestamp = this.extractTimestamp(data);

    console.log(`[PAYLOAD] Extrayendo lecturas con timestamp: ${timestamp}`);
    console.log(`[PAYLOAD] Sensores disponibles para configuración: ${sensors.length}`);

    // Procesar cada sensor individualmente usando su configuración de firmware
    sensors.forEach(sensor => {
      console.log(`[PAYLOAD] Procesando sensor: ${sensor.name} (Tipo: ${sensor.type})`);
      
      // Determinar qué sección de datos usar según la estructura del firmware
      let sensorData = data;
      const firmwareStructure = sensor.firmware?.structure;
      
      if (firmwareStructure) {
        if (firmwareStructure.SensorData && data.SensorData) {
          sensorData = data.SensorData;
        } else if (firmwareStructure.Accelerometer && data.Accelerometer) {
          sensorData = data.Accelerometer;
        }
      }
      
      if (sensor.type === 'vibration') {
        this.extractVibrationReadings(sensorData, sensor, timestamp, readings);
      } else if (sensor.type === 'temperature') {
        this.extractTemperatureReadings(sensorData, sensor, timestamp, readings);
      } else if (sensor.type === 'humidity') {
        this.extractHumidityReadings(sensorData, sensor, timestamp, readings);
      }
    });

    // Si no hay sensores específicos, usar extracción genérica (fallback)
    if (sensors.length === 0) {
      console.log(`[PAYLOAD] No hay sensores específicos, usando extracción genérica...`);
      this.extractGenericReadings(data, timestamp, readings);
    }

    console.log(`[PAYLOAD] Total de lecturas extraídas: ${readings.length}`);
    return readings;
  }

  // Extrae lecturas de vibración usando firmware.structure como basic-analysis.js
  extractVibrationReadings(data, sensor, timestamp, readings) {
    console.log(`[PAYLOAD] Extrayendo lecturas de vibración para sensor: ${sensor.name}`);
    
    // Usar estructura del firmware si está disponible
    const firmwareStructure = sensor.firmware?.structure;
    const correctionFactor = sensor.correctionFactor || firmwareStructure?.correctionFactor || 1;
    
    console.log(`[PAYLOAD] Factor de corrección: ${correctionFactor}`);
    console.log(`[PAYLOAD] Estructura de firmware:`, firmwareStructure);

    // Determinar la fuente de datos usando la estructura del firmware
    let vibrationData = null;
    
    if (firmwareStructure && firmwareStructure.vibration) {
      // Usar estructura del firmware para encontrar los datos de vibración
      const dataPath = firmwareStructure.vibration.dataPath;
      if (dataPath === 'Accelerometer') {
        vibrationData = data.Accelerometer;
      } else if (dataPath === 'SensorData') {
        vibrationData = data.SensorData;
      } else {
        // Usar el dataPath como está
        vibrationData = data[dataPath] || data;
      }
    } else {
      // Fallback: buscar en ubicaciones comunes
      vibrationData = data.Accelerometer || data.SensorData || data;
    }

    if (vibrationData) {
      ['X-Axis', 'Y-Axis', 'Z-Axis'].forEach(axisKey => {
        const axisData = vibrationData[axisKey];
        if (axisData) {
          const axis = axisKey.charAt(0); // X, Y, Z
          console.log(`[PAYLOAD] Procesando eje ${axis} para sensor ${sensor.name}:`, Object.keys(axisData));
          
          const vibrationReading = {
            type: 'vibration',
            axis: axis,
            timestamp: timestamp,
            sensorId: sensor.id, // Asignar sensor específico
            data: {
              sensor_id: sensor.id,
              axis: axis,
              timestamp: timestamp
            }
          };

          // Extraer métricas usando firmware.structure o fallback
          this.extractVibrationMetrics(axisData, vibrationReading.data, firmwareStructure, correctionFactor);

          readings.push(vibrationReading);
          console.log(`[PAYLOAD] ✓ Lectura de vibración para sensor ${sensor.name}, eje ${axis}:`, Object.keys(vibrationReading.data));
        }
      });
    } else {
      console.log(`[PAYLOAD] No se encontraron datos de vibración para sensor ${sensor.name}`);
    }
  }

  // Extrae métricas de vibración aplicando factores de conversión correctos basados en funtion.js
  extractVibrationMetrics(axisData, readingData, firmwareStructure, correctionFactor) {
    // Mapear métricas usando estructura del firmware o valores por defecto
    const metricPaths = {
      oavelocity: 'OAVelocity',
      peak: 'Peak',
      rms: 'RMS',
      kurtosis: 'Kurtosis',
      crestfactor: 'CrestFactor',
      skewness: 'Skewness',
      deviation: 'Deviation',
      peak_to_peak_displacement: 'Peak-to-Peak Displacement'
    };

    // Extraer y aplicar factores de conversión basados en funtion.js
    Object.entries(metricPaths).forEach(([key, path]) => {
      let value = this.getValueFromPath(axisData, path);
      
      if (typeof value === 'number' && !isNaN(value)) {
        let convertedValue;
        
        // Aplicar factores de conversión específicos según funtion.js
        switch (key) {
          case 'oavelocity':
            // OAVelocity: dividir por 100 (factor 0.01)
            convertedValue = value / 100;
            break;
          case 'peak':
          case 'rms':
            // Peak y RMS: dividir por 100 o 1000 según el rango
            if (value > 1000) {
              convertedValue = value / 1000;
            } else {
              convertedValue = value / 100;
            }
            break;
          case 'kurtosis':
          case 'crestfactor':
          case 'skewness':
          case 'deviation':
            // Estas métricas: dividir por 100 (factor 0.01)
            convertedValue = value / 100;
            break;
          default:
            // Para otras métricas, usar el valor sin conversión
            convertedValue = value;
        }
        
        // Aplicar factor de corrección adicional del sensor si existe
        if (correctionFactor !== 1) {
          convertedValue = convertedValue * correctionFactor;
        }
        
        readingData[key] = convertedValue;
        
        console.log(`[PAYLOAD] ${key}: ${value} -> ${convertedValue} (conversión + factor: ${correctionFactor})`);
      }
    });

    // Fallback para métricas nuevas con conversión
    if (typeof axisData.Peakmg === 'number' && !readingData.peak) {
      let convertedValue = axisData.Peakmg / 100; // Aplicar conversión estándar
      if (correctionFactor !== 1) {
        convertedValue = convertedValue * correctionFactor;
      }
      readingData.peak = convertedValue;
    }
    if (typeof axisData.RMSmg === 'number' && !readingData.rms) {
      let convertedValue = axisData.RMSmg / 100; // Aplicar conversión estándar
      if (correctionFactor !== 1) {
        convertedValue = convertedValue * correctionFactor;
      }
      readingData.rms = convertedValue;
    }
  }

  // Extrae lecturas de temperatura usando firmware.structure como basic-analysis.js
  extractTemperatureReadings(data, sensor, timestamp, readings) {
    console.log(`[PAYLOAD] Extrayendo lecturas de temperatura para sensor: ${sensor.name}`);
    
    const firmwareStructure = sensor.firmware?.structure;
    const correctionFactor = firmwareStructure?.correctionFactor || 1;
    
    // Usar estructura del firmware para extraer temperatura
    const temperaturePath = firmwareStructure?.temperature?.value || 'TempHumi.SenVal';
    let temperatureValue = this.getValueFromPath(data, temperaturePath);
    
    // Fallback a otros formatos
    if (temperatureValue === null) {
      if (data.TempHumi && typeof data.TempHumi.SenVal === 'number') {
        temperatureValue = data.TempHumi.SenVal;
      } else if (data.TempHumi && typeof data.TempHumi === 'number') {
        temperatureValue = data.TempHumi;
      } else if (data.Temperature && typeof data.Temperature.SenVal === 'number') {
        temperatureValue = data.Temperature.SenVal;
      }
    }

    if (typeof temperatureValue === 'number') {
      // Aplicar conversión estándar de funtion.js (dividir por 1000) y factor de corrección del sensor
      let convertedValue = temperatureValue / 1000; // Conversión estándar de funtion.js
      let finalValue = convertedValue * correctionFactor; // Factor de corrección del sensor
      finalValue = parseFloat(finalValue.toFixed(2));
      
      readings.push({
        type: 'temperature',
        axis: null,
        metric: 'TempHumi',
        value: finalValue,
        unit: '°C',
        timestamp: timestamp,
        sensorId: sensor.id
      });
      
      console.log(`[PAYLOAD] ✓ Temperatura para sensor ${sensor.name}: ${temperatureValue} -> ${convertedValue} -> ${finalValue} °C (conversión + factor: ${correctionFactor})`);
    }
  }

  // Extrae lecturas de humedad
  extractHumidityReadings(data, sensor, timestamp, readings) {
    console.log(`[PAYLOAD] Extrayendo lecturas de humedad para sensor: ${sensor.name}`);
    
    if (data.Humidity && typeof data.Humidity.SenVal === 'number') {
      const firmwareStructure = sensor.firmware?.structure;
      const correctionFactor = firmwareStructure?.correctionFactor || 1;
      const finalValue = data.Humidity.SenVal * correctionFactor;
      
      readings.push({
        type: 'humidity',
        axis: null,
        metric: 'SenVal',
        value: finalValue,
        unit: '%',
        timestamp: timestamp,
        sensorId: sensor.id
      });
      
      console.log(`[PAYLOAD] ✓ Humedad para sensor ${sensor.name}: ${data.Humidity.SenVal} -> ${finalValue} % (factor: ${correctionFactor})`);
    }
  }

  // Extracción genérica (fallback) para compatibilidad
  extractGenericReadings(data, timestamp, readings) {
    console.log(`[PAYLOAD] Usando extracción genérica...`);
    
    // Procesar datos de acelerómetro (vibración) - FORMATO ORIGINAL
    if (data.Accelerometer) {
      console.log(`[PAYLOAD] Procesando datos de acelerómetro...`);
      
      ['X-Axis', 'Y-Axis', 'Z-Axis'].forEach(axisKey => {
        const axisData = data.Accelerometer[axisKey];
        if (axisData) {
          const axis = axisKey.charAt(0); // X, Y, Z
          console.log(`[PAYLOAD] Procesando eje ${axis}:`, Object.keys(axisData));
          
          const vibrationReading = {
            type: 'vibration',
            axis: axis,
            timestamp: timestamp,
            data: {
              sensor_id: null, // Se asignará en el main service
              axis: axis,
              timestamp: timestamp
            }
          };

          // Mapear todas las métricas disponibles aplicando factores de conversión de funtion.js
          if (typeof axisData.OAVelocity === 'number') {
            vibrationReading.data.oavelocity = axisData.OAVelocity / 100; // Dividir por 100
          }
          if (typeof axisData.Peak === 'number') {
            // Peak: dividir por 100 o 1000 según el rango
            if (axisData.Peak > 1000) {
              vibrationReading.data.peak = axisData.Peak / 1000;
            } else {
              vibrationReading.data.peak = axisData.Peak / 100;
            }
          }
          if (typeof axisData.RMS === 'number') {
            // RMS: dividir por 100 o 1000 según el rango
            if (axisData.RMS > 1000) {
              vibrationReading.data.rms = axisData.RMS / 1000;
            } else {
              vibrationReading.data.rms = axisData.RMS / 100;
            }
          }
          if (typeof axisData.Kurtosis === 'number') {
            vibrationReading.data.kurtosis = axisData.Kurtosis / 100; // Dividir por 100
          }
          if (typeof axisData.CrestFactor === 'number') {
            vibrationReading.data.crestfactor = axisData.CrestFactor / 100; // Dividir por 100
          }
          if (typeof axisData.Skewness === 'number') {
            vibrationReading.data.skewness = axisData.Skewness / 100; // Dividir por 100
          }
          if (typeof axisData.Deviation === 'number') {
            vibrationReading.data.deviation = axisData.Deviation / 100; // Dividir por 100
          }
          if (typeof axisData['Peak-to-Peak Displacement'] === 'number') {
            vibrationReading.data.peak_to_peak_displacement = axisData['Peak-to-Peak Displacement']; // Sin conversión específica
          } else if (typeof axisData['Peak-to-Peak_Displacement'] === 'number') {
            vibrationReading.data.peak_to_peak_displacement = axisData['Peak-to-Peak_Displacement']; // Sin conversión específica
          }
          if (typeof axisData.Peakmg === 'number') {
            vibrationReading.data.peak = axisData.Peakmg / 100; // Dividir por 100
          }
          if (typeof axisData.RMSmg === 'number') {
            vibrationReading.data.rms = axisData.RMSmg / 100; // Dividir por 100
          }

          readings.push(vibrationReading);
          console.log(`[PAYLOAD] ✓ Lectura de vibración genérica para eje ${axis}:`, Object.keys(vibrationReading.data));
        }
      });
    }

    // Procesar datos de temperatura genéricos aplicando conversión de funtion.js
    if (data.TempHumi && typeof data.TempHumi.SenVal === 'number') {
      const temperatureValue = parseFloat((data.TempHumi.SenVal / 1000).toFixed(2)); // Aplicar conversión estándar
      readings.push({
        type: 'temperature',
        axis: null,
        metric: 'TempHumi',
        value: temperatureValue,
        unit: '°C',
        timestamp: timestamp
      });
      console.log(`[PAYLOAD] ✓ Temperatura genérica: ${data.TempHumi.SenVal} -> ${temperatureValue} °C (conversión estándar)`);
    } else if (data.TempHumi && typeof data.TempHumi === 'number') {
      const temperatureValue = parseFloat((data.TempHumi / 1000).toFixed(2)); // Aplicar conversión estándar
      readings.push({
        type: 'temperature',
        axis: null,
        metric: 'TempHumi',
        value: temperatureValue,
        unit: '°C',
        timestamp: timestamp
      });
      console.log(`[PAYLOAD] ✓ Temperatura genérica: ${data.TempHumi} -> ${temperatureValue} °C (conversión estándar)`);
    }
  }

  // Obtiene un valor usando un path como lodash.get (similar a basic-analysis.js)
  getValueFromPath(obj, path) {
    if (!path || typeof path !== 'string') return null;
    
    try {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
      }, obj);
    } catch (error) {
      console.log(`[PAYLOAD] Error extrayendo valor del path '${path}':`, error.message);
      return null;
    }
  }

  // Extrae timestamp del payload
  extractTimestamp(data) {
    // Intentar extraer timestamp del payload
    if (data.Timestamp) {
      return new Date(data.Timestamp).toISOString();
    }
    
    // Si no hay timestamp en el payload, usar timestamp actual
    return new Date().toISOString();
  }

  // Extrae información del dispositivo del payload
  extractDeviceInfo(data) {
    if (!data.Device) return null;

    const device = data.Device;
    const deviceInfo = {
      sequenceNumber: data.SequenceNumber || null,
      events: device.Events || null,
      powerSource: device.PowerSource || null,
      batteryVoltage: null
    };

    // Extraer voltaje de batería
    if (typeof device.BatteryVoltage === 'number' && !isNaN(device.BatteryVoltage)) {
      deviceInfo.batteryVoltage = device.BatteryVoltage;
    }

    return deviceInfo;
  }

  // Obtiene la unidad correspondiente a una métrica
  getUnitForMetric(metric) {
    const unitMap = {
      'OAVelocity': 'mm/s',
      'Peak': 'g',
      'RMS': 'g',
      'Kurtosis': '',
      'CrestFactor': '',
      'Skewness': '',
      'Deviation': 'g',
      'Peak-to-Peak Displacement': 'μm',
      // Nuevas métricas del formato actual
      'Peakmg': 'mg',
      'RMSmg': 'mg',
      'SenEvent': '',
      'SenVal': ''
    };
    
    return unitMap[metric] || '';
  }

  // Procesa el payload completo y extrae toda la información
  async processPayload(sensorCode, payload) {
    try {
      console.log(`[PAYLOAD] Procesando payload para sensor código: ${sensorCode}`);
      
      // Parsear el payload
      const data = this.parsePayload(payload);
      if (!data) {
        console.log(`[PAYLOAD] ❌ Error: Formato de payload inválido`);
        return { success: false, error: 'Invalid payload format' };
      }

      console.log(`[PAYLOAD] ✓ Payload parseado exitosamente. Estructura:`, Object.keys(data));

      // Obtener información de todos los sensores con este código
      const sensors = await this.databaseService.getSensorsByCode(sensorCode);
      if (!sensors || sensors.length === 0) {
        console.log(`[PAYLOAD] ❌ Sensor con código ${sensorCode} no encontrado en la base de datos.`);
        return { success: false, error: 'Sensor not found' };
      }

      console.log(`[PAYLOAD] ✓ Encontrados ${sensors.length} sensores con código ${sensorCode}`);
      sensors.forEach(sensor => {
        console.log(`[PAYLOAD]   - ${sensor.name} (ID: ${sensor.id}, Tipo: ${sensor.type})`);
      });

      // Extraer lecturas y información del dispositivo
      console.log(`[PAYLOAD] Extrayendo lecturas de sensores...`);
      const readings = this.extractSensorReadings(data, sensors);
      
      console.log(`[PAYLOAD] Extrayendo información del dispositivo...`);
      const deviceInfo = this.extractDeviceInfo(data);
      
      console.log(`[PAYLOAD] ✓ Procesamiento completado:`);
      console.log(`[PAYLOAD]   - Lecturas extraídas: ${readings.length}`);
      console.log(`[PAYLOAD]   - Información del dispositivo:`, deviceInfo ? 'Disponible' : 'No disponible');

      return {
        success: true,
        sensors, // Cambiar de sensor a sensors para manejar múltiples
        readings,
        deviceInfo,
        rawData: data
      };

    } catch (error) {
      console.error('[PAYLOAD] ❌ Error al procesar payload:', error.message);
      console.error('[PAYLOAD] Stack trace:', error.stack);
      return { success: false, error: error.message };
    }
  }

  // Valida si una lectura de vibración completa es válida
  isValidVibrationReading(reading) {
    if (!reading.data || typeof reading.data !== 'object') {
      console.log(`[PAYLOAD] Lectura de vibración inválida - falta objeto data`);
      return false;
    }

    // Verificar que al menos OAVelocity esté presente y sea válida
    if (typeof reading.data.oavelocity !== 'number' || isNaN(reading.data.oavelocity)) {
      console.log(`[PAYLOAD] Lectura de vibración inválida - OAVelocity no es número válido: ${reading.data.oavelocity}`);
      return false;
    }

    // Validar rango de OAVelocity (métrica principal)
    if (reading.data.oavelocity < 0 || reading.data.oavelocity > 10000) {
      console.log(`[PAYLOAD] Lectura de vibración inválida - OAVelocity fuera de rango: ${reading.data.oavelocity} mm/s (debe estar entre 0 y 10,000)`);
      return false;
    }

    // Validar otras métricas si están presentes
    const metrics = ['peak', 'rms', 'kurtosis', 'crestfactor', 'skewness', 'deviation', 'peak_to_peak_displacement'];
    for (const metric of metrics) {
      if (reading.data[metric] !== undefined) {
        if (typeof reading.data[metric] !== 'number' || isNaN(reading.data[metric])) {
          console.log(`[PAYLOAD] Lectura de vibración inválida - ${metric} no es número válido: ${reading.data[metric]}`);
          return false;
        }
        
        // Validaciones específicas por métrica
        if ((metric === 'kurtosis' || metric === 'skewness') && 
            (reading.data[metric] < -1000 || reading.data[metric] > 1000)) {
          console.log(`[PAYLOAD] Lectura de vibración inválida - ${metric} fuera de rango: ${reading.data[metric]} (debe estar entre -1000 y 1000)`);
          return false;
        } else if (metric === 'crestfactor' && 
                   (reading.data[metric] < 1 || reading.data[metric] > 10000)) {
          console.log(`[PAYLOAD] Lectura de vibración inválida - ${metric} fuera de rango: ${reading.data[metric]} (debe estar entre 1 y 10,000)`);
          return false;
        } else if (metric !== 'kurtosis' && metric !== 'skewness' && metric !== 'crestfactor' &&
                   (reading.data[metric] < 0 || reading.data[metric] > 100000)) {
          console.log(`[PAYLOAD] Lectura de vibración inválida - ${metric} fuera de rango: ${reading.data[metric]} (debe estar entre 0 y 100,000)`);
          return false;
        }
      }
    }

    return true;
  }

  // Valida si una lectura es válida para análisis
  isValidReading(reading) {
    // Para lecturas de vibración, usar validación específica
    if (reading.type === 'vibration') {
      return this.isValidVibrationReading(reading);
    }

    // Para otros tipos, verificar que el valor sea un número válido
    if (typeof reading.value !== 'number' || isNaN(reading.value)) {
      console.log(`[PAYLOAD] Lectura inválida - valor no es número: ${reading.type}/${reading.metric} = ${reading.value} (tipo: ${typeof reading.value})`);
      return false;
    }

    // Verificaciones específicas por tipo y métrica
    switch (reading.type) {
      case 'temperature':
        // Rango ampliado para sensores industriales: -100°C a 500°C
        if (reading.value < -100 || reading.value > 500) {
          console.log(`[PAYLOAD] Lectura inválida - temperatura fuera de rango: ${reading.value} °C (debe estar entre -100 y 500)`);
          return false;
        }
        console.log(`[PAYLOAD] ✓ Temperatura válida: ${reading.value} °C (dentro del rango industrial -100 a 500)`);
        return true;
      case 'humidity':
        if (reading.value < 0 || reading.value > 100) {
          console.log(`[PAYLOAD] Lectura inválida - humedad fuera de rango: ${reading.value} % (debe estar entre 0 y 100)`);
          return false;
        }
        return true;
      case 'vibration':
        // Validaciones específicas por métrica de vibración
        switch (reading.metric) {
          case 'Kurtosis':
          case 'Skewness':
            // Kurtosis y Skewness pueden ser negativos
            if (reading.value < -1000 || reading.value > 1000) {
              console.log(`[PAYLOAD] Lectura inválida - ${reading.metric} fuera de rango: ${reading.value} (debe estar entre -1000 y 1000)`);
              return false;
            }
            return true;
          case 'OAVelocity':
          case 'Peakmg':
          case 'RMSmg':
          case 'Deviation':
            // Estas métricas deben ser positivas
            if (reading.value < 0 || reading.value > 10000) {
              console.log(`[PAYLOAD] Lectura inválida - ${reading.metric} fuera de rango: ${reading.value} ${reading.unit} (debe estar entre 0 y 10,000)`);
              return false;
            }
            return true;
          case 'CrestFactor':
            // CrestFactor típicamente entre 1 y 10000
            if (reading.value < 1 || reading.value > 10000) {
              console.log(`[PAYLOAD] Lectura inválida - CrestFactor fuera de rango: ${reading.value} (debe estar entre 1 y 10,000)`);
              return false;
            }
            return true;
          case 'SenEvent':
            // SenEvent es típicamente 0 o 1
            if (reading.value < 0 || reading.value > 10) {
              console.log(`[PAYLOAD] Lectura inválida - SenEvent fuera de rango: ${reading.value} (debe estar entre 0 y 10)`);
              return false;
            }
            return true;
          default:
            // Para otras métricas de vibración, rango general positivo
            if (reading.value < 0 || reading.value > 100000) {
              console.log(`[PAYLOAD] Lectura inválida - vibración fuera de rango general: ${reading.value} ${reading.unit} (debe estar entre 0 y 100,000)`);
              return false;
            }
            return true;
        }
      default:
        // Para otros tipos, verificar rango general amplio
        if (reading.value < -1000000 || reading.value > 1000000) {
          console.log(`[PAYLOAD] Lectura inválida - valor fuera de rango general: ${reading.type}/${reading.metric} = ${reading.value} (debe estar entre -1,000,000 y 1,000,000)`);
          return false;
        }
        return true;
    }
  }

  // Filtra lecturas válidas
  filterValidReadings(readings) {
    console.log(`[PAYLOAD] Filtrando lecturas válidas. Total de lecturas: ${readings.length}`);
    
    const validReadings = readings.filter(reading => {
      const isValid = this.isValidReading(reading);
      if (!isValid) {
        if (reading.type === 'vibration') {
          console.log(`[PAYLOAD] ❌ Lectura de vibración inválida filtrada: eje ${reading.axis}, OAVelocity = ${reading.data?.oavelocity}`);
        } else {
          console.log(`[PAYLOAD] ❌ Lectura inválida filtrada: ${reading.type}/${reading.metric} = ${reading.value} ${reading.unit}`);
        }
      } else {
        if (reading.type === 'vibration') {
          console.log(`[PAYLOAD] ✓ Lectura de vibración válida: eje ${reading.axis}, OAVelocity = ${reading.data.oavelocity} mm/s`);
        } else {
          console.log(`[PAYLOAD] ✓ Lectura válida: ${reading.type}/${reading.metric} = ${reading.value} ${reading.unit}`);
        }
      }
      return isValid;
    });
    
    console.log(`[PAYLOAD] Filtrado completado. Lecturas válidas: ${validReadings.length}/${readings.length}`);
    return validReadings;
  }

  // Agrupa lecturas por tipo y eje
  groupReadingsByType(readings) {
    const grouped = {};

    readings.forEach(reading => {
      let key;
      
      if (reading.type === 'vibration') {
        // Para vibración, agrupar simplemente por tipo ya que cada lectura es completa por eje
        key = reading.type;
      } else {
        // Para otros tipos, usar el formato anterior
        key = reading.axis ? `${reading.type}_${reading.axis}` : reading.type;
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      
      grouped[key].push(reading);
    });

    return grouped;
  }

  // Extrae lecturas específicas para un sensor según su tipo (como basic-analysis.js)
  extractReadingsForSensor(allReadings, sensor) {
    console.log(`[PAYLOAD] Extrayendo lecturas para sensor: ${sensor.name} (Tipo: ${sensor.type})`);
    console.log(`[PAYLOAD] Total de lecturas disponibles: ${allReadings.length}`);
    
    // Filtrar lecturas que corresponden a este sensor específico
    const sensorReadings = allReadings.filter(reading => {
      // Si la lectura tiene sensorId asignado, debe coincidir
      if (reading.sensorId) {
        return reading.sensorId === sensor.id;
      }
      
      // Si no tiene sensorId, filtrar por tipo de sensor
      if (sensor.type === 'temperature') {
        return reading.type === 'temperature';
      } else if (sensor.type === 'vibration') {
        return reading.type === 'vibration';
      } else if (sensor.type === 'humidity') {
        return reading.type === 'humidity';
      }
      
      return false;
    });
    
    console.log(`[PAYLOAD] Lecturas extraídas para sensor ${sensor.name}: ${sensorReadings.length}`);
    sensorReadings.forEach((reading, index) => {
      if (reading.type === 'vibration') {
        console.log(`[PAYLOAD]   ${index + 1}. Vibración - Eje: ${reading.axis}, OAVelocity: ${reading.data?.oavelocity} mm/s`);
      } else {
        console.log(`[PAYLOAD]   ${index + 1}. ${reading.type} - Valor: ${reading.value} ${reading.unit}`);
      }
    });
    
    return sensorReadings;
  }
}

module.exports = PayloadService;