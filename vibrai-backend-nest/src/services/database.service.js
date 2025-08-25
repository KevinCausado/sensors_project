// Servicio de base de datos - Principio de Responsabilidad Única
const { createClient } = require('@supabase/supabase-js');
const environmentConfig = require('../config/environment');

class DatabaseService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  // Inicializa la conexión a la base de datos
  async initialize() {
    try {
      this.client = createClient(
        environmentConfig.supabaseUrl,
        environmentConfig.supabaseKey
      );
      
      // Verificar conexión
      const { data, error } = await this.client
        .from('sensors')
        .select('count')
        .limit(1);
      
      if (error) {
        throw new Error(`Error de conexión a Supabase: ${error.message}`);
      }
      
      this.isInitialized = true;
      console.log('[DATABASE] Conexión a Supabase establecida correctamente');
    } catch (error) {
      console.error('[DATABASE] Error al inicializar conexión:', error.message);
      throw error;
    }
  }

  // Verifica si la conexión está activa
  isConnected() {
    return this.isInitialized && this.client !== null;
  }

  // Obtiene el estado del servicio
  getStatus() {
    return {
      connected: this.isConnected(),
      client: this.client !== null
    };
  }

  // Operaciones de sensores
  async getSensorByCode(sensorCode) {
    const { data, error } = await this.client
      .from('sensors')
      .select(`
        id, type, code, name, status, organization_id, asset_id, thresholds,
        firmware:sensor_firmwares ( sensor_types, structure )
      `)
      .eq('code', sensorCode);

    if (error) {
      throw new Error(`Error al buscar sensor: ${error.message}`);
    }

    // Retornar el primer sensor encontrado para mantener compatibilidad
    // pero también permitir múltiples sensores con el mismo código
    return data && data.length > 0 ? data[0] : null;
  }

  async getSensorsByCode(sensorCode) {
    const { data, error } = await this.client
      .from('sensors')
      .select(`
        id, type, code, name, status, organization_id, asset_id, thresholds,
        firmware:sensor_firmwares ( sensor_types, structure )
      `)
      .eq('code', sensorCode);

    if (error) {
      throw new Error(`Error al buscar sensores: ${error.message}`);
    }

    return data || [];
  }

  async getAllSensors() {
    const { data, error } = await this.client
      .from('sensors')
      .select('id, name, status, last_reading_timestamp, organization_id, asset_id');

    if (error) {
      throw new Error(`Error al obtener todos los sensores: ${error.message}`);
    }

    return data || [];
  }

  async updateSensorStatus(sensorId, status) {
    const { error } = await this.client
      .from('sensors')
      .update({ status })
      .eq('id', sensorId);

    if (error) {
      throw new Error(`Error al actualizar estado del sensor: ${error.message}`);
    }
  }

  async updateSensorLastReading(sensorId, reading) {
    const payload = {
      last_reading_timestamp: new Date().toISOString(),
      last_value: reading.value,
      last_unit: reading.unit
    };

    const { error } = await this.client
      .from('sensors')
      .update(payload)
      .eq('id', sensorId);

    if (error) {
      throw new Error(`Error al actualizar última lectura: ${error.message}`);
    }
  }

  async updateSensorDeviceInfo(sensorId, deviceInfo) {
    const { error } = await this.client
      .from('sensors')
      .update(deviceInfo)
      .eq('id', sensorId);

    if (error) {
      throw new Error(`Error al actualizar información del dispositivo: ${error.message}`);
    }
  }

  async getLastReading(sensorId) {
    const { data, error } = await this.client
      .from('readings')
      .select('timestamp, value, unit')
      .eq('sensor_id', sensorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener última lectura: ${error.message}`);
    }

    return data;
  }

  async getActiveSensors() {
    const { data, error } = await this.client
      .from('sensors')
      .select('id, name, status, last_reading_timestamp, organization_id, asset_id')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Error al obtener sensores activos: ${error.message}`);
    }

    return data || [];
  }

  // Operaciones de lecturas
  async saveReading(readingData) {
    try {
      console.log('[DATABASE] Intentando guardar lectura:', JSON.stringify(readingData, null, 2));
      
      // Determinar el nombre de la tabla basado en el tipo de lectura
      const tableName = `${readingData.type}_readings`;
      console.log(`[DATABASE] Usando tabla: ${tableName}`);
      
      const result = await this.client
        .from(tableName)
        .insert(readingData);

      console.log('[DATABASE] Resultado completo de la inserción:', JSON.stringify(result, null, 2));

      if (result.error) {
        console.error('[DATABASE] Error detallado al guardar lectura:', JSON.stringify(result.error, null, 2));
        console.error('[DATABASE] Propiedades del error:', Object.keys(result.error));
        
        let errorMessage = 'Error desconocido';
        if (result.error.message) {
          errorMessage = result.error.message;
        } else if (result.error.details) {
          errorMessage = result.error.details;
        } else if (result.error.hint) {
          errorMessage = result.error.hint;
        } else if (result.error.code) {
          errorMessage = `Código de error: ${result.error.code}`;
        } else {
          errorMessage = JSON.stringify(result.error);
        }
        
        throw new Error(`Error al guardar lectura en ${tableName}: ${errorMessage}`);
      }
      
      console.log(`[DATABASE] ✓ Lectura guardada exitosamente en ${tableName}`);
    } catch (err) {
      console.error('[DATABASE] Error crítico al guardar lectura:', err);
      console.error('[DATABASE] Tipo de error:', typeof err);
      console.error('[DATABASE] Stack trace:', err.stack);
      throw err;
    }
  }

  // Método específico para guardar lecturas de vibración
  async saveVibrationReading(vibrationData) {
    try {
      console.log('[DATABASE] Intentando guardar lectura de vibración:', JSON.stringify(vibrationData, null, 2));
      
      // Remover el campo 'type' si existe, ya que vibration_readings no lo tiene
      const { type, ...dataToSave } = vibrationData;
      
      const result = await this.client
        .from('vibration_readings')
        .insert(dataToSave);

      console.log('[DATABASE] Resultado completo de la inserción de vibración:', JSON.stringify(result, null, 2));

      if (result.error) {
        console.error('[DATABASE] Error detallado al guardar lectura de vibración:', JSON.stringify(result.error, null, 2));
        console.error('[DATABASE] Propiedades del error:', Object.keys(result.error));
        
        let errorMessage = 'Error desconocido';
        if (result.error.message) {
          errorMessage = result.error.message;
        } else if (result.error.details) {
          errorMessage = result.error.details;
        } else if (result.error.hint) {
          errorMessage = result.error.hint;
        } else if (result.error.code) {
          errorMessage = `Código de error: ${result.error.code}`;
        } else {
          errorMessage = JSON.stringify(result.error);
        }
        
        throw new Error(`Error al guardar lectura de vibración: ${errorMessage}`);
      }
      
      console.log(`[DATABASE] ✓ Lectura de vibración guardada exitosamente`);
    } catch (err) {
      console.error('[DATABASE] Error crítico al guardar lectura de vibración:', err);
      console.error('[DATABASE] Tipo de error:', typeof err);
      console.error('[DATABASE] Stack trace:', err.stack);
      throw err;
    }
  }

  // Método optimizado para insertar múltiples lecturas de vibración en un solo bloque
  async saveVibrationReadingsBatch(vibrationReadings) {
    try {
      console.log('[DATABASE] Intentando guardar lecturas de vibración en lote:', JSON.stringify(vibrationReadings, null, 2));
      
      // Remover el campo 'type' de cada lectura si existe
      const dataToSave = vibrationReadings.map(reading => {
        const { type, ...cleanReading } = reading;
        return cleanReading;
      });
      
      const result = await this.client
        .from('vibration_readings')
        .insert(dataToSave);

      console.log('[DATABASE] Resultado completo de la inserción en lote de vibración:', JSON.stringify(result, null, 2));

      if (result.error) {
        console.error('[DATABASE] Error detallado al guardar lecturas de vibración en lote:', JSON.stringify(result.error, null, 2));
        console.error('[DATABASE] Propiedades del error:', Object.keys(result.error));
        
        let errorMessage = 'Error desconocido';
        if (result.error.message) {
          errorMessage = result.error.message;
        } else if (result.error.details) {
          errorMessage = result.error.details;
        } else if (result.error.hint) {
          errorMessage = result.error.hint;
        } else if (result.error.code) {
          errorMessage = `Código de error: ${result.error.code}`;
        } else {
          errorMessage = JSON.stringify(result.error);
        }
        
        throw new Error(`Error al guardar lecturas de vibración en lote: ${errorMessage}`);
      }
      
      console.log(`[DATABASE] ✓ ${dataToSave.length} lecturas de vibración guardadas exitosamente en lote`);
    } catch (err) {
      console.error('[DATABASE] Error crítico al guardar lecturas de vibración en lote:', err);
      console.error('[DATABASE] Tipo de error:', typeof err);
      console.error('[DATABASE] Stack trace:', err.stack);
      throw err;
    }
  }

  // Método específico para guardar lecturas de temperatura
  async saveTemperatureReading(temperatureData) {
    try {
      console.log('[DATABASE] Intentando guardar lectura de temperatura:', JSON.stringify(temperatureData, null, 2));
      
      // Remover el campo 'type' si existe, ya que temperature_readings no lo tiene
      const { type, ...dataToSave } = temperatureData;
      
      const result = await this.client
        .from('temperature_readings')
        .insert(dataToSave);

      console.log('[DATABASE] Resultado completo de la inserción de temperatura:', JSON.stringify(result, null, 2));

      if (result.error) {
        console.error('[DATABASE] Error detallado al guardar lectura de temperatura:', JSON.stringify(result.error, null, 2));
        console.error('[DATABASE] Propiedades del error:', Object.keys(result.error));
        
        let errorMessage = 'Error desconocido';
        if (result.error.message) {
          errorMessage = result.error.message;
        } else if (result.error.details) {
          errorMessage = result.error.details;
        } else if (result.error.hint) {
          errorMessage = result.error.hint;
        } else if (result.error.code) {
          errorMessage = `Código de error: ${result.error.code}`;
        } else {
          errorMessage = JSON.stringify(result.error);
        }
        
        throw new Error(`Error al guardar lectura de temperatura: ${errorMessage}`);
      }
      
      console.log(`[DATABASE] ✓ Lectura de temperatura guardada exitosamente`);
    } catch (err) {
      console.error('[DATABASE] Error crítico al guardar lectura de temperatura:', err);
      console.error('[DATABASE] Tipo de error:', typeof err);
      console.error('[DATABASE] Stack trace:', err.stack);
      throw err;
    }
  }

  // Operaciones de análisis
  async getExistingAnalysis(sensorId) {
    const { data, error } = await this.client
      .from('analysis_results')
      .select('id')
      .eq('sensor_id', sensorId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al buscar análisis existente: ${error.message}`);
    }

    return data;
  }

  async saveAnalysisResult(analysisData) {
    const { error } = await this.client
      .from('analysis_results')
      .insert(analysisData);

    if (error) {
      throw new Error(`Error al insertar resultado de análisis: ${error.message}`);
    }
  }

  async updateAnalysisResult(analysisId, analysisData) {
    const { error } = await this.client
      .from('analysis_results')
      .update(analysisData)
      .eq('id', analysisId);

    if (error) {
      throw new Error(`Error al actualizar resultado de análisis: ${error.message}`);
    }
  }

  async getLastAnalysis(sensorId) {
    const { data, error } = await this.client
      .from('analysis_results')
      .select('measured_value')
      .eq('sensor_id', sensorId)
      .order('analysis_timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error al obtener último análisis: ${error.message}`);
    }

    return data;
  }

  // Operaciones de alertas
  async getActiveAlert(sensorId, alertType) {
    const { data, error } = await this.client
      .from('alerts')
      .select('id, status, priority')
      .eq('sensor_id', sensorId)
      .eq('type', alertType)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      throw new Error(`Error al buscar alerta activa: ${error.message}`);
    }

    return data;
  }

  async createAlert(alertData) {
    const { error } = await this.client
      .from('alerts')
      .insert(alertData);

    if (error) {
      throw new Error(`Error al crear alerta: ${error.message}`);
    }
  }

  async updateAlert(alertId, updateData) {
    const { error } = await this.client
      .from('alerts')
      .update(updateData)
      .eq('id', alertId);

    if (error) {
      throw new Error(`Error al actualizar alerta: ${error.message}`);
    }
  }

  async resolveAlerts(sensorId, alertTypes) {
    const { error } = await this.client
      .from('alerts')
      .update({ 
        status: 'resolved', 
        resolved_time: new Date().toISOString() 
      })
      .eq('sensor_id', sensorId)
      .in('type', alertTypes)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Error al resolver alertas: ${error.message}`);
    }
  }

  async resolveBatteryAlerts(sensorIds) {
    const { error } = await this.client
      .from('alerts')
      .update({ 
        status: 'resolved', 
        resolved_time: new Date().toISOString() 
      })
      .in('sensor_id', sensorIds)
      .eq('type', 'battery')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Error al resolver alertas de batería: ${error.message}`);
    }
  }

  // Operaciones de perfiles de vibración
  async getAssetVibrationProfile(assetId) {
    if (!assetId) return null;

    const { data: assetData, error: assetError } = await this.client
      .from('assets_base')
      .select(`
        iso_group_id, 
        custom_vibration_profile_id, 
        rigidity_type_id, 
        iso_group:iso_groups!assets_base_iso_group_id_fkey(name), 
        custom_profile:custom_vibration_profiles!assets_base_custom_vibration_profile_id_fkey(name)
      `)
      .eq('id', assetId)
      .single();

    if (assetError) {
      throw new Error(`Error al obtener datos del asset: ${assetError.message}`);
    }

    return assetData;
  }

  async getCustomVibrationRanges(customProfileId) {
    const { data, error } = await this.client
      .from('custom_vibration_ranges')
      .select('*')
      .eq('custom_profile_id', customProfileId);

    if (error) {
      throw new Error(`Error al obtener rangos personalizados: ${error.message}`);
    }

    return data || [];
  }

  async getISOVibrationRanges(isoGroupId, rigidityTypeId) {
    const { data, error } = await this.client
      .from('vibration_ranges')
      .select('*')
      .eq('iso_groups_id', isoGroupId)
      .eq('rigidity_id', rigidityTypeId);

    if (error) {
      throw new Error(`Error al obtener rangos ISO: ${error.message}`);
    }

    return data || [];
  }

  // Suscripción a cambios en tiempo real
  subscribeToSensorChanges(callback) {
    const channel = this.client.channel('sensor-status-changes');

    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'sensors'
    }, callback);

    return channel;
  }
}

module.exports = DatabaseService;