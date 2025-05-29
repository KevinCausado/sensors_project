// stores/sensors.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { useOrganizationStore } from './organizations'; // NUEVO: Importar el store de organizaciones

export const useSensorStore = defineStore('sensors', {
  state: () => ({
    sensors: [],
    isLoading: false,
    error: null,
    currentSensor: null,
    currentSensorReadings: [], // Este es para la página de detalle de UN sensor

    // --- NUEVOS ESTADOS PARA EL DASHBOARD ---
    allSensorRecentReadings: {}, // { sensorId: [{value, timestamp}, ...], ... }
    dashboardRealtimeSubscriptions: {},
    detailRealtimeSubscription: null,
    dashboardSensorUpdatesChannel: null, // Asegúrate de que esta propiedad esté definida en el estado
  }),

  getters: {
    // NUEVO GETTER: Filtra todos los sensores por la organización seleccionada globalmente
    filteredSensors: (state) => {
      const organizationStore = useOrganizationStore();
      if (!organizationStore.selectedOrganizationId) {
        return state.sensors; // Si no hay organización seleccionada, devuelve todos
      }
      return state.sensors.filter(sensor =>
        sensor.organizationId === organizationStore.selectedOrganizationId
      );
    },

    recentSensors: (state) => {
      // Ahora usa el getter `filteredSensors`
      const filtered = state.filteredSensors;
      return [...filtered]
        .sort((a, b) => new Date(b.lastReading) - new Date(a.lastReading))
        .slice(0, 5);
    },

    // El getter `organizationSensors` se vuelve redundante si `filteredSensors`
    // ya maneja el filtro global. Lo eliminamos para simplificar.
    // Si realmente necesitas una función para obtener sensores de CUALQUIER organización
    // sin depender del estado global, podrías recrearla, pero no es el caso aquí.
    // organizationSensors: (state) => (organizationId) => {
    //   return state.sensors.filter(sensor => sensor.organizationId === organizationId);
    // },

    // `sensorsByType` ahora también opera sobre los sensores filtrados
    sensorsByType: (state) => {
      // Ahora usa el getter `filteredSensors`
      return state.filteredSensors.reduce((groups, sensor) => {
        const type = sensor.type;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(sensor);
        return groups;
      }, {});
    }
  },

  actions: {
    // --- FETCH ALL SENSORS ---
    // Esta acción debe seguir cargando *todos* los sensores, el filtrado se hace en los getters.
    async fetchSensors() {
      this.isLoading = true;
      this.error = null;

      try {
        const { $supabase } = useNuxtApp();

        // Asegúrate de que 'Sensors' es el nombre exacto de tu tabla y 'Organizations' para la relación
        const { data, error } = await $supabase
          .from('Sensors')
          .select('*, Organizations(name)') // Carga el nombre de la organización
          .order('createdAt', { ascending: false }); // Ordena por fecha de creación

        if (error) {
          throw error;
        }

        const mappedSensors = data.map(sensor => {
          const newSensor = { ...sensor };
          if (newSensor.Organizations && newSensor.Organizations.name) {
            newSensor.organizationName = newSensor.Organizations.name;
          } else {
            newSensor.organizationName = 'Desconocida';
          }
          delete newSensor.Organizations; // Elimina el objeto Organizations anidado

          // Mapea OrganizationId a organizationId si existe
          if (newSensor.OrganizationId !== undefined) {
            newSensor.organizationId = newSensor.OrganizationId;
            delete newSensor.OrganizationId;
          }
          // Asegúrate de que los sensores tienen una propiedad 'readings' (inicialmente vacía)
          newSensor.readings = [];
          // Asegura que lastReading exista, usando createdAt como fallback
          newSensor.lastReading = newSensor.lastReading || newSensor.createdAt;

          return newSensor;
        });

        this.sensors = mappedSensors;
        console.log('Sensores cargados (fetchSensors):', this.sensors);
        return this.sensors;
      } catch (err) {
        this.error = err.message || 'Error al cargar sensores.';
        console.error('Error fetching sensors:', err);
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    // --- FETCH A SINGLE SENSOR ---
    async fetchSensor(id) {
      this.isLoading = true;
      this.error = null;

      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('Sensors')
          .select('*, Organizations(name)')
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        const mappedData = { ...data };
        if (mappedData.Organizations && mappedData.Organizations.name) {
          mappedData.organizationName = mappedData.Organizations.name;
        } else {
          mappedData.organizationName = 'Desconocida';
        }
        delete mappedData.Organizations;

        if (mappedData.OrganizationId !== undefined) {
          mappedData.organizationId = mappedData.OrganizationId;
          delete mappedData.OrganizationId;
        }
        // NO ATTACHAMOS READINGS AQUÍ, se obtienen por separado
        this.currentSensor = mappedData;
        console.log('Sensor individual cargado (fetchSensor):', this.currentSensor);
        return this.currentSensor;
      } catch (err) {
        this.error = err.message || 'Error al cargar el sensor.';
        console.error('Error fetching single sensor:', err);
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    // --- MANTENEMOS ESTA ACCIÓN PARA LA PÁGINA DE DETALLE, PERO LA EXTENDEMOS CON REALTIME ---
    async fetchAndSubscribeToDetailReadings(sensorId) {
      this.isLoading = true;
      this.error = null;
      this.currentSensorReadings = []; // Limpiar lecturas anteriores

      const { $supabase } = useNuxtApp();

      try {
        // Desuscribirse de suscripciones anteriores para el detalle
        if (this.detailRealtimeSubscription) {
          await this.detailRealtimeSubscription.unsubscribe();
          this.detailRealtimeSubscription = null;
          console.log('Desuscrito de suscripción Realtime del detalle anterior.');
        }

        // Obtener las lecturas iniciales (históricas)
        const { data, error } = await $supabase
          .from('SensorReadings')
          .select('value, timestamp')
          .eq('sensorId', sensorId)
          .order('timestamp', { ascending: true })
          .limit(100);

        if (error) {
          throw error;
        }

        this.currentSensorReadings = data;
        console.log(`Lecturas iniciales cargadas para sensor ${sensorId} (detalle):`, this.currentSensorReadings);

        // Suscribirse a nuevos inserts en tiempo real para este sensorId (detalle)
        this.detailRealtimeSubscription = $supabase
          .channel(`sensor_readings_detail:${sensorId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'SensorReadings',
              filter: `sensorId=eq.${sensorId}`
            },
            (payload) => {
              console.log('Nueva lectura en tiempo real recibida (detalle):', payload.new);
              this.currentSensorReadings.push({
                value: payload.new.value,
                timestamp: payload.new.timestamp
              });
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(`Suscrito a Realtime para sensor ${sensorId} (detalle).`);
            } else if (status === 'CHANNEL_ERROR') {
              console.error(`Error en el canal Realtime para sensor ${sensorId} (detalle).`);
            }
          });

      } catch (err) {
        this.error = err.message || `Error al cargar lecturas o suscribirse para el sensor ${sensorId} (detalle).`;
        console.error(`Error en fetchAndSubscribeToDetailReadings para sensor ${sensorId}:`, err);
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    // --- NUEVA ACCIÓN PARA DESUSCRIBIRSE DEL DETALLE ---
    async unsubscribeFromDetailReadings() {
      if (this.detailRealtimeSubscription) {
        await this.detailRealtimeSubscription.unsubscribe();
        this.detailRealtimeSubscription = null;
        console.log('Desuscrito de lecturas Realtime del detalle.');
      }
    },

    // --- CREATE SENSOR ---
    async createSensor(sensorData) {
      this.isLoading = true;
      this.error = null;

      try {
        const { $supabase } = useNuxtApp();

        const dataToInsert = { ...sensorData };
        if (dataToInsert.organizationId !== undefined) {
          dataToInsert.OrganizationId = dataToInsert.organizationId;
          delete dataToInsert.organizationId;
        }
        if (dataToInsert.organizationName) {
          delete dataToInsert.organizationName;
        }

        const { data, error } = await $supabase
          .from('Sensors')
          .insert([dataToInsert])
          .select('*, Organizations(name)');

        if (error) {
          throw error;
        }

        const mappedData = { ...data[0] };
        if (mappedData.Organizations && mappedData.Organizations.name) {
          mappedData.organizationName = mappedData.Organizations.name;
        } else {
          mappedData.organizationName = 'Desconocida';
        }
        delete mappedData.Organizations;

        if (mappedData.OrganizationId !== undefined) {
          mappedData.organizationId = mappedData.OrganizationId;
          delete mappedData.OrganizationId;
        }

        mappedData.readings = [];

        this.sensors.push(mappedData);
        return mappedData;
      } catch (err) {
        this.error = err.message || 'Error al crear sensor.';
        console.error('Error creating sensor:', err);
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    // --- UPDATE SENSOR ---
    async updateSensor(id, sensorData) {
      this.isLoading = true;
      this.error = null;

      try {
        const { $supabase } = useNuxtApp();

        const dataToUpdate = { ...sensorData };
        if (dataToUpdate.organizationId !== undefined) {
          dataToUpdate.OrganizationId = dataToUpdate.organizationId;
          delete dataToUpdate.organizationId;
        }
        if (dataToUpdate.organizationName) {
          delete dataToUpdate.organizationName;
        }

        const { data, error } = await $supabase
          .from('Sensors')
          .update(dataToUpdate)
          .eq('id', id)
          .select('*, Organizations(name)');

        if (error) {
          throw error;
        }

        const mappedData = { ...data[0] };
        if (mappedData.Organizations && mappedData.Organizations.name) {
          mappedData.organizationName = mappedData.Organizations.name;
        } else {
          mappedData.organizationName = 'Desconocida';
        }
        delete mappedData.Organizations;

        if (mappedData.OrganizationId !== undefined) {
          mappedData.organizationId = mappedData.OrganizationId;
          delete mappedData.OrganizationId;
        }

        mappedData.readings = this.sensors.find(s => s.id === id)?.readings || [];

        const index = this.sensors.findIndex(s => s.id === id);
        if (index !== -1) {
          this.sensors[index] = mappedData;
        }
        if (this.currentSensor?.id === id) {
          this.currentSensor = mappedData;
        }

        return mappedData;
      } catch (err) {
        this.error = err.message || 'Error al actualizar sensor.';
        console.error('Error updating sensor:', err);
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    // --- DELETE SENSOR ---
    async deleteSensor(id) {
      this.isLoading = true;
      this.error = null;

      try {
        const { $supabase } = useNuxtApp();

        const { error } = await $supabase
          .from('Sensors')
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }

        const index = this.sensors.findIndex(s => s.id === id);
        if (index !== -1) {
          this.sensors.splice(index, 1);
        }
        if (this.currentSensor?.id === id) {
          this.currentSensor = null;
        }

        return true;
      } catch (err) {
        this.error = err.message || 'Error al eliminar sensor.';
        console.error('Error deleting sensor:', err);
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    // --- SAVE SENSOR READING ---
    async saveSensorReading(sensorId, value) {
      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('SensorReadings')
          .insert([
            {
              sensorId: sensorId,
              value: value,
              timestamp: new Date().toISOString()
            }
          ])
          .select();

        if (error) {
          throw error;
        }

        console.log(`Lectura guardada para sensor ${sensorId}:`, data);

        const sensorInStore = this.sensors.find(s => s.id === sensorId);
        if (sensorInStore) {
          sensorInStore.value = value;
          sensorInStore.lastReading = new Date().toISOString();
        }

        return data;
      } catch (err) {
        console.error(`Error al guardar lectura para el sensor ${sensorId}:`, err);
        throw err;
      }
    },

    // --- ACCIONES PARA EL DASHBOARD REALTIME ---

async subscribeToDashboardReadings(sensorIds) {
      // Primero, desuscribirnos de cualquier suscripción previa si los IDs cambian
      // O si queremos una suscripción fresca cada vez que se llama (depende de tu lógica deseada)
      // En tu Dashboard.vue, el watcher de organizationStore.selectedOrganizationId ya hace esto,
      // así que aquí podemos enfocarnos en los nuevos IDs.
         const { $supabase } = useNuxtApp(); //

      // Solo suscribirnos a los nuevos IDs que no tenemos ya suscritos
      const currentSubscribedIds = Object.keys(this.dashboardRealtimeSubscriptions);
      const newSensorIdsToSubscribe = sensorIds.filter(id => !currentSubscribedIds.includes(id));
      const idsToRemoveSubscription = currentSubscribedIds.filter(id => !sensorIds.includes(id));

      // Desuscribirse de sensores que ya no están seleccionados
      for (const id of idsToRemoveSubscription) {
        if (this.dashboardRealtimeSubscriptions[id]) {
          await this.dashboardRealtimeSubscriptions[id].unsubscribe();
          delete this.dashboardRealtimeSubscriptions[id];
          delete this.allSensorRecentReadings[id]; // Limpia también sus lecturas
          console.log(`Desuscrito de sensor ${id} para el dashboard.`);
        }
      }

      // Suscribirse a nuevos sensores
      for (const sensorId of newSensorIdsToSubscribe) {
        // Asegúrate de que el canal no se cree dos veces para el mismo sensor
        if (!this.dashboardRealtimeSubscriptions[sensorId]) {
          // Inicializa el array de lecturas si no existe
          if (!this.allSensorRecentReadings[sensorId]) {
            this.allSensorRecentReadings[sensorId] = [];
          }

          const channel = $supabase
            .channel(`dashboard_sensor_readings_${sensorId}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'SensorReadings', // Asegúrate de que este es el nombre de tu tabla
                filter: `sensorId=eq.${sensorId}`
              },
              (payload) => {
                console.log('Nueva lectura en tiempo real recibida (dashboard):', payload.new);

                // --- CAMBIO CLAVE AQUÍ ---
                // Crea un nuevo array con la nueva lectura para asegurar la reactividad
                const newReadingsArray = [...this.allSensorRecentReadings[sensorId], {
                  value: payload.new.value,
                  timestamp: payload.new.timestamp
                }];

                // Limita el tamaño del array (ej. últimas 50 lecturas)
                if (newReadingsArray.length > 50) {
                  newReadingsArray.shift(); // Elimina el elemento más antiguo
                }

                // Asigna el nuevo array, forzando la reactividad
                this.allSensorRecentReadings[sensorId] = newReadingsArray;
                // --- FIN DEL CAMBIO CLAVE ---

                // También actualiza los metadatos del sensor si es necesario (para la lista de sensores recientes)
                const sensorInStore = this.sensors.find(s => s.id === sensorId);
                if (sensorInStore) {
                  sensorInStore.value = payload.new.value;
                  sensorInStore.lastReading = payload.new.timestamp;
                }
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                console.log(`Suscrito a lecturas en tiempo real para sensor ${sensorId} (dashboard).`);
              } else if (status === 'CHANNEL_ERROR') {
                console.error(`Error en el canal para sensor ${sensorId} (dashboard).`, status);
              }
            });

          this.dashboardRealtimeSubscriptions[sensorId] = channel;
        }
      }
    },

    // Nueva acción para desuscribirse de todas las lecturas del dashboard
    async unsubscribeFromAllDashboardReadings() {
      for (const sensorId in this.dashboardRealtimeSubscriptions) {
        if (this.dashboardRealtimeSubscriptions[sensorId]) {
          await this.dashboardRealtimeSubscriptions[sensorId].unsubscribe();
          console.log(`Desuscrito de lecturas en tiempo real para sensor ${sensorId} (dashboard).`);
        }
      }
      this.dashboardRealtimeSubscriptions = {}; // Limpia todas las referencias
      this.allSensorRecentReadings = {}; // Limpia los datos de las lecturas
    },

    async subscribeToSensorUpdates() {
      if (this.dashboardSensorUpdatesChannel) {
        await this.dashboardSensorUpdatesChannel.unsubscribe();
      }
      const { $supabase } = useNuxtApp();
      const sensorUpdatesChannel = $supabase
        .channel('sensor_updates_dashboard')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'Sensors' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newSensor = payload.new;
              // Asegurarse de mapear OrganizationId a organizationId si viene en el payload
              if (newSensor.OrganizationId !== undefined) {
                newSensor.organizationId = newSensor.OrganizationId;
                delete newSensor.OrganizationId;
              }
              this.sensors.push(newSensor);
            } else if (payload.eventType === 'DELETE') {
              this.sensors = this.sensors.filter(s => s.id !== payload.old.id);
            } else if (payload.eventType === 'UPDATE') {
              const index = this.sensors.findIndex(s => s.id === payload.new.id);
              if (index !== -1) {
                let mappedUpdatedSensor = payload.new;
                // Asegurarse de mapear OrganizationId a organizationId si viene en el payload
                if (mappedUpdatedSensor.OrganizationId !== undefined) {
                  mappedUpdatedSensor.organizationId = mappedUpdatedSensor.OrganizationId;
                  delete mappedUpdatedSensor.OrganizationId;
                }
                this.sensors[index] = {
                  ...this.sensors[index],
                  ...mappedUpdatedSensor,
                };
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Suscrito a actualizaciones de sensores (dashboard).');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error en el canal de actualizaciones de sensores (dashboard).');
          }
        });
      this.dashboardSensorUpdatesChannel = sensorUpdatesChannel;
    },

    async unsubscribeFromSensorUpdates() {
      if (this.dashboardSensorUpdatesChannel) {
        await this.dashboardSensorUpdatesChannel.unsubscribe();
        this.dashboardSensorUpdatesChannel = null;
        console.log('Desuscrito de actualizaciones de sensores (dashboard).');
      }
    }
  }
});