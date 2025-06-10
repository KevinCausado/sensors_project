// stores/sensors.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { useOrganizationStore } from './organizations';

export const useSensorStore = defineStore('sensors', {
  state: () => ({
    sensors: [],
    isLoading: false,
    error: null,
    currentSensor: null, // Para el sensor que se está viendo/editando
    currentSensorReadings: [], // Este es para la página de detalle de UN sensor

    // --- NUEVOS ESTADOS PARA EL DASHBOARD ---
    allSensorRecentReadings: {}, // { sensorId: [{value, timestamp}, ...], ... }
    dashboardRealtimeSubscriptions: {}, // Store individual subscriptions for the chart
    detailRealtimeSubscription: null,
    dashboardSensorUpdatesChannel: null, // For general sensor updates (status, etc.)
    // Add a specific channel for dashboard chart readings if you manage them separately
    dashboardChartReadingsChannel: null,
  }),

  getters: {
    filteredSensors: (state) => {
      const organizationStore = useOrganizationStore();
      if (!organizationStore.selectedOrganizationId) {
        return state.sensors;
      }
      return state.sensors.filter(sensor =>
        sensor.organizationId === organizationStore.selectedOrganizationId
      );
    },

     recentSensors: (state) => {
      const sortedSensors = [...state.filteredSensors].sort((a, b) => {
        if (!a.last_communication && !b.last_communication) return 0;
        if (!b.last_communication) return -1;
        if (!a.last_communication) return 1;
        return new Date(b.last_communication).getTime() - new Date(a.last_communication).getTime();
      });

      const latestFive = sortedSensors.slice(0, 5);

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
        // CÓDIGO CLAVE: Asegúrate de que assets_base trae name, city, state, country
        const { data, error } = await $supabase
          .from('sensors')
          .select(`
            *,
            organizations(name),           
            assets_base(name, city, state, country)  -- <<< ESTO ES LO CRÍTICO >>>
          `);

        if (error) throw error;

        this.sensors = data.map(sensor => ({
          id: sensor.id,
          name: sensor.name,
          serial_number: sensor.serial_number,
          model: sensor.model,
          location_description: sensor.location_description,
          status: sensor.status,
          organizationId: sensor.organization_id,
          organizationName: sensor.organizations ? sensor.organizations.name : 'N/A',
          assetId: sensor.asset_id,
          assetName: sensor.assets_base ? sensor.assets_base.name : 'N/A', 
          // Mapeo de los campos de ubicación del activo
          assetCity: sensor.assets_base ? sensor.assets_base.city : 'N/A',
          assetState: sensor.assets_base ? sensor.assets_base.state : 'N/A',
          assetCountry: sensor.assets_base ? sensor.assets_base.country : 'N/A',
          last_communication: sensor.last_communication,
          battery_level: sensor.battery_level,
          signal_strength: sensor.signal_strength,
          thresholds: sensor.thresholds,
          type: sensor.type,
          unit: sensor.unit, 
          // Campos 'city', 'state', 'country' directamente en el sensor.
          // Si ya eliminaste estas columnas de la tabla 'sensors' en tu DB,
          // estas propiedades siempre serán null/undefined. Puedes eliminarlas del mapeo si lo deseas.
          city: sensor.city, 
          state: sensor.state, 
          country: sensor.country,
          last_value : sensor.last_value,           
          last_unit: sensor.last_unit,
          last_reading_timestamp : sensor.last_reading_timestamp
        }));
        console.log('Fetched sensors (with asset/org names and asset location):', this.sensors);
      } catch (e) {
        this.error = 'Failed to fetch sensors: ' + e.message;
        console.error('Error fetching sensors:', e);
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
            // CÓDIGO CLAVE: Asegúrate de que assets_base trae name, city, state, country
            const { data, error } = await $supabase
                .from('sensors')
                .select('*, organizations(name), assets_base(name, city, state, country)') // <<< ESTO ES LO CRÍTICO >>>
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) {
                this.error = `Sensor con ID ${id} no encontrado.`;
                return null;
            }

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
                assetName: data.assets_base ? data.assets_base.name : 'N/A',
                // Mapeo de los campos de ubicación del activo
                assetCity: data.assets_base ? data.assets_base.city : 'N/A',
                assetState: data.assets_base ? data.assets_base.state : 'N/A',
                assetCountry: data.assets_base ? data.assets_base.country : 'N/A',
                last_communication: data.last_communication,
                battery_level: data.battery_level,
                signal_strength: data.signal_strength,
                thresholds: data.thresholds,
                // Campos 'city', 'state', 'country' directamente en el sensor.
                // Si ya eliminaste estas columnas de la tabla 'sensors' en tu DB,
                // estas propiedades siempre serán null/undefined. Puedes eliminarlas del mapeo si lo deseas.
                city: data.city, 
               state: data.state,
               country: data.country,
               last_value : data.last_value,           
               last_unit: data.last_unit,
               last_reading_timestamp : data.last_reading_timestamp
            };
            this.currentSensor = mappedSensor;
            console.log('Fetched single sensor with asset and organization name and asset location:', this.currentSensor);
            return mappedSensor;
        } catch (e) {
            this.error = 'Failed to fetch sensor: ' + e.message;
            console.error('Error fetching single sensor:', e);
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
        // Si ya moviste city, state, country de la tabla sensors a assets_base,
        // asegúrate de que NO se envíen en sensorData aquí.
        // Si la tabla 'sensors' no tiene estas columnas, Supabase las ignorará.
        
        const { data, error } = await useNuxtApp().$supabase
          .from('sensors')
          .insert([dataToSend])
          .select();
        if (error) throw error;

        await this.fetchSensors(); 
        return data[0];
      } catch (e) {
        this.error = 'Failed to create sensor: ' + e.message;
        console.error('Error creating sensor:', e);
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
        // Igual que en createSensor: asegúrate de que NO se envíen
        // si ya moviste estos campos de la tabla 'sensors'.
        
        const { data, error } = await useNuxtApp().$supabase
          .from('sensors')
          .update(dataToSend)
          .eq('id', id)
          .select();
        if (error) throw error;

        await this.fetchSensors();
        if (this.currentSensor && this.currentSensor.id === id) {
          await this.fetchSensor(id); 
        }
        return data[0];
      } catch (e) {
        this.error = 'Failed to update sensor: ' + e.message;
        console.error('Error updating sensor:', e);
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

        this.sensors = this.sensors.filter(s => s.id !== id);
        if (this.currentSensor && this.currentSensor.id === id) {
          this.currentSensor = null;
        }
      } catch (e) {
        this.error = 'Failed to delete sensor: ' + e.message;
        console.error('Error deleting sensor:', e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

     async subscribeToSensorUpdates() {
      if (this.dashboardSensorUpdatesChannel) {
        return;
      }
      try {
        const { $supabase } = useNuxtApp();
        const channel = $supabase
          .channel('public:sensors_general_updates')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, (payload) => {
            console.log('[Sensors Store] Cambio general en tabla de sensores:', payload);
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
        console.log('Desuscrito de cambios generales en la tabla de sensores.');
      }
    },

    async subscribeToDashboardReadings(sensorIds) {
      const { $supabase } = useNuxtApp();

      for (const id in this.dashboardRealtimeSubscriptions) {
        if (!sensorIds.includes(id)) {
          await this.dashboardRealtimeSubscriptions[id].unsubscribe();
          delete this.dashboardRealtimeSubscriptions[id];
          console.log(`Unsubscribed from sensor readings for sensor ${id}`);
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

            if (error) throw error;

            this.allSensorRecentReadings[sensorId] = data.reverse(); 

            const channel = $supabase.channel(`dashboard_chart_readings_${sensorId}`);
            channel.on('postgres_changes', {
              event: 'INSERT', 
              schema: 'public',
              table: 'sensor_readings',
              filter: `sensor_id=eq.${sensorId}`
            }, payload => {
              console.log(`New reading for chart sensor ${sensorId}:`, payload.new);
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
            console.log(`Subscribed to real-time chart readings for sensor ${sensorId}.`);
          } catch (e) {
            console.error(`Error subscribing to chart readings for sensor ${sensorId}:`, e);
          }
        }
      }
    },

    async unsubscribeFromAllDashboardReadings() {
      for (const id in this.dashboardRealtimeSubscriptions) {
        await this.dashboardRealtimeSubscriptions[id].unsubscribe();
        delete this.dashboardRealtimeSubscriptions[id];
      }
      console.log('Unsubscribed from all dashboard chart readings.');

      if (this.dashboardSensorUpdatesChannel) {
        await this.dashboardSensorUpdatesChannel.unsubscribe();
        this.dashboardSensorUpdatesChannel = null;
        console.log('Unsubscribed from general dashboard sensor updates.');
      }
    },

    async subscribeToDashboardRecentReadings() {
      if (this.dashboardSensorUpdatesChannel) { 
        await this.dashboardSensorUpdatesChannel.unsubscribe();
        this.dashboardSensorUpdatesChannel = null;
      }

      const { $supabase } = useNuxtApp();
      try {
        const channel = $supabase.channel('dashboard_sensor_readings_changes');
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, payload => {
          console.log('Cambio en lecturas de sensor para dashboard (recent):', payload);
          const sensorId = payload.new.sensor_id;
          const newReading = {
            value: payload.new.value,
            timestamp: payload.new.timestamp,
            unit: payload.new.unit
          };

          if (!this.allSensorRecentReadings[sensorId]) {
            this.allSensorRecentReadings[sensorId] = [];
          }
          this.allSensorRecentReadings[sensorId].unshift(newReading);
          this.allSensorRecentReadings[sensorId] = this.allSensorRecentReadings[sensorId].slice(0, 1);
        }).subscribe();
        this.dashboardSensorUpdatesChannel = channel;
        console.log('Suscrito a actualizaciones de lecturas recientes para el dashboard (StatCard).');
      } catch (e) {
        console.error('Error al suscribirse a actualizaciones de lecturas recientes para el dashboard:', e);
      }
    },

    async unsubscribeFromDashboardRecentReadings() {
      if (this.dashboardSensorUpdatesChannel) {
        await this.dashboardSensorUpdatesChannel.unsubscribe();
        this.dashboardSensorUpdatesChannel = null;
        console.log('Desuscrito de actualizaciones de lecturas recientes para el dashboard (StatCard).');
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

        if (error) throw error;
        this.currentSensorReadings = data;
        console.log(`Lecturas iniciales para sensor ${sensorId}:`, this.currentSensorReadings);

        const channel = $supabase.channel(`sensor_readings_${sensorId}`);
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sensor_readings',
          filter: `sensor_id=eq.${sensorId}`
        }, payload => {
          console.log(`Cambio en lecturas de sensor ${sensorId}:`, payload);
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
        console.log(`Suscrito a lecturas en tiempo real para sensor ${sensorId}.`);
      } catch (e) {
        this.error = 'Failed to fetch or subscribe to detail readings: ' + e.message;
        console.error('Error fetching/subscribing to detail readings:', e);
      } finally {
        this.isLoading = false;
      }
    },

    async unsubscribeFromDetailReadings() {
      if (this.detailRealtimeSubscription) {
        await this.detailRealtimeSubscription.unsubscribe();
        this.detailRealtimeSubscription = null;
        console.log('Desuscrito de lecturas de detalle.');
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
            if (error) throw error;

            this.currentSensorReadings = data;
            console.log('Fetched sensor readings:', this.currentSensorReadings);
        } catch (e) {
            this.error = 'Failed to fetch readings: ' + e.message;
            console.error('Error fetching readings:', e);
        } finally {
            this.isLoading = false;
        }
    },
  }
});
