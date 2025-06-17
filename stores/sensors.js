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

    // Almacena las lecturas recientes para todos los sensores del dashboard/gráficas, por ID de sensor
    // { sensorId1: [{value, timestamp, unit}, ...], sensorId2: [...] }
    allSensorRecentReadings: {}, 

    // Suscripciones en tiempo real para las gráficas del dashboard/activo (por sensorId)
    dashboardRealtimeSubscriptions: {}, 
    
    // Canales generales que no son específicos de un sensor para el gráfico
    // Se usa dashboardSensorUpdatesChannel para la suscripción general a la tabla 'sensors'
    dashboardSensorUpdatesChannel: null, 
    dashboardChartReadingsChannel: null, // Este parece no usarse activamente para el chart, se usa por sensorId
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

      const latestFive = sorted.slice(0, 5); // O el número que desees mostrar

      return latestFive.map(sensor => ({
        ...sensor,
        value: sensor.last_value || null, // Asegúrate de que mapea 'last_value'
        unit: sensor.last_unit || null,   // Asegúrate de que mapea 'last_unit'
        lastReading: sensor.last_reading_timestamp || null, // Asegúrate de que mapea 'last_reading_timestamp'
      }));
    },

    // Nuevo getter para obtener lecturas en tiempo real por ID de sensor para la gráfica
    getReadingsBySensorId: (state) => (sensorId) => {
      return state.allSensorRecentReadings[sensorId] || [];
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
          organizationId: sensor.organization_id, 
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

   // Esta es la función que necesita la modificación para el dashboard
   async subscribeToSensorUpdates() {
      // El nombre del canal es 'dashboardSensorUpdatesChannel' en tu estado
      if (this.dashboardSensorUpdatesChannel) {
        console.log('[Sensors Store] Ya suscrito a cambios generales de la tabla de sensores.');
        return;
      }

      try {
        const { $supabase } = useNuxtApp();
        // Usar el nombre de canal que ya tenías para esta suscripción
        const channel = $supabase
          .channel('public:sensors_table_updates_dashboard') 
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, (payload) => {
            console.log('[Sensors Store] Cambio detectado en la tabla "sensors" para Dashboard (Realtime):', payload);

            const updatedSensorRaw = payload.new;

            // Encontrar el índice del sensor en el array 'this.sensors'
            const index = this.sensors.findIndex(s => s.id === updatedSensorRaw.id);

            // Crear un objeto con las propiedades actualizadas.
            // Es CRÍTICO preservar las propiedades ya enriquecidas (como assetName, organizationName)
            // si no vienen directamente en payload.new, o se volverán 'N/A'.
            let updatedSensorForStore;

            if (index !== -1) {
              // Si el sensor existe, crea un nuevo objeto fusionando el existente con los datos nuevos
              updatedSensorForStore = {
                ...this.sensors[index], // Preserva propiedades enriquecidas existentes
                last_value: updatedSensorRaw.last_value,
                last_unit: updatedSensorRaw.last_unit,
                last_reading_timestamp: updatedSensorRaw.last_reading_timestamp,
                status: updatedSensorRaw.status,
                last_communication: updatedSensorRaw.last_communication,
                battery_level: updatedSensorRaw.battery_level,
                signal_strength: updatedSensorRaw.signal_strength,
                // Puedes añadir más propiedades aquí si se actualizan en la tabla `sensors`
              };
              // Reemplazar el objeto en el array para asegurar que Vue detecte el cambio de forma reactiva
              this.sensors.splice(index, 1, updatedSensorForStore);
              console.log(`[Sensors Store] Sensor (ID: ${updatedSensorRaw.id}) actualizado en el array 'sensors' con splice para Dashboard.`);
            } else {
              // Si el sensor es nuevo o no está en el array actual (ej. un sensor recién creado),
              // se añade. Sus propiedades enriquecidas (assetName, organizationName)
              // serán 'N/A' a menos que fetchSensors() se llame después,
              // o que se hagan lookups aquí mismo (lo cual añade complejidad).
              console.warn(`[Sensors Store] Nuevo sensor (ID: ${updatedSensorRaw.id}) no encontrado en el array 'sensors'. Añadiéndolo, pero sin datos enriquecidos inmediatos.`);
              updatedSensorForStore = {
                id: updatedSensorRaw.id,
                name: updatedSensorRaw.name,
                serial_number: updatedSensorRaw.serial_number,
                model: updatedSensorRaw.model,
                location_description: updatedSensorRaw.location_description,
                status: updatedSensorRaw.status,
                organizationId: updatedSensorRaw.organization_id,
                assetId: updatedSensorRaw.asset_id,
                last_communication: updatedSensorRaw.last_communication,
                battery_level: updatedSensorRaw.battery_level,
                signal_strength: updatedSensorRaw.signal_strength,
                thresholds: updatedSensorRaw.thresholds,
                type: updatedSensorRaw.type,
                unit: updatedSensorRaw.unit,
                city: updatedSensorRaw.city,
                state: updatedSensorRaw.state,
                country: updatedSensorRaw.country,
                last_value : updatedSensorRaw.last_value,
                last_unit: updatedSensorRaw.last_unit,
                last_reading_timestamp : updatedSensorRaw.last_reading_timestamp,
                created_at : updatedSensorRaw.created_at,
                organizationName: 'N/A', // Se establecerán como N/A hasta que fetchSensors se ejecute
                assetName: 'N/A',        // Se establecerán como N/A hasta que fetchSensors se ejecute
              };
              this.sensors.push(updatedSensorForStore);
            }

            // También actualiza 'currentSensor' si es el sensor que se está viendo en detalle (para pages/sensors/[id].vue)
            if (this.currentSensor && this.currentSensor.id === updatedSensorRaw.id) {
                // Fusionar los datos nuevos con los existentes de currentSensor, preservando lo que no cambie
                this.currentSensor = {
                    ...this.currentSensor,
                    last_value: updatedSensorRaw.last_value,
                    last_unit: updatedSensorRaw.last_unit,
                    last_reading_timestamp: updatedSensorRaw.last_reading_timestamp,
                    status: updatedSensorRaw.status,
                    last_communication: updatedSensorRaw.last_communication,
                    battery_level: updatedSensorRaw.battery_level,
                    signal_strength: updatedSensorRaw.signal_strength,
                    // Si hay otras propiedades de 'currentSensor' que deberían venir del payload.new,
                    // asegúrate de incluirlas aquí.
                };
                console.log(`[Sensors Store] currentSensor (ID: ${updatedSensorRaw.id}) actualizado directamente para página de detalle.`);
            }
          })
          .subscribe();

        this.dashboardSensorUpdatesChannel = channel; // Guarda la referencia al canal
        console.log('[Sensors Store] Suscrito exitosamente a cambios generales en la tabla de sensores para el Dashboard.');
      } catch (e) {
        console.error('[Sensors Store] Error al suscribirse a cambios generales de sensores:', e);
      }
    },

    async unsubscribeFromSensorUpdates() {
      // Asegúrate de desuscribirte del canal correcto
      if (this.dashboardSensorUpdatesChannel) {
        await this.dashboardSensorUpdatesChannel.unsubscribe();
        this.dashboardSensorUpdatesChannel = null;
        console.log('[Sensors Store] Desuscrito de cambios generales en la tabla de sensores.');
      }
    },

    // Renombrado para mayor claridad, se usa para cualquier gráfico que necesite varias lecturas de sensores
    async subscribeToGraphReadings(sensorIds) {
      const { $supabase } = useNuxtApp();
      console.log('[Sensors Store] subscribeToGraphReadings llamado con IDs:', sensorIds);

      // Desuscribirse de sensores que ya no están seleccionados
      for (const id in this.dashboardRealtimeSubscriptions) {
        if (!sensorIds.includes(id)) {
          await this.dashboardRealtimeSubscriptions[id].unsubscribe();
          delete this.dashboardRealtimeSubscriptions[id];
          // Limpiar también las lecturas de ese sensor
          delete this.allSensorRecentReadings[id];
          console.log(`[Sensors Store] Desuscrito de lecturas de sensor para sensor ${id} (ya no seleccionado).`);
        }
      }

      for (const sensorId of sensorIds) {
        // Solo suscribirse si aún no estamos suscritos a este sensor
        if (!this.dashboardRealtimeSubscriptions[sensorId]) {
          try {
            // Cargar lecturas históricas iniciales
            const { data, error } = await $supabase
                .from('sensor_readings')
                .select('value, timestamp, unit')
                .eq('sensor_id', sensorId)
                .order('timestamp', { ascending: false })
                .limit(50); // Limita el número de lecturas históricas

            if (error) {
                console.error(`[Sensors Store] Error al cargar lecturas históricas para sensor ${sensorId}:`, error);
                throw error;
            }

            // Almacenar las lecturas históricas (invertir para que las más antiguas estén primero para la gráfica)
            this.allSensorRecentReadings[sensorId] = data.reverse(); 

            // Suscribirse a nuevas inserciones en tiempo real para este sensor específico
            const channel = $supabase.channel(`graph_chart_readings_${sensorId}`);
            channel.on('postgres_changes', {
              event: 'INSERT', // Solo nos interesan las nuevas lecturas
              schema: 'public',
              table: 'sensor_readings',
              filter: `sensor_id=eq.${sensorId}` // Filtrar por el ID del sensor actual
            }, payload => {
              console.log(`[Sensors Store] Nueva lectura en tiempo real para sensor ${sensorId}:`, payload.new);
              const newReading = {
                value: payload.new.value,
                timestamp: payload.new.timestamp,
                unit: payload.new.unit,
              };
              // Asegurarse de que el array exista antes de empujar
              if (!this.allSensorRecentReadings[sensorId]) {
                this.allSensorRecentReadings[sensorId] = [];
              }
              // Añadir la nueva lectura al final del array para la gráfica
              this.allSensorRecentReadings[sensorId].push(newReading); 
              // Opcional: limitar el tamaño del array para evitar que crezca indefinidamente
              if (this.allSensorRecentReadings[sensorId].length > 100) { // Mantener, por ejemplo, 100 lecturas
                this.allSensorRecentReadings[sensorId].shift(); // Eliminar la más antigua
              }
            }).subscribe();

            // Guardar la suscripción para poder desuscribirnos luego
            this.dashboardRealtimeSubscriptions[sensorId] = channel;
            console.log(`[Sensors Store] Suscrito a lecturas en tiempo real para gráfico del sensor ${sensorId}.`);
          } catch (e) {
            console.error(`[Sensors Store] Error al suscribirse a lecturas de gráfico para sensor ${sensorId}:`, e);
          }
        }
      }
    },

    // Renombrado para mayor claridad
    async unsubscribeFromAllGraphReadings() {
      for (const id in this.dashboardRealtimeSubscriptions) {
        await this.dashboardRealtimeSubscriptions[id].unsubscribe();
        delete this.dashboardRealtimeSubscriptions[id];
        delete this.allSensorRecentReadings[id]; // Limpiar las lecturas al desuscribir
      }
      console.log('[Sensors Store] Desuscrito de todas las lecturas de gráfico.');

      // Si existe un canal general para lecturas de gráfico (aunque el enfoque es por sensorId)
      if (this.dashboardChartReadingsChannel) {
        await this.dashboardChartReadingsChannel.unsubscribe();
        this.dashboardChartReadingsChannel = null;
        console.log('[Sensors Store] Desuscrito del canal general de lecturas de gráfico.');
      }
    },

    // Estas funciones parecen ser para los StatCards o la sección de "sensores recientes" en el dashboard
    // No la usaremos para la reactividad en el dashboard de forma directa con postgres_changes,
    // ya que subscribeToSensorUpdates es la que maneja los cambios de la tabla 'sensors'
    // que alimentan a recentSensors.
    async subscribeToDashboardRecentReadings() {
      // Esta función no necesita escuchar postgres_changes si subscribeToSensorUpdates
      // ya está actualizando this.sensors directamente.
      // Su propósito original (si solo era para StatCards/última lectura)
      // ahora es cubierto por subscribeToSensorUpdates.
      console.log('[Sensors Store] subscribeToDashboardRecentReadings no realiza suscripción de Realtime directa a lecturas recientes, se basa en subscribeToSensorUpdates.');
    },

    async unsubscribeFromDashboardRecentReadings() {
      console.log('[Sensors Store] unsubscribeFromDashboardRecentReadings no realiza desuscripción, se basa en unsubscribeFromSensorUpdates.');
    },

    // Funciones para la vista de detalle de un solo sensor
    async fetchAndSubscribeToDetailReadings(sensorId) {
      // Si ya hay una suscripción activa de detalle, desuscribirse primero
      if (this.detailRealtimeSubscription) {
        await this.detailRealtimeSubscription.unsubscribe();
        this.detailRealtimeSubscription = null;
      }

      this.isLoading = true;
      this.error = null;
      this.currentSensorReadings = []; // Limpiar lecturas anteriores
      const { $supabase } = useNuxtApp();
      try {
        // Cargar lecturas históricas iniciales para el detalle
        const { data, error } = await $supabase
          .from('sensor_readings')
          .select('id, sensor_id, value, timestamp, unit')
          .eq('sensor_id', sensorId)
          .order('timestamp', { ascending: false })
          .limit(50); // Limitar para el historial

        if (error) {
            console.error(`[Sensors Store] Supabase error fetching detail readings for sensor ${sensorId}:`, error);
            throw error;
        }
        this.currentSensorReadings = data;
        console.log(`[Sensors Store] Lecturas iniciales para sensor ${sensorId} (detalle):`, this.currentSensorReadings);

        // Suscribirse a cambios en tiempo real para este sensor específico
        const channel = $supabase.channel(`sensor_readings_${sensorId}`);
        channel.on('postgres_changes', {
          event: '*', // Escuchar todos los eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'sensor_readings',
          filter: `sensor_id=eq.${sensorId}` // Filtrar por el ID del sensor actual
        }, payload => {
          console.log(`[Sensors Store] Cambio en lecturas de sensor ${sensorId} (Realtime - Detalle):`, payload);
          if (payload.eventType === 'INSERT') {
            this.currentSensorReadings.unshift(payload.new); // Añadir al principio para mostrar las más nuevas
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
        console.log(`[Sensors Store] Suscrito a lecturas en tiempo real para sensor ${sensorId} (detalle).`);
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

    // Función para obtener lecturas históricas (usada por ejemplo en un selector de rango de tiempo)
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