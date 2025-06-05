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
        if (!a.last_communication) return 1;
        if (!b.last_communication) return -1;
        return new Date(b.last_communication).getTime() - new Date(a.last_communication).getTime();
      });
      const latestFive = sortedSensors.slice(0, 5);
      return latestFive.map(sensor => ({
        ...sensor,
        // Ensure lastReading is structured correctly for the UI
        value: state.allSensorRecentReadings[sensor.id]?.[0]?.value || null, // Access value directly
        unit: state.allSensorRecentReadings[sensor.id]?.[0]?.unit || null,   // Access unit directly
        lastReading: state.allSensorRecentReadings[sensor.id]?.[0]?.timestamp || null, // Access timestamp for formatting
      }));
    },
  },

  actions: {
    async fetchSensors() {
      this.isLoading = true;
      this.error = null;
      try {
        const { data, error } = await useNuxtApp().$supabase
          .from('sensors')
          .select('*');

        if (error) throw error;
        this.sensors = data.map(sensor => ({
          id: sensor.id,
          name: sensor.name,
          serial_number: sensor.serial_number,
          model: sensor.model,
          location_description: sensor.location_description,
          status: sensor.status,
          organizationId: sensor.organization_id,
          last_communication: sensor.last_communication,
          battery_level: sensor.battery_level,
          signal_strength: sensor.signal_strength,
          thresholds: sensor.thresholds,
          type: sensor.type, // Make sure type is mapped
          unit: sensor.unit, // Make sure unit is mapped
        }));
        console.log('Fetched sensors:', this.sensors);
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
            const { data, error } = await useNuxtApp().$supabase
                .from('sensors')
                .select('*, organizations(name)')
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
                last_communication: data.last_communication,
                battery_level: data.battery_level,
                signal_strength: data.signal_strength,
                thresholds: data.thresholds,
            };
            this.currentSensor = mappedSensor;
            console.log('Fetched single sensor with organization name:', this.currentSensor);
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
        };
        delete dataToSend.organizationId;

        const { data, error } = await useNuxtApp().$supabase
          .from('sensors')
          .insert([dataToSend])
          .select();
        if (error) throw error;

        const newSensor = {
          id: data[0].id,
          name: data[0].name,
          serial_number: data[0].serial_number,
          model: data[0].model,
          location_description: data[0].location_description,
          status: data[0].status,
          organizationId: data[0].organization_id,
          last_communication: data[0].last_communication,
          battery_level: data[0].battery_level,
          signal_strength: data[0].signal_strength,
          thresholds: data[0].thresholds,
          type: data[0].type, // Ensure type is mapped
          unit: data[0].unit, // Ensure unit is mapped
        };
        this.sensors.push(newSensor);
        return newSensor;
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
        };
        delete dataToSend.organizationId;

        const { data, error } = await useNuxtApp().$supabase
          .from('sensors')
          .update(dataToSend)
          .eq('id', id)
          .select();
        if (error) throw error;

        const index = this.sensors.findIndex(s => s.id === id);
        if (index !== -1) {
          const updatedSensor = {
            id: data[0].id,
            name: data[0].name,
            serial_number: data[0].serial_number,
            model: data[0].model,
            location_description: data[0].location_description,
            status: data[0].status,
            organizationId: data[0].organization_id,
            last_communication: data[0].last_communication,
            battery_level: data[0].battery_level,
            signal_strength: data[0].signal_strength,
            thresholds: data[0].thresholds,
            type: data[0].type, // Ensure type is mapped
            unit: data[0].unit, // Ensure unit is mapped
          };
          this.sensors[index] = updatedSensor;
          this.currentSensor = updatedSensor;
          return updatedSensor;
        }
        return null;
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
        // Ya suscrito, no hacer nada o desuscribirse y volver a suscribir si se desea forzar
        return;
      }
      try {
        const { $supabase } = useNuxtApp();
        const channel = $supabase
          .channel('public:sensors_general_updates') // Nombre del canal para actualizaciones generales de sensores
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, (payload) => {
            console.log('[Sensors Store] Cambio general en tabla de sensores:', payload);
            // Aquí puedes añadir lógica para actualizar el estado 'sensors'
            // dependiendo del tipo de evento (INSERT, UPDATE, DELETE)
            if (payload.eventType === 'INSERT') {
              this.sensors.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const index = this.sensors.findIndex(s => s.id === payload.old.id);
              if (index !== -1) {
                this.sensors[index] = payload.new;
              }
            } else if (payload.eventType === 'DELETE') {
              this.sensors = this.sensors.filter(s => s.id !== payload.old.id);
            }
            // También puedes re-calcular los totales o tendencias aquí si es necesario
            this.fetchAllSensors(); // Opcional: Re-fetch completo para asegurar consistencia
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

    // Action to subscribe to real-time readings for the dashboard chart for MULTIPLE sensors
    async subscribeToDashboardReadings(sensorIds) {
      const { $supabase } = useNuxtApp();

      // Unsubscribe from any previously selected sensor readings
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
            // Fetch initial recent readings for the chart if not already present
            // This is crucial for the chart to display historical data
            const { data, error } = await $supabase
                .from('sensor_readings')
                .select('value, timestamp, unit')
                .eq('sensor_id', sensorId)
                .order('timestamp', { ascending: false })
                .limit(50); // Get recent 50 readings for chart initialization

            if (error) throw error;

            this.allSensorRecentReadings[sensorId] = data.reverse(); // Store in ascending order for chart

            const channel = $supabase.channel(`dashboard_chart_readings_${sensorId}`);
            channel.on('postgres_changes', {
              event: 'INSERT', // Only listen for new inserts for real-time chart updates
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
              this.allSensorRecentReadings[sensorId].push(newReading); // Add new reading to the end
              // You might want to prune old readings here to keep the array size manageable
              // this.allSensorRecentReadings[sensorId] = this.allSensorRecentReadings[sensorId].slice(-50);
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
      // Unsubscribe from all individual sensor chart subscriptions
      for (const id in this.dashboardRealtimeSubscriptions) {
        await this.dashboardRealtimeSubscriptions[id].unsubscribe();
        delete this.dashboardRealtimeSubscriptions[id];
      }
      console.log('Unsubscribed from all dashboard chart readings.');

      // Also unsubscribe from the general dashboard sensor updates channel if it exists
      if (this.dashboardSensorUpdatesChannel) {
        await this.dashboardSensorUpdatesChannel.unsubscribe();
        this.dashboardSensorUpdatesChannel = null;
        console.log('Unsubscribed from general dashboard sensor updates.');
      }
    },


    // This action is for the StatCard's "last reading" display, not the chart
    async subscribeToDashboardRecentReadings() {
      if (this.dashboardSensorUpdatesChannel) { // This channel name might be confusing, consider renaming
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

    // This action is for the StatCard's "last reading" display, not the chart
    async unsubscribeFromDashboardRecentReadings() {
      if (this.dashboardSensorUpdatesChannel) {
        await this.dashboardSensorUpdatesChannel.unsubscribe();
        this.dashboardSensorUpdatesChannel = null;
        console.log('Desuscrito de actualizaciones de lecturas recientes para el dashboard (StatCard).');
      }
    },


    // For the sensor detail page: Subscribe to all readings of ONE sensor
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