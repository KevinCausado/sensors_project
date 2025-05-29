// stores/alerts.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { useOrganizationStore } from './organizations';
import { useSensorStore } from './sensors';

export const useAlertStore = defineStore('alerts', {
  state: () => ({
    alerts: [],
    isLoading: false,
    error: null,
    alertsChannel: null,
  }),

  getters: {
    filteredAlerts: (state) => {
      const organizationStore = useOrganizationStore();
      const sensorStore = useSensorStore();

      if (!organizationStore.selectedOrganizationId) {
        return state.alerts;
      }

      const sensorIdsInSelectedOrg = sensorStore.filteredSensors.map(sensor => sensor.id);

      return state.alerts.filter(alert =>
        sensorIdsInSelectedOrg.includes(alert.sensorId)
      );
    },

    totalAlerts: (state) => state.filteredAlerts.length,
    highPriorityAlerts: (state) => state.filteredAlerts.filter(a => a.priority === 'high').length,
    mediumPriorityAlerts: (state) => state.filteredAlerts.filter(a => a.priority === 'medium').length,
    lowPriorityAlerts: (state) => state.filteredAlerts.filter(a => a.priority === 'low').length,

    activeAlerts: (state) => {
      const activeFiltered = state.filteredAlerts.filter(a => a.status === 'active');
      return activeFiltered.length;
    },

    recentAlerts: (state) => {
      return [...state.filteredAlerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    alertsForSensor: (state) => (sensorId) => {
      return state.filteredAlerts.filter(alert => alert.sensorId === sensorId);
    },
  },

  actions: {
    async fetchAlerts() {
      this.isLoading = true;
      this.error = null;
      console.log('[Alerts Store Action] Fetching alerts started...');
      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('Alerts')
          .select(`
            *,
            Sensors(
              name,
              OrganizationId(name)
            )
          `)
          .order('createdAt', { ascending: false });

        if (error) {
          throw error;
        }

        this.alerts = (data || []).map(alert => ({
          ...alert,
          sensorName: alert.Sensors?.name || 'Sensor Desconocido',
          organizationName: alert.Sensors?.OrganizationId?.name || 'Organización Desconocida',
        }));

        console.log(`[Alerts Store Action] Data fetched. Number of records: ${this.alerts.length}`);
        console.log('[Alerts Store Action] Processed data for alerts (first item):', this.alerts[0]);

      } catch (err) {
        console.error('[Alerts Store Action] Error fetching alerts:', err);
        this.error = err.message || 'Error al cargar las alertas.';
      } finally {
        this.isLoading = false;
      }
    },

    async resolveAlert(alertId) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('Alerts')
          .update({ status: 'resolved', updatedAt: new Date().toISOString() })
          .eq('id', alertId)
          .select(`
            *,
            Sensors(
              name,
              OrganizationId(name)
            )
          `);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          const updatedAlertRaw = data[0];
          const updatedAlert = {
              ...updatedAlertRaw,
              sensorName: updatedAlertRaw.Sensors?.name || 'Sensor Desconocido',
              organizationName: updatedAlertRaw.Sensors?.OrganizationId?.name || 'Organización Desconocida',
          };

          const index = this.alerts.findIndex(alert => alert.id === updatedAlert.id);
          if (index !== -1) {
            this.alerts[index] = updatedAlert;
          }
        }
      } catch (err) {
        console.error('Error resolving alert:', err);
        this.error = err.message || 'Error al resolver la alerta.';
      } finally {
        this.isLoading = false;
      }
    },

    async createAlert(newAlertData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('Alerts')
          .insert([newAlertData])
          .select(`
            *,
            Sensors(
              name,
              OrganizationId(name)
            )
          `);

        if (error) throw error;

        if (data && data.length > 0) {
          const createdAlertRaw = data[0];
          const createdAlert = {
              ...createdAlertRaw,
              sensorName: createdAlertRaw.Sensors?.name || 'Sensor Desconocido',
              organizationName: createdAlertRaw.Sensors?.OrganizationId?.name || 'Organización Desconocida',
          };
          this.alerts.unshift(createdAlert);
        }

      } catch (err) {
        console.error('Error creating alert:', err);
        this.error = err.message || 'Error al crear la alerta.';
      } finally {
        this.isLoading = false;
      }
    },

    // --- ACCIONES DE REALTIME ---

    async subscribeToAlertUpdates() {
      if (this.alertsChannel) {
          await this.alertsChannel.unsubscribe();
          this.alertsChannel = null;
      }

      let supabaseClient = null;
      try {
          const nuxtApp = useNuxtApp();
          supabaseClient = nuxtApp.$supabase;
      } catch (e) {
          console.error('[Alerts Store] ERROR FATAL al intentar acceder a $supabase:', e);
          return;
      }

      if (!supabaseClient) {
          console.error('[Alerts Store] ERROR: $supabase no está disponible. No se puede suscribir a alertas.');
          return;
      }

      try {
          const channel = supabaseClient
              .channel('public:Alerts')
              .on(
                  'postgres_changes',
                  { event: '*', schema: 'public', table: 'Alerts' },
                  async (payload) => {
                      let processedAlert = payload.new;

                      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                          const { data: fullAlertData, error: fetchError } = await supabaseClient
                              .from('Alerts')
                              .select(`
                                  *,
                                  Sensors(
                                      name,
                                      OrganizationId(name)
                                  )
                              `)
                              .eq('id', payload.new.id)
                              .single();

                          if (fetchError) {
                              console.error('Error fetching full alert data for realtime update:', fetchError);
                              if (payload.new) {
                                  processedAlert = {
                                      ...payload.new,
                                      sensorName: 'Error al cargar Sensor',
                                      organizationName: 'Error al cargar Organización'
                                  };
                              }
                          } else {
                              processedAlert = {
                                  ...fullAlertData,
                                  sensorName: fullAlertData.Sensors?.name || 'Sensor Desconocido',
                                  organizationName: fullAlertData.Sensors?.OrganizationId?.name || 'Organización Desconocida',
                              };
                          }
                      }

                      if (payload.eventType === 'INSERT') {
                          this.alerts.unshift(processedAlert);
                      } else if (payload.eventType === 'UPDATE') {
                          const index = this.alerts.findIndex(alert => alert.id === payload.new.id);
                          if (index !== -1) {
                              this.alerts[index] = { ...this.alerts[index], ...processedAlert };
                          }
                      } else if (payload.eventType === 'DELETE') {
                          this.alerts = this.alerts.filter(alert => alert.id !== payload.old.id);
                      }
                  }
              )
              .subscribe((status) => {
                  if (status === 'SUBSCRIBED') {
                      console.log('Suscripción a alertas (Realtime) - STATUS: SUBSCRIBED');
                  } else if (status === 'CHANNEL_ERROR') {
                      console.error('Suscripción a alertas (Realtime) - STATUS: CHANNEL_ERROR', status);
                  } else if (status === 'TIMEOUT') {
                      console.warn('Suscripción a alertas (Realtime) - STATUS: TIMEOUT');
                  } else {
                      console.log(`Suscripción a alertas (Realtime) - STATUS: ${status}`);
                  }
              });
          this.alertsChannel = channel;
      } catch (e) {
          console.error('[Alerts Store] Error al configurar el canal de Supabase para alertas (en try/catch de channel):', e);
      }
    },
    async unsubscribeFromAlertUpdates() {
      if (this.alertsChannel) {
        await this.alertsChannel.unsubscribe();
        this.alertsChannel = null;
      }
    }
  }
});