// Servicio de Análisis - Principio de Responsabilidad Única
const { SPIKE_THRESHOLD_MULTIPLIER, SPIKE_MIN_ABSOLUTE_VALUE } = require('../config/constants');

class AnalysisService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  // Análisis según norma ISO 10816
  analyzeISO10816(velocity) {
    if (typeof velocity !== 'number') return 'N/A';
    // Umbrales originales de la norma ISO 10816 (en mm/s)
    // Los datos del sensor ya vienen convertidos por payload.service.js
    if (velocity <= 2.3) return 'Normal';
    if (velocity <= 4.5) return 'Alerta';
    if (velocity <= 9.0) return 'Precaucion';
    return 'Peligro';
  }

  // Análisis según perfil de vibración personalizado
  analyzeVibrationProfile(velocity, ranges) {
    if (!ranges || ranges.length === 0 || velocity === null) {
      return 'No Definido';
    }

    const sortedRanges = [...ranges].sort((a, b) => a.max_value - b.max_value);
    
    for (const range of sortedRanges) {
      if (velocity >= range.min_value && velocity <= range.max_value) {
        return `${range.condition_name} (Zona ${range.severity})`;
      }
    }

    const lastRange = sortedRanges[sortedRanges.length - 1];
    if (velocity > lastRange.max_value) {
      return `${lastRange.condition_name} (Zona ${lastRange.severity})`;
    }

    return 'Indeterminado';
  }

  // Análisis de umbrales generales (temperatura)
  analyzeGeneralThresholds(value, thresholds) {
    if (!thresholds || Object.keys(thresholds).length === 0) {
      return 'No Definido';
    }

    const { normalMin, normalMax, criticalMin, criticalMax } = thresholds;
    
    if ([normalMin, normalMax, criticalMin, criticalMax].some(val => typeof val !== 'number')) {
      return 'Perfil Incompleto';
    }

    if (value < criticalMin || value > criticalMax) {
      return 'Crítico';
    }

    if ((value >= criticalMin && value < normalMin) || (value > normalMax && value <= criticalMax)) {
      return 'Advertencia';
    }

    return 'Normal';
  }

  // Determina el estado final basándose en perfiles y normas
  determineFinalStatus(profileStatus, isoStatus) {
    const validProfileStatus = profileStatus && 
      profileStatus !== 'No Definido' && 
      profileStatus !== 'Perfil Incompleto' &&
      profileStatus !== 'Indeterminado';
    
    if (validProfileStatus) {
      return profileStatus;
    }
    
    return isoStatus;
  }

  // Verifica si hay un pico anómalo en los datos
  async checkForSpike(sensorId, newValue) {
    const lastAnalysis = await this.databaseService.getLastAnalysis(sensorId);
    
    if (!lastAnalysis) {
      return false;
    }

    const lastValue = lastAnalysis.measured_value;
    const isSpike = newValue > SPIKE_MIN_ABSOLUTE_VALUE && 
                   lastValue > 0 && 
                   (newValue / lastValue) > SPIKE_THRESHOLD_MULTIPLIER;

    return isSpike;
  }

  // Verifica si hay un pico anómalo y retorna el resultado para alertas
  async checkForSpikeAndAlert(sensor, reading) {
    try {
      // Solo verificar picos para lecturas de vibración con OAVelocity
      if (reading.type !== 'vibration' || reading.metric !== 'OAVelocity') {
        return false;
      }

      const isSpike = await this.checkForSpike(sensor.id, reading.value);
      
      if (isSpike) {
        console.log(`[ANALYSIS] Pico anómalo detectado en sensor ${sensor.name}: ${reading.value} ${reading.unit}`);
      }
      
      return isSpike;
    } catch (error) {
      console.error(`[ANALYSIS] Error al verificar pico anómalo:`, error.message);
      return false;
    }
  }

  // Obtiene el perfil de vibración para un asset
  async getVibrationProfileForAsset(assetId) {
    if (!assetId) return null;

    try {
      const assetData = await this.databaseService.getAssetVibrationProfile(assetId);
      let ranges = [];
      let profileInfo = { 
        name: 'Perfil Desconocido', 
        description: '', 
        ranges: [] 
      };

      const severityDescriptions = { 
        'A': 'Buena', 
        'B': 'Satisfactoria', 
        'C': 'Insatisfactoria', 
        'D': 'Inaceptable' 
      };

      if (assetData.custom_vibration_profile_id) {
        profileInfo.name = assetData.custom_profile?.name || 'Perfil Personalizado';
        ranges = await this.databaseService.getCustomVibrationRanges(
          assetData.custom_vibration_profile_id
        );
      } else if (assetData.iso_group_id && assetData.rigidity_type_id) {
        profileInfo.name = assetData.iso_group?.name || 'Estándar ISO';
        const isoRanges = await this.databaseService.getISOVibrationRanges(
          assetData.iso_group_id, 
          assetData.rigidity_type_id
        );
        ranges = isoRanges.map(r => ({
          ...r, 
          condition_name: severityDescriptions[r.severity] || 'Desconocido'
        }));
      } else {
        return null;
      }

      profileInfo.ranges = ranges;
      return profileInfo;
    } catch (error) {
      console.error(`[VIBRATION PROFILE] Error obteniendo perfil para asset ${assetId}:`, error.message);
      return null;
    }
  }

  // Guarda o actualiza el resultado del análisis
  async saveOrUpdateAnalysisResult(analysisData) {
    const dataToSave = {
      ...analysisData,
      analysis_timestamp: new Date().toISOString()
    };

    try {
      const existingRecord = await this.databaseService.getExistingAnalysis(analysisData.sensor_id);

      if (existingRecord) {
        await this.databaseService.updateAnalysisResult(existingRecord.id, dataToSave);
        console.log(`[ANALYSIS_UPDATE] Resultado de análisis actualizado para sensor ${analysisData.sensor_id}. Estado: ${analysisData.final_status}`);
      } else {
        await this.databaseService.saveAnalysisResult(dataToSave);
        console.log(`[ANALYSIS_INSERT] Resultado de análisis insertado para sensor ${analysisData.sensor_id}. Estado: ${analysisData.final_status}`);
      }
    } catch (error) {
      console.error(`[ANALYSIS] Error al guardar resultado de análisis:`, error.message);
      throw error;
    }
  }

  // Procesa y analiza las lecturas de vibración
  async processVibrationReadings(sensor, readings) {
    const maxVibrationValue = Math.max(...readings.map(r => r.data.oavelocity || 0));
    
    // Verificar si es un pico anómalo
    const isSpike = await this.checkForSpike(sensor.id, maxVibrationValue);
    if (isSpike) {
      return { finalStatus: 'data_issue', value: maxVibrationValue };
    }

    // Obtener perfil de vibración
    const vibrationProfile = await this.getVibrationProfileForAsset(sensor.asset_id);
    
    // Realizar análisis
    const profileStatus = this.analyzeVibrationProfile(
      maxVibrationValue, 
      vibrationProfile?.ranges || []
    );
    const isoStatus = this.analyzeISO10816(maxVibrationValue);
    const finalStatus = this.determineFinalStatus(profileStatus, isoStatus);

    // Preparar datos para guardar
    const axesValues = readings.reduce((acc, r) => ({
      ...acc, 
      [r.axis.toLowerCase()]: (r.data.oavelocity || 0).toFixed(3)
    }), {});

    const analysisData = {
      sensor_id: sensor.id,
      asset_id: sensor.asset_id,
      measured_value: maxVibrationValue,
      iso_status: isoStatus,
      profile_status: profileStatus,
      final_status: finalStatus,
      axes_values: axesValues,
    };

    await this.saveOrUpdateAnalysisResult(analysisData);

    console.log(`[ANALYSIS] ${sensor.name} (Vibration) | Value: ${maxVibrationValue.toFixed(2)} mm/s RMS | Status: ${finalStatus}`);

    return {
      finalStatus,
      value: maxVibrationValue,
      lastValueStr: `X:${axesValues.x || 0} Y:${axesValues.y || 0} Z:${axesValues.z || 0}`,
      lastUnitStr: 'mm/s'
    };
  }

  // Procesa y analiza las lecturas de temperatura
  async processTemperatureReadings(sensor, readings) {
    const tempValue = readings[0].data.value;
    const finalStatus = this.analyzeGeneralThresholds(tempValue, sensor.thresholds);

    const analysisData = {
      sensor_id: sensor.id,
      asset_id: sensor.asset_id,
      measured_value: tempValue,
      final_status: finalStatus,
    };

    await this.saveOrUpdateAnalysisResult(analysisData);

    console.log(`[ANALYSIS] ${sensor.name} (Temperature) | Value: ${tempValue.toFixed(2)} °C | Status: ${finalStatus}`);

    return {
      finalStatus,
      value: tempValue,
      lastValueStr: tempValue.toFixed(2),
      lastUnitStr: '°C'
    };
  }

  // Procesa y analiza una lectura individual de vibración
  async processAndAnalyzeVibrationReading(sensor, reading) {
    try {
      // Solo procesar lecturas de OAVelocity para análisis principal
      if (reading.metric !== 'OAVelocity') {
        return null;
      }

      const vibrationValue = reading.value;
      
      // Obtener perfil de vibración
      const vibrationProfile = await this.getVibrationProfileForAsset(sensor.asset_id);
      
      // Realizar análisis
      const profileStatus = this.analyzeVibrationProfile(
        vibrationValue, 
        vibrationProfile?.ranges || []
      );
      const isoStatus = this.analyzeISO10816(vibrationValue);
      const finalStatus = this.determineFinalStatus(profileStatus, isoStatus);

      // Preparar datos para guardar
      const analysisData = {
        sensor_id: sensor.id,
        asset_id: sensor.asset_id,
        measured_value: vibrationValue,
        iso_status: isoStatus,
        profile_status: profileStatus,
        final_status: finalStatus,
        axes_values: { [reading.axis.toLowerCase()]: vibrationValue.toFixed(3) },
      };

      await this.saveOrUpdateAnalysisResult(analysisData);

      console.log(`[ANALYSIS] ${sensor.name} (Vibration ${reading.axis}) | Value: ${vibrationValue.toFixed(2)} ${reading.unit} | Status: ${finalStatus}`);

      return {
        finalStatus,
        value: vibrationValue,
        lastValueStr: vibrationValue.toFixed(3),
        lastUnitStr: reading.unit
      };
    } catch (error) {
      console.error(`[ANALYSIS] Error al analizar lectura de vibración:`, error.message);
      return null;
    }
  }

  // Procesa y analiza una lectura individual de temperatura
  async processAndAnalyzeTemperatureReading(sensor, reading) {
    try {
      const tempValue = reading.value;
      
      // Usar umbrales predeterminados si no están definidos en el sensor
      const defaultThresholds = {
        normalMin: 0,
        normalMax: 60,
        criticalMin: -10,
        criticalMax: 80
      };
      
      const thresholds = sensor.thresholds || defaultThresholds;
      const finalStatus = this.analyzeGeneralThresholds(tempValue, thresholds);

      const analysisData = {
        sensor_id: sensor.id,
        asset_id: sensor.asset_id,
        measured_value: tempValue,
        final_status: finalStatus,
      };

      await this.saveOrUpdateAnalysisResult(analysisData);

      console.log(`[ANALYSIS] ${sensor.name} (Temperature) | Value: ${tempValue.toFixed(2)} °C | Status: ${finalStatus}`);

      return {
        finalStatus,
        value: tempValue,
        lastValueStr: tempValue.toFixed(2),
        lastUnitStr: '°C'
      };
    } catch (error) {
      console.error(`[ANALYSIS] Error al analizar lectura de temperatura:`, error.message);
      return null;
    }
  }
}

module.exports = AnalysisService;