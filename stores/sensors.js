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
    detailRealtimeSubscription: null,
    dashboardSensorUpdatesChannel: null, 
    dashboardChartReadingsChannel: null,
  }),

  getters: {
    filteredSensors: (state) => {
      const organizationStore = useOrganizationStore();
      const assetStore = useAssetStore(); 
      let filtered = state.sensors;

      console.log('[Sensor Store] filteredSensors - Dependencias:');
      console.log(`  - organizationStore.selectedOrganizationId: ${organizationStore.selectedOrganizationId}`);
      console.log(`  - assetStore.assets.length (dentro de SensorStore getter): ${assetStore.assets.length}`);

      if (organizationStore.selectedOrganizationId) {
        filtered = filtered.filter(sensor =>
          // ¡CORRECCIÓN CRÍTICA AQUÍ! Cambiado de sensor.organization_id a sensor.organizationId
          sensor.organizationId === organizationStore.selectedOrganizationId 
        );
      }

      const enrichedSensors = filtered.map(sensor => {
        let assetName = 'N/A';
        if (assetStore.assets.length > 0 && sensor.assetId) { 
          const asset = assetStore.assets.find(a => a.id === sensor.assetId);
          assetName = asset ? asset.name : 'Activo Desconocido';
          if (!asset) {
              console.warn(`  - [Sensor Store] filteredSensors: Activo con ID ${sensor.assetId} NO ENCONTRADO para el sensor ${sensor.name}.`);
          }
        } else if (sensor.assetId && assetStore.assets.length === 0) {
            console.log(`  - [Sensor Store] filteredSensors: assetStore.assets está vacío, no se puede mapear assetName para sensor ${sensor.name}.`);
        }
        
        return {
          ...sensor,
          assetName: assetName, 
        };
      });
      console.log('[Sensor Store] filteredSensors - Sensores enriquecidos (primeros 5):', enrichedSensors.slice(0,5));
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
  },

  actions: {
    async fetchSensors() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('sensors')
          .select(`
            *,
            organizations(name),           
            assets_base(name, city, state, country)
          `);

        if (error) {
            console.error('[Sensor Store] Supabase error fetching sensors:', error);
            throw error;
        }

        this.sensors = data.map(sensor => ({
          id: sensor.id,
          name: sensor.name,
          serial_number: sensor.serial_number,
          model: sensor.model,
          location_description: sensor.location_description,
          status: sensor.status,
          organizationId: sensor.organization_id, // Esto es correcto: mapea el snake_case de DB a camelCase en el store
          organizationName: sensor.organizations ? sensor.organizations.name : 'N/A',
          assetId: sensor.asset_id, 
          assetName: sensor.assets_base ? sensor.assets_base.name : 'N/A', 
          assetCity: sensor.assets_base ? sensor.assets_base.city : 'N/A',
          assetState: sensor.assets_base ? sensor.assets_base.state : 'N/A',
          assetCountry: sensor.assets_base ? sensor.assets_base.country : 'N/A',
          last_communication: sensor.last_communication,
          battery_level: sensor.battery_level,
          signal_strength: sensor.signal_strength,
          thresholds: sensor.thresholds,
          type: sensor.type,
          unit: sensor.unit, 
          city: sensor.city, 
          state: sensor.state, 
          country: sensor.country,
          last_value : sensor.last_value,           
          last_unit: sensor.last_unit,
          last_reading_timestamp : sensor.last_reading_timestamp,
          created_at : sensor.created_at,
        }));
        console.log('[Sensor Store] fetchSensors - FINALMENTE CARGADOS Y MAPEADOS:', this.sensors);
      } catch (e) {
        this.error = 'Failed to fetch sensors: ' + e.message;
        console.error('[Sensor Store] Error fetching sensors:', e);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSensor(id) {
        this.isLoading = true;
        this.error = null;
        this.currentSensor = null;

        try {
            const { $supabase } = useNuxtApp();
            // --- DEPURACIÓN: Log para ver la llamada a Supabase ---
            console.log(`[Sensor Store] fetchSensor: Intentando cargar sensor con ID: ${id}`);
            const { data, error } = await $supabase
                .from('sensors')
                .select('*, organizations(name), assets_base(name, city, state, country)')
                .eq('id', id)
                .single();

            if (error) {
                console.error('[Sensor Store] Supabase error fetching single sensor:', error);
                throw error;
            }
            if (!data) {
                this.error = `Sensor con ID ${id} no encontrado.`;
                console.warn(`[Sensor Store] Sensor con ID ${id} no encontrado en la respuesta de Supabase.`);
                return null;
            }

            // --- DEPURACIÓN: Log para ver los datos brutos de Supabase ---
            console.log('[Sensor Store] fetchSensor: Datos brutos de Supabase para el sensor:', data);


            const mappedSensor = {
                id: data.id,
                name: data.name,
                serial_number: data.serial_number,
                model: data.model,
                location_description: data.location_description,
                status: data.status,
                type: data.type,
                unit: data.unit,
                organizationId: data.organization_id,
                organizationName: data.organizations ? data.organizations.name : 'N/A',
                assetId: data.asset_id,
                // --- CRÍTICO: Asegurarse de que data.assets_base existe antes de acceder a .name ---
                assetName: data.assets_base ? data.assets_base.name : 'N/A',
                assetCity: data.assets_base ? data.assets_base.city : 'N/A',
                assetState: data.assets_base ? data.assets_base.state : 'N/A',
                assetCountry: data.assets_base ? data.assets_base.country : 'N/A',
                last_communication: data.last_communication,
                battery_level: data.battery_level,
                signal_strength: data.signal_strength,
                thresholds: data.thresholds,
                city: data.city, 
                state: data.state,
                country: data.country,
                last_value : data.last_value,           
                last_unit: data.last_unit,
                last_reading_timestamp : data.last_reading_timestamp,
                created_at: data.created_at
            };
            this.currentSensor = mappedSensor;
            // --- DEPURACIÓN: Log para ver el objeto mapeado final ---
            console.log('[Sensor Store] fetchSensor: Objeto currentSensor mapeado:', this.currentSensor);
            return mappedSensor;
        } catch (e) {
            this.error = 'Failed to fetch sensor: ' + e.message;
            console.error('[Sensor Store] Error fetching single sensor:', e);
            return null;
        } finally {
            this.isLoading = false;
        }
    },

    async createSensor(sensorData) {
      this.isLoading = true;
      this.error = null;
      try {
        const dataToSend = {
          ...sensorData,
          organization_id: sensorData.organizationId,
          asset_id: sensorData.asset_id, 
        };
        delete dataToSend.organizationId;
        
        const { data, error } = await useNuxtApp().$supabase
          .from('sensors')
          .insert([dataToSend])
          .select();
        if (error) {
            console.error('[Sensor Store] Supabase error creating sensor:', error);
            throw error;
        }
        await this.fetchSensors(); 
        console.log('[Sensor Store] Sensor creado:', data[0]);
        return data[0];
      } catch (e) {
        this.error = 'Failed to create sensor: ' + e.message;
        console.error('[Sensor Store] Error creating sensor:', e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    async updateSensor(id, sensorData) {
      this.isLoading = true;
      this.error = null;
      try {
        const dataToSend = {
          ...sensorData,
          organization_id: sensorData.organizationId,
          asset_id: sensorData.asset_id, 
        };
        delete dataToSend.organizationId;
        
        const { data, error } = await useNuxtApp().$supabase
          .from('sensors')
          .update(dataToSend)
          .eq('id', id)
          .select();
        if (error) {
            console.error('[Sensor Store] Supabase error updating sensor:', error);
            throw error;
        }
        await this.fetchSensors();
        if (this.currentSensor && this.currentSensor.id === id) {
          await this.fetchSensor(id); 
        }
        console.log(`[Sensor Store] Sensor actualizado ID: ${id}`, data[0]);
        return data[0];
      } catch (e) {
        this.error = 'Failed to update sensor: ' + e.message;
        console.error('[Sensor Store] Error updating sensor:', e);
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
        if (error) {
            console.error('[Sensor Store] Supabase error deleting sensor:', error);
            throw error;
        }
        this.sensors = this.sensors.filter(s => s.id !== id);
        if (this.currentSensor && this.currentSensor.id === id) {
          this.currentSensor = null;
        }
        console.log(`[Sensor Store] Sensor eliminado ID: ${id}`);
      } catch (e) {
        this.error = 'Failed to delete sensor: ' + e.message;
        console.error('[Sensor Store] Error deleting sensor:', e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

     async subscribeToSensorUpdates() {
      if (this.dashboardSensorUpdatesChannel) {
        console.log('[Sensors Store] Ya suscrito a cambios generales de sensores.');
        return;
      }
      try {
        const { $supabase } = useNuxtApp();
        const channel = $supabase
          .channel('public:sensors_general_updates')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, (payload) => {
            console.log('[Sensors Store] Cambio general en tabla de sensores (Realtime):', payload);
            this.fetchSensors(); 
          })
          .subscribe();
        this.dashboardSensorUpdatesChannel = channel;
        console.log('[Sensors Store] Suscrito a cambios generales en la tabla de sensores.');
      } catch (e) {
        console.error('[Sensors Store] Error al suscribirse a cambios generales de sensores:', e);
      }
    },

    async unsubscribeFromSensorUpdates() {
      if (this.dashboardSensorUpdatesChannel) {
        await this.dashboardSensorUpdatesChannel.unsubscribe();
        this.dashboardSensorUpdatesChannel = null;
        console.log('[Sensors Store] Desuscrito de cambios generales en la tabla de sensores.');
      }
    },

    async subscribeToDashboardReadings(sensorIds) {
      const { $supabase } = useNuxtApp();
      console.log('[Sensors Store] subscribeToDashboardReadings llamado con IDs:', sensorIds);

      for (const id in this.dashboardRealtimeSubscriptions) {
        if (!sensorIds.includes(id)) {
          await this.dashboardRealtimeSubscriptions[id].unsubscribe();
          delete this.dashboardRealtimeSubscriptions[id];
          console.log(`[Sensors Store] Desuscrito de lecturas de sensor para sensor ${id} (ya no seleccionado).`);
        }
      }

      for (const sensorId of sensorIds) {
        if (!this.dashboardRealtimeSubscriptions[sensorId]) {
          try {
            const { data, error } = await $supabase
                .from('sensor_readings')
                .select('value, timestamp, unit')
                .eq('sensor_id', sensorId)
                .order('timestamp', { ascending: false })
                .limit(50); 

            if (error) {
                console.error(`[Sensors Store] Error al cargar lecturas históricas para sensor ${sensorId}:`, error);
                throw error;
            }

            this.allSensorRecentReadings[sensorId] = data.reverse(); 

            const channel = $supabase.channel(`dashboard_chart_readings_${sensorId}`);
            channel.on('postgres_changes', {
              event: 'INSERT', 
              schema: 'public',
              table: 'sensor_readings',
              filter: `sensor_id=eq.${sensorId}`
            }, payload => {
              console.log(`[Sensors Store] Nueva lectura en tiempo real para sensor ${sensorId}:`, payload.new);
              const newReading = {
                value: payload.new.value,
                timestamp: payload.new.timestamp,
                unit: payload.new.unit,
              };
              if (!this.allSensorRecentReadings[sensorId]) {
                this.allSensorRecentReadings[sensorId] = [];
              }
              this.allSensorRecentReadings[sensorId].push(newReading); 
            }).subscribe();

            this.dashboardRealtimeSubscriptions[sensorId] = channel;
            console.log(`[Sensors Store] Suscrito a lecturas en tiempo real para gráfico del sensor ${sensorId}.`);
          } catch (e) {
            console.error(`[Sensors Store] Error al suscribirse a lecturas de gráfico para sensor ${sensorId}:`, e);
          }
        }
      }
    },

    async unsubscribeFromAllDashboardReadings() {
      for (const id in this.dashboardRealtimeSubscriptions) {
        await this.dashboardRealtimeSubscriptions[id].unsubscribe();
        delete this.dashboardRealtimeSubscriptions[id];
      }
      console.log('[Sensors Store] Desuscrito de todas las lecturas de gráfico del dashboard.');

      if (this.dashboardChartReadingsChannel) {
        await this.dashboardChartReadingsChannel.unsubscribe();
        this.dashboardChartReadingsChannel = null;
        console.log('[Sensors Store] Desuscrito del canal de lecturas de gráfico del dashboard.');
      }
    },

    async subscribeToDashboardRecentReadings() {
      if (this.dashboardSensorUpdatesChannel) { 
        console.log('[Sensors Store] Ya suscrito a dashboardSensorUpdatesChannel.');
        return; 
      }

      const { $supabase } = useNuxtApp();
      try {
        const channel = $supabase.channel('dashboard_sensor_readings_changes');
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, payload => {
          console.log('[Sensors Store] Cambio en lecturas de sensor para dashboard (recent):', payload);
          const sensorId = payload.new.sensor_id;
          const newReading = {
            value: payload.new.value,
            timestamp: payload.new.timestamp,
            unit: payload.new.unit
          };

          this.allSensorRecentReadings[sensorId] = [newReading]; 

          this.fetchSensors(); 

        }).subscribe();
        this.dashboardSensorUpdatesChannel = channel; 
        console.log('[Sensors Store] Suscrito a actualizaciones de lecturas recientes para el dashboard (StatCard).');
      } catch (e) {
        console.error('[Sensors Store] Error al suscribirse a actualizaciones de lecturas recientes para el dashboard:', e);
      }
    },

    async unsubscribeFromDashboardRecentReadings() {
      if (this.dashboardSensorUpdatesChannel) {
        await this.dashboardSensorUpdatesChannel.unsubscribe();
        this.dashboardSensorUpdatesChannel = null;
        console.log('[Sensors Store] Desuscrito de actualizaciones de lecturas recientes para el dashboard (StatCard).');
      }
    },

    async fetchAndSubscribeToDetailReadings(sensorId) {
      if (this.detailRealtimeSubscription) {
        await this.detailRealtimeSubscription.unsubscribe();
        this.detailRealtimeSubscription = null;
      }

      this.isLoading = true;
      this.error = null;
      this.currentSensorReadings = [];
      const { $supabase } = useNuxtApp();
      try {
        const { data, error } = await $supabase
          .from('sensor_readings')
          .select('id, sensor_id, value, timestamp, unit')
          .eq('sensor_id', sensorId)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (error) {
            console.error(`[Sensors Store] Supabase error fetching detail readings for sensor ${sensorId}:`, error);
            throw error;
        }
        this.currentSensorReadings = data;
        console.log(`[Sensors Store] Lecturas iniciales para sensor ${sensorId}:`, this.currentSensorReadings);

        const channel = $supabase.channel(`sensor_readings_${sensorId}`);
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sensor_readings',
          filter: `sensor_id=eq.${sensorId}`
        }, payload => {
          console.log(`[Sensors Store] Cambio en lecturas de sensor ${sensorId} (Realtime):`, payload);
          if (payload.eventType === 'INSERT') {
            this.currentSensorReadings.unshift(payload.new);
          } else if (payload.eventType === 'UPDATE') {
            const index = this.currentSensorReadings.findIndex(r => r.id === payload.old.id);
            if (index !== -1) {
              this.currentSensorReadings[index] = payload.new;
            }
          } else if (payload.eventType === 'DELETE') {
            this.currentSensorReadings = this.currentSensorReadings.filter(r => r.id !== payload.old.id);
          }
        }).subscribe();
        this.detailRealtimeSubscription = channel;
        console.log(`[Sensors Store] Suscrito a lecturas en tiempo real para sensor ${sensorId}.`);
      } catch (e) {
        this.error = 'Failed to fetch or subscribe to detail readings: ' + e.message;
        console.error('[Sensors Store] Error fetching/subscribing to detail readings:', e);
      } finally {
        this.isLoading = false;
      }
    },

    async unsubscribeFromDetailReadings() {
      if (this.detailRealtimeSubscription) {
        await this.detailRealtimeSubscription.unsubscribe();
        this.detailRealtimeSubscription = null;
        console.log('[Sensors Store] Desuscrito de lecturas de detalle.');
      }
    },

    async fetchReadings(sensorId, limit = 50) {
        this.isLoading = true;
        this.error = null;
        try {
            const { data, error } = await useNuxtApp().$supabase
                .from('sensor_readings')
                .select('id, sensor_id, value, timestamp, unit')
                .eq('sensor_id', sensorId)
                .order('timestamp', { ascending: false })
                .limit(limit);
            if (error) {
                console.error(`[Sensors Store] Supabase error fetching readings for sensor ${sensorId}:`, error);
                throw error;
            }
            this.currentSensorReadings = data;
            console.log('[Sensors Store] Fetched sensor readings (historial):', this.currentSensorReadings);
        } catch (e) {
            this.error = 'Failed to fetch readings: ' + e.message;
            console.error('[Sensors Store] Error fetching readings:', e);
        } finally {
            this.isLoading = false;
        }
    },
  }
});
