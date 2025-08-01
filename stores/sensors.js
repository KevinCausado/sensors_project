// stores/sensors.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { useOrganizationStore } from './organizations';
import { useAssetStore } from './assets';

export const useSensorStore = defineStore('sensors', {
  state: () => ({
    sensors: [],
    isLoading: false,
    error: null,
    currentSensor: null,
    chartReadings: {}, 
    chartRealtimeSubscriptions: {},
    dashboardSensorUpdatesChannel: null,
    vibrationProfilesCache: {},
    currentSensorReadings: [], 
    detailRealtimeSubscription: null,
    brands: [],
    models: [],
    firmwares: [],
    hierarchyIsLoading: false,
  }),

  getters: {
    getReadingsBySensorId: (state) => (sensorId) => state.chartReadings[sensorId] || [],
    getSensorById: (state) => (id) => state.sensors.find(sensor => sensor.id === id),
    getVibrationProfileFromCache: (state) => (assetId) => state.vibrationProfilesCache[assetId],
    getModelsByBrand: (state) => (brandId) => {
      if (!brandId) return [];
      return state.models.filter(model => model.brand_id === brandId);
    },
    getFirmwaresByModel: (state) => (modelId) => {
      if (!modelId) return [];
      return state.firmwares.filter(firmware => firmware.model_id === modelId);
    },
    filteredSensors: (state) => {
        const organizationStore = useOrganizationStore();
        const assetStore = useAssetStore();
        let filtered = state.sensors;
        if (organizationStore.selectedOrganizationId) {
            filtered = filtered.filter(sensor => sensor.organizationId === organizationStore.selectedOrganizationId);
        }
        return filtered.map(sensor => {
            const asset = assetStore.assets.find(a => a.id === sensor.assetId);
            return { ...sensor, assetName: asset ? asset.name : 'Activo Desconocido' };
        });
    },
    // Getter anterior, se mantiene por si se usa en otro lado
    recentSensors: (state) => {
      const sensorsToProcess = state.filteredSensors;
      const filtered = sensorsToProcess.filter(sensor => sensor.last_communication);
      const sorted = filtered.sort((a, b) => new Date(b.last_communication).getTime() - new Date(a.last_communication).getTime());
      return sorted.slice(0, 5).map(sensor => ({
        ...sensor,
        value: sensor.last_value || null,
        unit: sensor.last_unit || null,
        lastReading: sensor.last_reading_timestamp || null,
      }));
    },

    // ===== NUEVO GETTER PARA EL DASHBOARD =====
    recentIntegratedDevices: (state) => {
        if (!state.sensors || state.sensors.length === 0) return [];

        const organizationStore = useOrganizationStore();
        const filteredByOrg = state.sensors.filter(sensor => 
            organizationStore.selectedOrganizationId === null || sensor.organizationId === sensor.organizationId
        );
        
        const statusPriority = { 'error': 4, 'inactive': 3, 'maintenance': 2, 'active': 1 };

        const grouped = filteredByOrg.reduce((acc, sensor) => {
            const key = sensor.code;
            if (!key) return acc;

            if (!acc[key]) {
                acc[key] = {
                    code: key,
                    brandName: sensor.brandName,
                    modelName: sensor.modelName,
                    assetName: sensor.assetName,
                    overallStatus: 'active',
                    latestTimestamp: null,
                    logicalSensorsCount: 0
                };
            }
            
            acc[key].logicalSensorsCount++;

            if ((statusPriority[sensor.status] || 0) > (statusPriority[acc[key].overallStatus] || 0)) {
                acc[key].overallStatus = sensor.status;
            }

            const sensorTimestamp = sensor.last_reading_timestamp ? new Date(sensor.last_reading_timestamp) : null;
            if (sensorTimestamp && (!acc[key].latestTimestamp || sensorTimestamp > acc[key].latestTimestamp)) {
                acc[key].latestTimestamp = sensorTimestamp;
            }

            return acc;
        }, {});

        const devices = Object.values(grouped);
        const communicatedDevices = devices.filter(d => d.latestTimestamp);
        communicatedDevices.sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));
        return communicatedDevices.slice(0, 5);
    }
  },

  actions: {
    // ... (El resto de tus actions permanecen igual) ...
    _getReadingsTableName(sensorType) {
      const typeMap = { temperature: 'temperature_readings', vibration: 'vibration_readings', humidity: 'humidity_readings', pressure: 'pressure_readings' };
      return typeMap[sensorType];
    },

    async fetchAndSubscribeChartReadings(sensorIds, startTime, endTime) {
      await this.unsubscribeFromChartReadings();
      this.isLoading = true;
      this.error = null;
      this.chartReadings = {};
      if (!sensorIds || sensorIds.length === 0) {
        this.isLoading = false;
        return;
      }
      const { $supabase } = useNuxtApp();
      try {
        const { data: historicalData, error: rpcError } = await $supabase.rpc('get_aggregated_sensor_readings', { p_sensor_ids: sensorIds, p_start_time: startTime, p_end_time: endTime });
        if (rpcError) throw rpcError;
        const readingsBySensor = {};
        for (const row of historicalData) {
          if (!readingsBySensor[row.sensor_id]) readingsBySensor[row.sensor_id] = [];
          readingsBySensor[row.sensor_id].push({ timestamp: row.bucket_time, value: row.avg_value, x: row.avg_x, y: row.avg_y, z: row.avg_z });
        }
        this.chartReadings = readingsBySensor;
        this.subscribeToNewReadings(sensorIds);
      } catch (e) {
        this.error = 'Error al cargar los datos del gráfico: ' + e.message;
      } finally {
        this.isLoading = false;
      }
    },

    subscribeToNewReadings(sensorIds) {
      const { $supabase } = useNuxtApp();
      for (const sensorId of sensorIds) {
        if (this.chartRealtimeSubscriptions[sensorId]) continue;
        const sensor = this.sensors.find(s => s.id === sensorId);
        if (!sensor) continue;
        const tableName = this._getReadingsTableName(sensor.type);
        if (!tableName) continue;
        const channel = $supabase.channel(`chart-realtime-${sensorId}`);
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableName, filter: `sensor_id=eq.${sensorId}` }, payload => {
          if (!this.chartReadings[sensorId]) this.chartReadings[sensorId] = [];
          
        
          if (sensor.type === 'vibration') {
            const newReading = payload.new;
            const ts = newReading.timestamp;
            const axis = newReading.axis.toLowerCase();
            const value = newReading.oavelocity;

            if (!['x', 'y', 'z'].includes(axis)) return;

            const existingReading = this.chartReadings[sensorId].find(r => r.timestamp === ts);

            if (existingReading) {
              const updatedReading = { ...existingReading, [axis]: value };
              const index = this.chartReadings[sensorId].indexOf(existingReading);
              this.chartReadings[sensorId][index] = updatedReading;
            } else {
              const readingToAdd = { timestamp: ts, value: null, x: null, y: null, z: null };
              readingToAdd[axis] = value;
              this.chartReadings[sensorId].push(readingToAdd);
            }
          } else {
            this.chartReadings[sensorId].push({ timestamp: payload.new.timestamp, value: payload.new.value, x: null, y: null, z: null });
          }
     
        }).subscribe();
        this.chartRealtimeSubscriptions[sensorId] = channel;
      }
    },

    async unsubscribeFromChartReadings() {
      for (const id in this.chartRealtimeSubscriptions) {
        await this.chartRealtimeSubscriptions[id].unsubscribe();
      }
      this.chartRealtimeSubscriptions = {};
    },

  
    async subscribeToSensorUpdates() {
      if (this.dashboardSensorUpdatesChannel) return;
      try {
        const { $supabase } = useNuxtApp();
        const channel = $supabase
          .channel('public:sensors_table_updates_dashboard') 
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, 
            async (payload) => {
              if (payload.eventType === 'UPDATE') {
                  const updatedId = payload.new.id;
                  if (this.currentSensor && this.currentSensor.id === updatedId) {
                      await this.fetchSensor(updatedId, false);
                  }
                  const index = this.sensors.findIndex(s => s.id === updatedId);
                  if (index !== -1) {
                      const { data: fullData } = await $supabase.from('sensors').select(`*, asset:assets_base(name, city, state, country), firmware:sensor_firmwares(version, model:sensor_models(name, brand:sensor_brands(name)))`).eq('id', updatedId).single();
                      if (fullData) this.sensors[index] = this._mapSensorData(fullData);
                  }
              } else {
                  await this.fetchSensors();
              }
            }
          )
          .subscribe();
        this.dashboardSensorUpdatesChannel = channel;
      } catch (e) {
        console.error('[Sensors Store] Error al suscribirse a cambios generales de sensores:', e);
      }
    },

    async unsubscribeFromSensorUpdates() {
      if (this.dashboardSensorUpdatesChannel) {
        await this.dashboardSensorUpdatesChannel.unsubscribe();
        this.dashboardSensorUpdatesChannel = null;
      }
    },

    _mapSensorData(sensor) {
        return {
          id: sensor.id, name: sensor.name, code: sensor.code, status: sensor.status,
          location_description: sensor.location_description, assetId: sensor.asset_id,
          organizationId: sensor.organization_id, assetName: sensor.asset?.name || 'N/A',
          brand: sensor.firmware?.model?.brand?.name || 'N/A', model: sensor.firmware?.model?.name || 'N/A',
          firmware: sensor.firmware?.version || 'N/A', last_communication: sensor.last_communication,
          battery_level: sensor.battery_level, signal_strength: sensor.signal_strength,
          thresholds: sensor.thresholds, type: sensor.type, unit: sensor.unit,
          last_value: sensor.last_value, last_unit: sensor.last_unit,
          last_reading_timestamp: sensor.last_reading_timestamp, created_at: sensor.created_at,
          assetCity: sensor.asset?.city, assetState: sensor.asset?.state, assetCountry: sensor.asset?.country,
          firmware_id: sensor.firmware_id, organizationName: sensor.organization?.name || 'N/A',
          brandName: sensor.firmware?.model?.brand?.name || 'N/A', modelName: sensor.firmware?.model?.name || 'N/A',
          firmwareVersion: sensor.firmware?.version || 'N/A', brandId: sensor.firmware?.model?.brand_id || null,
          modelId: sensor.firmware?.model_id || null,
        };
    },
    
    async fetchSensorHierarchy() {
        if (this.brands.length > 0) return;
        this.hierarchyIsLoading = true;
        try {
            const { $supabase } = useNuxtApp();
            const [brandsRes, modelsRes, firmwaresRes] = await Promise.all([
                $supabase.from('sensor_brands').select('id, name').order('name'),
                $supabase.from('sensor_models').select('id, name, brand_id').order('name'),
                $supabase.from('sensor_firmwares').select('id, version, model_id').order('version'),
            ]);

            if (brandsRes.error) throw brandsRes.error;
            if (modelsRes.error) throw modelsRes.error;
            if (firmwaresRes.error) throw firmwaresRes.error;

            this.brands = brandsRes.data;
            this.models = modelsRes.data;
            this.firmwares = firmwaresRes.data;
        } catch (e) {
            this.error = 'Failed to fetch sensor hierarchy: ' + e.message;
        } finally {
            this.hierarchyIsLoading = false;
        }
    },

    async fetchSensors() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase.from('sensors').select(`*, asset:assets_base(name, city, state, country), firmware:sensor_firmwares(version, model:sensor_models(name, brand:sensor_brands(name)))`);
        if (error) throw error;
        this.sensors = data.map(sensor => this._mapSensorData(sensor));
      } catch (e) {
        this.error = 'Failed to fetch sensors: ' + e.message;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSensor(id, setLoading = true) {
        if (setLoading) this.isLoading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();
            const { data, error } = await $supabase.from('sensors').select(`*, organization:organizations(name), asset:assets_base(name, city, state, country), firmware:sensor_firmwares(id, version, model_id, model:sensor_models(id, name, brand_id, brand:sensor_brands(id, name)))`).eq('id', id).single();
            if (error) throw error;
            if (!data) { this.error = `Sensor con ID ${id} no encontrado.`; this.currentSensor = null; return null; }
            this.currentSensor = this._mapSensorData(data);
            return this.currentSensor;
        } catch (e) {
            this.error = 'Failed to fetch sensor: ' + e.message;
            return null;
        } finally {
            if (setLoading) this.isLoading = false;
        }
    },


     async _getVibrationThresholdsForAsset(assetId) {
      if (!assetId) return null;
      const { $supabase } = useNuxtApp();
      try {
        const { data: assetData, error: assetError } = await $supabase.from('assets_base').select('iso_group_id, custom_vibration_profile_id, rigidity_type_id').eq('id', assetId).single();
        if (assetError || !assetData) {
          console.error("Error fetching asset for thresholds:", assetError);
          return null;
        }
        let ranges = [];
        if (assetData.custom_vibration_profile_id) {
          const { data: customRanges, error: customError } = await $supabase.from('custom_vibration_ranges').select('severity, min_value, max_value').eq('custom_profile_id', assetData.custom_vibration_profile_id);
          if (customError) throw customError;
          ranges = customRanges;
        } else if (assetData.iso_group_id && assetData.rigidity_type_id) {
          const { data: isoRanges, error: isoError } = await $supabase.from('vibration_ranges').select('severity, min_value, max_value').eq('iso_groups_id', assetData.iso_group_id).eq('rigidity_id', assetData.rigidity_type_id);
          if (isoError) throw isoError;
          ranges = isoRanges;
        } else { return null; }
        if (ranges.length === 0) return null;
        const thresholds = ranges.reduce((acc, range) => {
            switch (range.severity) {
                case 'A': acc.normalMin = range.min_value; acc.criticalMin = range.min_value; acc.normalMax = range.max_value; break;
                case 'B': acc.alarm_level = range.max_value; break;
                case 'C': acc.criticalMax = range.max_value; break;
                case 'D': acc.critical_level = range.max_value; break;
            }
            return acc;
        }, { normalMax: null, normalMin: null, alarm_level: null, criticalMax: null, criticalMin: null, critical_level: null });
        return thresholds;
      } catch (e) {
        console.error('[Sensor Store] Failed to calculate vibration thresholds:', e.message);
        return null;
      }
    },  

     async createSensor(sensorData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const dataToInsert = { ...sensorData };

        if (dataToInsert.asset_id && dataToInsert.type === 'vibration') {
          const thresholds = await this._getVibrationThresholdsForAsset(dataToInsert.asset_id);
          if (thresholds) {
            dataToInsert.thresholds = thresholds;
          }
        }
        
        const { data: newSensor, error } = await $supabase
          .from('sensors')
          .insert([dataToInsert])
          .select()
          .single();

        if (error) throw error;
        
        await this.fetchSensors();
        return newSensor;
      } catch (e) {
        this.error = 'Failed to create sensor: ' + e.message;
        throw e;
      } finally {
        this.isLoading = false;
      }
    },
    
    async updateSensor(id, sensorData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase.from('sensors').update(sensorData).eq('id', id).select().single();
        if (error) throw error;

        if (data && data.asset_id && data.type === 'vibration') {
          await this.updateVibrationSensorThresholdsForAsset(data.asset_id);
        }

        await this.fetchSensors();
        return data;
      } catch (e) {
        this.error = 'Failed to update sensor: ' + e.message;
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteSensor(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const { error } = await useNuxtApp().$supabase.from('sensors').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        this.error = 'Failed to delete sensor: ' + e.message;
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteDeviceByCode(code) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { error } = await $supabase.from('sensors').delete().eq('code', code);
        if (error) throw error;
        await this.fetchSensors();
      } catch (e) {
        this.error = 'Falló al eliminar el dispositivo: ' + e.message;
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async getVibrationProfileForAsset(assetId) {
        if (!assetId) return { profile: null, thresholds: {} };
        if (this.vibrationProfilesCache[assetId]) return { profile: this.vibrationProfilesCache[assetId], thresholds: {} };
        this.isLoading = true;
        try {
            const { $supabase } = useNuxtApp();
            const { data: assetData, error: assetError } = await $supabase.from('assets_base').select(`iso_group_id, custom_vibration_profile_id, rigidity_type_id, iso_group:iso_groups!assets_base_iso_group_id_fkey(name, description), custom_profile:custom_vibration_profiles!assets_base_custom_vibration_profile_id_fkey(name, description), rigidity:rigidity_types!assets_base_rigidity_type_id_fkey(name)`).eq('id', assetId).single();
            if (assetError) throw new Error(`Error al obtener el activo: ${assetError.message}`);
            if (!assetData) return { profile: null, thresholds: {} };
            let ranges = [];
            let profileInfo = { name: 'Perfil Desconocido', description: '', rigidity_name: assetData.rigidity?.name || 'N/A', unit: 'mm/s' };
            const severityDescriptions = { 'A': 'Buena (Operación nueva)', 'B': 'Satisfactoria (Operación continua)', 'C': 'Insatisfactoria (No apta para op. continua)', 'D': 'Inaceptable (Peligro de daño)' };
            if (assetData.custom_vibration_profile_id) {
                profileInfo.name = assetData.custom_profile?.name || 'Perfil Personalizado';
                profileInfo.description = assetData.custom_profile?.description;
                const { data: customRanges, error: customError } = await $supabase.from('custom_vibration_ranges').select('severity, min_value, max_value, condition_name').eq('custom_profile_id', assetData.custom_vibration_profile_id);
                if (customError) throw new Error(`Error al obtener rangos personalizados: ${customError.message}`);
                ranges = customRanges;
            } else if (assetData.iso_group_id) {
                profileInfo.name = assetData.iso_group?.name || 'Estándar ISO';
                profileInfo.description = assetData.iso_group?.description;
                const { data: isoRanges, error: isoError } = await $supabase.from('vibration_ranges').select('severity, min_value, max_value').eq('iso_groups_id', assetData.iso_group_id).eq('rigidity_id', assetData.rigidity_type_id);
                if (isoError) throw new Error(`Error al obtener rangos ISO: ${isoError.message}`);
                ranges = isoRanges.map(r => ({...r, condition_name: severityDescriptions[r.severity] || 'Desconocido' }));
            }
            if (ranges.length === 0) return { profile: null, thresholds: {} };
            profileInfo.ranges = ranges;
            this.vibrationProfilesCache[assetId] = profileInfo;
            return { profile: profileInfo, thresholds: {} };
        } catch (e) {
            console.error('[Sensor Store] Error en getVibrationProfileForAsset:', e.message);
            return { profile: null, thresholds: {} };
        } finally {
            this.isLoading = false;
        }
    },

    async updateVibrationSensorThresholdsForAsset(assetId) {
      if (!assetId) {
        console.warn('[Sensor Store] Se intentó actualizar umbrales sin un assetId.');
        return;
      }
      const { $supabase } = useNuxtApp();
      try {
        const { data: assetData, error: assetError } = await $supabase.from('assets_base').select('iso_group_id, custom_vibration_profile_id, rigidity_type_id').eq('id', assetId).single();
        if (assetError) throw new Error(`Error al obtener el activo: ${assetError.message}`);
        if (!assetData) throw new Error(`Activo con ID ${assetId} no encontrado.`);
        let ranges = [];
        if (assetData.custom_vibration_profile_id) {
          const { data: customRanges, error: customError } = await $supabase.from('custom_vibration_ranges').select('severity, min_value, max_value').eq('custom_profile_id', assetData.custom_vibration_profile_id);
          if (customError) throw new Error(`Error al obtener rangos personalizados: ${customError.message}`);
          ranges = customRanges;
        } else if (assetData.iso_group_id && assetData.rigidity_type_id) {
          const { data: isoRanges, error: isoError } = await $supabase.from('vibration_ranges').select('severity, min_value, max_value').eq('iso_groups_id', assetData.iso_group_id).eq('rigidity_id', assetData.rigidity_type_id);
          if (isoError) throw new Error(`Error al obtener rangos ISO: ${isoError.message}`);
          ranges = isoRanges;
        } else {
          return;
        }
        if (ranges.length === 0) {
            return;
        }
        const thresholds = ranges.reduce((acc, range) => {
            switch (range.severity) {
                case 'A': acc.normalMin = range.min_value; acc.criticalMin = range.min_value; acc.normalMax = range.max_value; break;
                case 'B': acc.alarm_level = range.max_value; break;
                case 'C': acc.criticalMax = range.max_value; break;
                case 'D': acc.critical_level = range.max_value; break;
            }
            return acc;
        }, { normalMax: null, normalMin: null, alarm_level: null, criticalMax: null, criticalMin: null, critical_level: null });
        const { data: sensorsToUpdate, error: sensorsError } = await $supabase.from('sensors').select('id').eq('asset_id', assetId).eq('type', 'vibration');
        if (sensorsError) throw new Error(`Error al buscar sensores: ${sensorsError.message}`);
        if (!sensorsToUpdate || sensorsToUpdate.length === 0) {
          return;
        }
        const updatePromises = sensorsToUpdate.map(sensor =>
          $supabase.from('sensors').update({ thresholds: thresholds }).eq('id', sensor.id)
        );
        const results = await Promise.all(updatePromises);
        results.forEach(result => {
          if (result.error) {
            console.error('[Sensor Store] Error al actualizar un sensor:', result.error.message);
          }
        });
        this.fetchSensors();
      } catch (e) {
        console.error('[Sensor Store] Falló la actualización de umbrales de vibración:', e.message);
        this.error = e.message;
      }
    },

    async fetchAndSubscribeToDetailReadings(sensorId) {
      if (this.detailRealtimeSubscription) await this.detailRealtimeSubscription.unsubscribe();
      this.isLoading = true;
      this.error = null;
      this.currentSensorReadings = [];
      const { $supabase } = useNuxtApp();
      if (!this.currentSensor || this.currentSensor.id !== sensorId) await this.fetchSensor(sensorId);
      if (!this.currentSensor) { this.error = "No se pudo cargar la información del sensor."; this.isLoading = false; return; }
      const tableName = this._getReadingsTableName(this.currentSensor.type);
      if (!tableName) { this.error = `Tipo de sensor no soportado: ${this.currentSensor.type}`; this.isLoading = false; return; }
      try {
        if (this.currentSensor.type === 'vibration') {
            const { data, error } = await $supabase.from('vibration_readings').select('id, timestamp, axis, oavelocity, peak, rms').eq('sensor_id', sensorId).order('timestamp', { ascending: false }).limit(300);
            if (error) throw error;
            const readingsMap = new Map();
            data.forEach(r => {
                const ts = new Date(r.timestamp).getTime();
                if (!readingsMap.has(ts)) readingsMap.set(ts, { id: ts, timestamp: r.timestamp, unit: this.currentSensor.unit, x: null, y: null, z: null });
                const group = readingsMap.get(ts);
                const axis = r.axis.toLowerCase();
                if (['x', 'y', 'z'].includes(axis)) group[axis] = { id: r.id, oavelocity: r.oavelocity, peak: r.peak, rms: r.rms };
            });
            this.currentSensorReadings = Array.from(readingsMap.values()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            const channel = $supabase.channel(`sensor_readings_${sensorId}`);
            channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vibration_readings', filter: `sensor_id=eq.${sensorId}`}, p => {
                const newR = p.new;
                const ts = new Date(newR.timestamp).getTime();
                const axis = newR.axis.toLowerCase();
                let group = readingsMap.get(ts);
                if (group) group[axis] = { id: newR.id, oavelocity: newR.oavelocity, peak: newR.peak, rms: newR.rms };
                else { group = { id: ts, timestamp: newR.timestamp, unit: this.currentSensor.unit, x: null, y: null, z: null }; group[axis] = { id: newR.id, oavelocity: newR.oavelocity, peak: newR.peak, rms: newR.rms }; readingsMap.set(ts, group); }
                this.currentSensorReadings = Array.from(readingsMap.values()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            }).subscribe();
            this.detailRealtimeSubscription = channel;
        } else {
            const { data, error } = await $supabase.from(tableName).select('id, value, timestamp').eq('sensor_id', sensorId).order('timestamp', { ascending: false }).limit(100);
            if (error) throw error;
            this.currentSensorReadings = data.map(r => ({ id: r.id, value: r.value, timestamp: r.timestamp, unit: this.currentSensor.unit, details: {} }));
            const channel = $supabase.channel(`sensor_readings_${sensorId}`);
            channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableName, filter: `sensor_id=eq.${sensorId}`}, p => {
              this.currentSensorReadings.unshift({ id: p.new.id, value: p.new.value, timestamp: p.new.timestamp, unit: this.currentSensor.unit, details: {} });
            }).subscribe();
            this.detailRealtimeSubscription = channel;
        }
      } catch (e) {
        this.error = 'Failed to fetch or subscribe to detail readings: ' + e.message;
      } finally {
        this.isLoading = false;
      }
    },

    async unsubscribeFromDetailReadings() {
      if (this.detailRealtimeSubscription) {
        await this.detailRealtimeSubscription.unsubscribe();
        this.detailRealtimeSubscription = null;
      }
    },
  }
});
