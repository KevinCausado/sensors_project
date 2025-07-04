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
    currentSensorReadings: [],
    allSensorRecentReadings: {},
    dashboardRealtimeSubscriptions: {},
    dashboardSensorUpdatesChannel: null,
    detailRealtimeSubscription: null,
    brands: [],
    models: [],
    firmwares: [],
    hierarchyIsLoading: false,
  }),

  getters: {
    getSensorById: (state) => (id) => {
      return state.sensors.find(sensor => sensor.id === id);
    },
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
        filtered = filtered.filter(sensor =>
          sensor.organizationId === organizationStore.selectedOrganizationId
        );
      }

      const enrichedSensors = filtered.map(sensor => {
        let assetName = 'N/A';
        if (assetStore.assets.length > 0 && sensor.assetId) {
          const asset = assetStore.assets.find(a => a.id === sensor.assetId);
          assetName = asset ? asset.name : 'Activo Desconocido';
        }

        return {
          ...sensor,
          assetName: assetName,
        };
      });
      return enrichedSensors;
    },
    recentSensors: (state) => {
      const sensorsToProcess = state.filteredSensors;
      const filtered = sensorsToProcess.filter(sensor => sensor.last_communication);
      const sorted = filtered.sort((a, b) => {
        if (!a.last_communication && !b.last_communication) return 0;
        if (!b.last_communication) return -1;
        if (!a.last_communication) return 1;
        return new Date(b.last_communication).getTime() - new Date(a.last_communication).getTime();
      });
      const latestFive = sorted.slice(0, 5);
      return latestFive.map(sensor => ({
        ...sensor,
        value: sensor.last_value || null,
        unit: sensor.last_unit || null,
        lastReading: sensor.last_reading_timestamp || null,
      }));
    },
    getReadingsBySensorId: (state) => (sensorId) => {
      return state.allSensorRecentReadings[sensorId] || [];
    },
  },

  actions: {
    _getReadingsTableName(sensorType) {
      const typeMap = {
        temperature: 'temperature_readings',
        vibration: 'vibration_readings',
        humidity: 'humidity_readings',
        pressure: 'pressure_readings'
      };
      const tableName = typeMap[sensorType];
      if (!tableName) {
        console.warn(`Unsupported sensor type for readings table: ${sensorType}`);
      }
      return tableName;
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
        const { data, error } = await $supabase
          .from('sensors')
          .select(`
            id, name, code, status, location_description, asset_id, organization_id,
            last_communication, battery_level, signal_strength, thresholds, type, unit,
            last_value, last_unit, last_reading_timestamp, created_at,
            asset:assets_base(name, city, state, country),
            firmware:sensor_firmwares(version, model:sensor_models(name, brand:sensor_brands(name)))
          `);

        if (error) throw error;

        this.sensors = data.map(sensor => ({
          id: sensor.id,
          name: sensor.name,
          code: sensor.code,
          location_description: sensor.location_description,
          status: sensor.status,
          organizationId: sensor.organization_id,
          assetId: sensor.asset_id,
          assetName: sensor.asset ? sensor.asset.name : 'N/A',
          assetCity: sensor.asset ? sensor.asset.city : 'N/A',
          assetState: sensor.asset ? sensor.asset.state : 'N/A',
          assetCountry: sensor.asset ? sensor.asset.country : 'N/A',
          brand: sensor.firmware?.model?.brand?.name || 'N/A',
          model: sensor.firmware?.model?.name || 'N/A',
          firmware: sensor.firmware?.version || 'N/A',
          last_communication: sensor.last_communication,
          battery_level: sensor.battery_level,
          signal_strength: sensor.signal_strength,
          thresholds: sensor.thresholds,
          type: sensor.type,
          unit: sensor.unit,
          last_value : sensor.last_value,
          last_unit: sensor.last_unit,
          last_reading_timestamp : sensor.last_reading_timestamp,
          created_at : sensor.created_at,
        }));
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
            const { data, error } = await $supabase
              .from('sensors')
              .select(`
                *,
                organization:organizations(name),
                asset:assets_base(name, city, state, country),
                firmware:sensor_firmwares(id, version, model_id, model:sensor_models(id, name, brand_id, brand:sensor_brands(id, name)))
              `)
              .eq('id', id)
              .single();

            if (error) throw error;
            if (!data) {
                this.error = `Sensor con ID ${id} no encontrado.`;
                this.currentSensor = null;
                return null;
            }

            const mappedSensor = {
                id: data.id,
                name: data.name,
                code: data.code,
                firmware_id: data.firmware_id,
                location_description: data.location_description,
                status: data.status,
                organizationId: data.organization_id,
                organizationName: data.organization?.name || 'N/A',
                assetId: data.asset_id,
                assetName: data.asset?.name || 'N/A',
                assetCity: data.asset?.city,
                assetState: data.asset?.state,
                assetCountry: data.asset?.country,
                brandName: data.firmware?.model?.brand?.name || 'N/A',
                modelName: data.firmware?.model?.name || 'N/A',
                firmwareVersion: data.firmware?.version || 'N/A',
                brandId: data.firmware?.model?.brand_id || null,
                modelId: data.firmware?.model_id || null,
                last_communication: data.last_communication,
                battery_level: data.battery_level,
                signal_strength: data.signal_strength,
                thresholds: data.thresholds,
                type: data.type,
                unit: data.unit,
                last_value: data.last_value,
                last_unit: data.last_unit,
                last_reading_timestamp: data.last_reading_timestamp,
                created_at: data.created_at
            };
            this.currentSensor = mappedSensor;
            return mappedSensor;
        } catch (e) {
            this.error = 'Failed to fetch sensor: ' + e.message;
            return null;
        } finally {
            if (setLoading) this.isLoading = false;
        }
    },

    async createSensor(sensorData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data: newSensor, error } = await $supabase
          .from('sensors')
          .insert([sensorData])
          .select()
          .single();

        if (error) throw error;
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
        const { data, error } = await $supabase
          .from('sensors')
          .update(sensorData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
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
        const { error } = await useNuxtApp().$supabase
          .from('sensors')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        this.error = 'Failed to delete sensor: ' + e.message;
        throw e;
      } finally {
        this.isLoading = false;
      }
    },
    
    async getVibrationProfileForAsset(assetId) {
        if (!assetId) return { profile: null, thresholds: {} };
        this.isLoading = true;
        try {
            const { $supabase } = useNuxtApp();
            const { data: assetData, error: assetError } = await $supabase
                .from('assets_base')
                .select(`
                    iso_group_id, 
                    custom_vibration_profile_id, 
                    rigidity_type_id,
                    iso_group:iso_groups!assets_base_iso_group_id_fkey(name, description),
                    custom_profile:custom_vibration_profiles!assets_base_custom_vibration_profile_id_fkey(name, description),
                    rigidity:rigidity_types!assets_base_rigidity_type_id_fkey(name)
                `)
                .eq('id', assetId)
                .single();

            if (assetError) throw new Error(`Error al obtener el activo: ${assetError.message}`);
            if (!assetData) return { profile: null, thresholds: {} };

            let ranges = [];
            let profileInfo = {
                name: 'Perfil Desconocido',
                description: '',
                rigidity_name: assetData.rigidity?.name || 'N/A',
                unit: 'mm/s'
            };

            const severityDescriptions = {
                'A': 'Buena (Operación nueva)',
                'B': 'Satisfactoria (Operación continua)',
                'C': 'Insatisfactoria (No apta para op. continua)',
                'D': 'Inaceptable (Peligro de daño)'
            };

            if (assetData.custom_vibration_profile_id) {
                profileInfo.name = assetData.custom_profile?.name || 'Perfil Personalizado';
                profileInfo.description = assetData.custom_profile?.description;

                const { data: customRanges, error: customError } = await $supabase
                    .from('custom_vibration_ranges')
                    .select('severity, min_value, max_value, condition_name')
                    .eq('custom_profile_id', assetData.custom_vibration_profile_id);
                
                if (customError) throw new Error(`Error al obtener rangos personalizados: ${customError.message}`);
                ranges = customRanges;

            } else if (assetData.iso_group_id) {
                profileInfo.name = assetData.iso_group?.name || 'Estándar ISO';
                profileInfo.description = assetData.iso_group?.description;

                const { data: isoRanges, error: isoError } = await $supabase
                    .from('vibration_ranges')
                    .select('severity, min_value, max_value')
                    .eq('iso_groups_id', assetData.iso_group_id)
                    .eq('rigidity_id', assetData.rigidity_type_id);

                if (isoError) throw new Error(`Error al obtener rangos ISO: ${isoError.message}`);
                ranges = isoRanges.map(r => ({...r, condition_name: severityDescriptions[r.severity] || 'Desconocido' }));
            }

            if (ranges.length === 0) return { profile: null, thresholds: {} };
            
            profileInfo.ranges = ranges;
            return { profile: profileInfo, thresholds: {} };
        } catch (e) {
            console.error('[Sensor Store] Error en getVibrationProfileForAsset:', e.message);
            return { profile: null, thresholds: {} };
        } finally {
            this.isLoading = false;
        }
    },

    async subscribeToSensorUpdates() {
      if (this.dashboardSensorUpdatesChannel) return;
      try {
        const { $supabase } = useNuxtApp();
        const channel = $supabase
          .channel('public:sensors_table_updates_dashboard') 
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, 
            async (payload) => {
              const getFullSensorData = async (sensorId) => {
                  const { data, error } = await $supabase
                    .from('sensors')
                    .select(`
                      id, name, code, status, location_description, asset_id, organization_id,
                      last_communication, battery_level, signal_strength, thresholds, type, unit,
                      last_value, last_unit, last_reading_timestamp, created_at,
                      asset:assets_base(name, city, state, country),
                      firmware:sensor_firmwares(version, model:sensor_models(name, brand:sensor_brands(name)))
                    `)
                    .eq('id', sensorId)
                    .single();
                  if (error) {
                      console.error('Error fetching full sensor data on update:', error);
                      return null;
                  }
                  return data;
              };

              const mapFullSensor = (sensor) => ({
                  id: sensor.id, name: sensor.name, code: sensor.code, location_description: sensor.location_description,
                  status: sensor.status, organizationId: sensor.organization_id, assetId: sensor.asset_id,
                  assetName: sensor.asset?.name || 'N/A', assetCity: sensor.asset?.city || 'N/A',
                  assetState: sensor.asset?.state || 'N/A', assetCountry: sensor.asset?.country || 'N/A',
                  brand: sensor.firmware?.model?.brand?.name || 'N/A', model: sensor.firmware?.model?.name || 'N/A',
                  firmware: sensor.firmware?.version || 'N/A', last_communication: sensor.last_communication,
                  battery_level: sensor.battery_level, signal_strength: sensor.signal_strength,
                  thresholds: sensor.thresholds, type: sensor.type, unit: sensor.unit,
                  last_value: sensor.last_value, last_unit: sensor.last_unit,
                  last_reading_timestamp: sensor.last_reading_timestamp, created_at: sensor.created_at,
              });

              if (payload.eventType === 'UPDATE') {
                  const updatedId = payload.new.id;
                  if (this.currentSensor && this.currentSensor.id === updatedId) {
                      await this.fetchSensor(updatedId, false);
                  }
                  const fullData = await getFullSensorData(updatedId);
                  if (fullData) {
                      const mappedData = mapFullSensor(fullData);
                      const index = this.sensors.findIndex(s => s.id === mappedData.id);
                      if (index !== -1) {
                          this.sensors[index] = mappedData;
                      }
                  }
              } else if (payload.eventType === 'INSERT') {
                  const fullData = await getFullSensorData(payload.new.id);
                  if (fullData) {
                      const mappedData = mapFullSensor(fullData);
                      this.sensors.push(mappedData);
                  }
              } else if (payload.eventType === 'DELETE') {
                  const sensorId = payload.old.id;
                  this.sensors = this.sensors.filter(s => s.id !== sensorId);
                  if (this.currentSensor && this.currentSensor.id === sensorId) {
                      this.currentSensor = null;
                  }
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

    // =================================================================================
    // INICIO DE LA MODIFICACIÓN: Lógica de subscripción optimizada para reactividad
    // =================================================================================
    async fetchAndSubscribeToDetailReadings(sensorId) {
      if (this.detailRealtimeSubscription) {
        await this.detailRealtimeSubscription.unsubscribe();
        this.detailRealtimeSubscription = null;
      }
      this.isLoading = true;
      this.error = null;
      this.currentSensorReadings = [];
      const { $supabase } = useNuxtApp();

      if (!this.currentSensor || this.currentSensor.id !== sensorId) {
        await this.fetchSensor(sensorId);
      }

      if (!this.currentSensor) {
          this.error = "No se pudo cargar la información del sensor.";
          this.isLoading = false;
          return;
      }

      const sensorType = this.currentSensor.type;
      const tableName = this._getReadingsTableName(sensorType);

      if (!tableName) {
        this.error = `Tipo de sensor no soportado: ${sensorType}`;
        this.isLoading = false;
        return;
      }

      try {
        const readingsMap = new Map();

        if (sensorType === 'vibration') {
            const { data, error } = await $supabase
              .from('vibration_readings')
              .select('id, timestamp, axis, oavelocity, peak, rms')
              .eq('sensor_id', sensorId)
              .order('timestamp', { ascending: false })
              .limit(300);

            if (error) throw error;

            // Procesar datos históricos
            data.forEach(reading => {
                const ts = new Date(reading.timestamp).getTime();
                if (!readingsMap.has(ts)) {
                    readingsMap.set(ts, { id: ts, timestamp: reading.timestamp, unit: this.currentSensor.unit, x: null, y: null, z: null });
                }
                const group = readingsMap.get(ts);
                const axis = reading.axis.toLowerCase();
                if (['x', 'y', 'z'].includes(axis)) {
                    group[axis] = { id: reading.id, oavelocity: reading.oavelocity, peak: reading.peak, rms: reading.rms };
                }
            });
            
            // Asignar datos históricos ordenados
            this.currentSensorReadings = Array.from(readingsMap.values()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Subscribirse a nuevos datos
            const channel = $supabase.channel(`sensor_readings_${sensorId}`);
            channel.on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'vibration_readings', filter: `sensor_id=eq.${sensorId}`
            }, payload => {
                const newReading = payload.new;
                const ts = new Date(newReading.timestamp).getTime();
                const axis = newReading.axis.toLowerCase();
                
                let group = readingsMap.get(ts);

                if (group) { // Si el timestamp existe, actualiza el eje
                    group[axis] = { id: newReading.id, oavelocity: newReading.oavelocity, peak: newReading.peak, rms: newReading.rms };
                } else { // Si es nuevo, crea el grupo
                    group = { id: ts, timestamp: newReading.timestamp, unit: this.currentSensor.unit, x: null, y: null, z: null };
                    group[axis] = { id: newReading.id, oavelocity: newReading.oavelocity, peak: newReading.peak, rms: newReading.rms };
                    readingsMap.set(ts, group);
                }
                // Actualizar el array reactivo de forma eficiente
                this.currentSensorReadings = Array.from(readingsMap.values()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            }).subscribe();
            this.detailRealtimeSubscription = channel;

        } else { // Para otros tipos de sensores
            const { data, error } = await $supabase
              .from(tableName)
              .select('id, value, timestamp')
              .eq('sensor_id', sensorId)
              .order('timestamp', { ascending: false })
              .limit(100);

            if (error) throw error;
            
            this.currentSensorReadings = data.map(reading => ({
                id: reading.id,
                value: reading.value,
                timestamp: reading.timestamp,
                unit: this.currentSensor.unit,
                details: {}
            }));

            const channel = $supabase.channel(`sensor_readings_${sensorId}`);
            channel.on('postgres_changes', {
              event: 'INSERT', schema: 'public', table: tableName, filter: `sensor_id=eq.${sensorId}`
            }, payload => {
              const newReading = {
                  id: payload.new.id,
                  value: payload.new.value,
                  timestamp: payload.new.timestamp,
                  unit: this.currentSensor.unit,
                  details: {}
              };
              this.currentSensorReadings.unshift(newReading);
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
    
    async subscribeToGraphReadings(sensorIds) {
      const { $supabase } = useNuxtApp();
      for (const id in this.dashboardRealtimeSubscriptions) {
        if (!sensorIds.includes(id)) {
          await this.dashboardRealtimeSubscriptions[id].unsubscribe();
          delete this.dashboardRealtimeSubscriptions[id];
          delete this.allSensorRecentReadings[id];
        }
      }

      for (const sensorId of sensorIds) {
        if (!this.dashboardRealtimeSubscriptions[sensorId]) {
          const sensor = this.sensors.find(s => s.id === sensorId);
          if (!sensor) continue;

          const tableName = this._getReadingsTableName(sensor.type);
          if (!tableName) continue;
          
          try {
            const readingsMap = new Map();

            if (sensor.type === 'vibration') {
              const { data, error } = await $supabase
                .from(tableName)
                .select('timestamp, axis, oavelocity')
                .eq('sensor_id', sensorId)
                .order('timestamp', { ascending: false })
                .limit(300);

              if (error) throw error;
              
              data.forEach(reading => {
                  const ts = new Date(reading.timestamp).getTime();
                  if (!readingsMap.has(ts)) {
                      readingsMap.set(ts, { timestamp: reading.timestamp, x: null, y: null, z: null });
                  }
                  const group = readingsMap.get(ts);
                  const axis = reading.axis.toLowerCase();
                  if (['x', 'y', 'z'].includes(axis)) {
                      group[axis] = reading.oavelocity;
                  }
              });
              
              this.allSensorRecentReadings[sensorId] = Array.from(readingsMap.values());
              
              const channel = $supabase.channel(`graph_chart_readings_${sensorId}`);
              channel.on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: tableName,
                filter: `sensor_id=eq.${sensorId}`
              }, payload => {
                const newReading = payload.new;
                const ts = new Date(newReading.timestamp).getTime();
                const axis = newReading.axis.toLowerCase();
                
                let group = readingsMap.get(ts);
                if (group) {
                  group[axis] = newReading.oavelocity;
                } else {
                  group = { timestamp: newReading.timestamp, x: null, y: null, z: null };
                  group[axis] = newReading.oavelocity;
                  readingsMap.set(ts, group);
                }

                this.allSensorRecentReadings[sensorId] = Array.from(readingsMap.values());
                if (this.allSensorRecentReadings[sensorId].length > 200) {
                    // Simple shift if map gets too large, can be improved
                    const oldestKey = readingsMap.keys().next().value;
                    readingsMap.delete(oldestKey);
                }
              }).subscribe();
              this.dashboardRealtimeSubscriptions[sensorId] = channel;

            } else {
              const { data, error } = await $supabase
                .from(tableName)
                .select('value, timestamp')
                .eq('sensor_id', sensorId)
                .order('timestamp', { ascending: false })
                .limit(100);

              if (error) throw error;
              
              this.allSensorRecentReadings[sensorId] = data.map(r => ({ value: r.value, timestamp: r.timestamp }));
              
              const channel = $supabase.channel(`graph_chart_readings_${sensorId}`);
              channel.on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: tableName,
                filter: `sensor_id=eq.${sensorId}`
              }, payload => {
                const newReading = { value: payload.new.value, timestamp: payload.new.timestamp };
                if (!this.allSensorRecentReadings[sensorId]) {
                  this.allSensorRecentReadings[sensorId] = [];
                }
                this.allSensorRecentReadings[sensorId].unshift(newReading); 
                if (this.allSensorRecentReadings[sensorId].length > 200) {
                  this.allSensorRecentReadings[sensorId].pop();
                }
              }).subscribe();
              this.dashboardRealtimeSubscriptions[sensorId] = channel;
            }
          } catch (e) {
            console.error(`[Sensors Store] Error al suscribirse a lecturas de gráfico para sensor ${sensorId}:`, e);
          }
        }
      }
    },
    // =================================================================================
    // FIN DE LA MODIFICACIÓN
    // =================================================================================


    async unsubscribeFromAllGraphReadings() {
      for (const id in this.dashboardRealtimeSubscriptions) {
        await this.dashboardRealtimeSubscriptions[id].unsubscribe();
        delete this.dashboardRealtimeSubscriptions[id];
        delete this.allSensorRecentReadings[id];
      }
    },
  }
});