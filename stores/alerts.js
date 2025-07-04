// stores/alerts.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { useOrganizationStore } from './organizations';
import { useSensorStore } from './sensors';
import { useAssetStore } from './assets'; // Importar el store de activos

export const useAlertStore = defineStore('alerts', {
  // STATE: Se ha añadido 'currentSensorAlerts' para la página de detalles
  state: () => ({
    alerts: [], // Para la vista global/dashboard
    currentSensorAlerts: [], // Para la página de detalles del sensor
    isLoading: false,
    error: null,
    alertsChannel: null,
  }),

  getters: {
    // GETTER NUEVO: Este se encarga de enriquecer las alertas específicas del sensor
    enrichedCurrentSensorAlerts: (state) => {
        const sensorStore = useSensorStore();
        const organizationStore = useOrganizationStore();
        const assetStore = useAssetStore();

        // Asegurarse de que los datos necesarios para el enriquecimiento están disponibles
        if (!state.currentSensorAlerts.length || !sensorStore.currentSensor || !organizationStore.organizations.length || !assetStore.assets.length) {
            return state.currentSensorAlerts.map(alert => ({
                ...alert,
                sensorName: sensorStore.currentSensor?.name || 'Cargando...',
                organizationName: 'Cargando...',
                assetName: 'Cargando...'
            }));
        }

        return state.currentSensorAlerts.map(alert => {
            const organization = organizationStore.organizations.find(org => org.id === (alert.organization_id || sensorStore.currentSensor.organizationId));
            const asset = assetStore.assets.find(a => a.id === (alert.asset_id || sensorStore.currentSensor.assetId));

            return {
                ...alert,
                sensorName: sensorStore.currentSensor.name,
                organizationName: organization?.name || "Desconocida",
                assetName: asset?.name || "N/A",
            };
        });
    },

    // Getters existentes para el resto de la aplicación (no se modifican)
    filteredAlerts: (state) => {
      const organizationStore = useOrganizationStore();
      const sensorStore = useSensorStore();
      const assetStore = useAssetStore();

      if (!sensorStore.sensors.length || !organizationStore.organizations.length || !assetStore.assets.length) {
          return state.alerts.map(alert => ({
              ...alert,
              sensorName: 'Cargando...',
              organizationName: 'Cargando...',
              assetName: 'Cargando...'
          }));
      }

      let filtered = state.alerts;
      if (organizationStore.selectedOrganizationId) {
        const sensorIdsInSelectedOrg = sensorStore.sensors
          .filter(sensor => sensor.organization_id === organizationStore.selectedOrganizationId)
          .map(sensor => sensor.id);
        filtered = filtered.filter(alert =>
          (alert.sensor_id && sensorIdsInSelectedOrg.includes(alert.sensor_id)) ||
          (alert.organization_id && alert.organization_id === organizationStore.selectedOrganizationId)
        );
      }

      return filtered.map(alert => {
        const sensor = sensorStore.sensors.find(s => s.id === alert.sensor_id);
        const effectiveOrgId = alert.organization_id || sensor?.organization_id;
        const organization = organizationStore.organizations.find(org => org.id === effectiveOrgId);
        let assetName = 'Desconocido';
        const effectiveAssetId = alert.asset_id || sensor?.assetId;
        if (effectiveAssetId) {
            const asset = assetStore.assets.find(a => a.id === effectiveAssetId);
            assetName = asset ? asset.name : 'N/A';
        }
        return {
          ...alert,
          sensorName: sensor ? sensor.name : 'Desconocido',
          organizationName: organization ? organization.name : 'Desconocida',
          assetName: assetName,
        };
      });
    },
    recentAlerts: (state) => {
      return [...state.filteredAlerts]
        .sort((a, b) => new Date(b.alert_time).getTime() - new Date(a.alert_time).getTime())
        .slice(0, 5);
    },
    totalAlerts: (state) => state.alerts.length,
    activeAlerts: (state) => state.alerts.filter(alert => alert.status === 'active').length,
    resolvedAlerts: (state) => state.alerts.filter(alert => alert.status === 'resolved').length,
  },

  actions: {
    // Esta acción se mantiene para el dashboard
    async fetchAlerts() {
      this.isLoading = true;
      this.error = null;
      try {
        const { data, error } = await useNuxtApp().$supabase
          .from('alerts')
          .select(`*`)
          .order('alert_time', { ascending: false });
        if (error) throw error;
        this.alerts = data;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },

    // ACCIÓN NUEVA: Para obtener alertas de un solo sensor
    async fetchAlertsForSensor(sensorId) {
      if (!sensorId) {
        this.currentSensorAlerts = [];
        return;
      }
      this.isLoading = true;
      this.error = null;
      try {
        const { data, error } = await useNuxtApp().$supabase
          .from('alerts')
          .select(`*`)
          .eq('sensor_id', sensorId) // Filtra por sensor_id en la consulta
          .order('alert_time', { ascending: false });

        if (error) throw error;
        this.currentSensorAlerts = data;
      } catch (err) {
        this.error = err.message;
        console.error(`[Alerts Store] Error fetching alerts for sensor ${sensorId}:`, err.message);
      } finally {
        this.isLoading = false;
      }
    },
    
    // ACCIÓN NUEVA: Para limpiar el estado al salir de la página
    clearCurrentSensorAlerts() {
        this.currentSensorAlerts = [];
    },

    async resolveAlert(id) {
      this.isLoading = true;
      try {
        const { error } = await useNuxtApp().$supabase
          .from('alerts')
          .update({ status: 'resolved', resolved_time: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        
        // Actualiza ambas listas para mantener la consistencia
        const updateStatus = (list) => {
            const index = list.findIndex(alert => alert.id === id);
            if (index !== -1) {
                list[index].status = 'resolved';
                list[index].resolved_time = new Date().toISOString();
            }
        };
        updateStatus(this.alerts);
        updateStatus(this.currentSensorAlerts);

      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },
    
    // La suscripción en tiempo real sigue funcionando. Se puede mejorar para actualizar
    // la lista del sensor, pero por ahora soluciona el problema principal de la carga inicial.
    async subscribeToAlertUpdates() {
      if (this.alertsChannel) return;
      try {
        const client = useNuxtApp().$supabase;
        this.alertsChannel = client.channel('alerts_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
            if (payload.eventType === 'INSERT') {
              this.alerts.unshift(payload.new);
              // Si la nueva alerta pertenece al sensor que se está viendo, la añadimos
              if (this.currentSensorAlerts.length > 0 && payload.new.sensor_id === this.currentSensorAlerts[0]?.sensor_id) {
                  this.currentSensorAlerts.unshift(payload.new);
              }
            } else if (payload.eventType === 'UPDATE') {
              let idx = this.alerts.findIndex(a => a.id === payload.new.id);
              if(idx > -1) this.alerts[idx] = payload.new;
              let sensorIdx = this.currentSensorAlerts.findIndex(a => a.id === payload.new.id);
              if(sensorIdx > -1) this.currentSensorAlerts[sensorIdx] = payload.new;
            } else if (payload.eventType === 'DELETE') {
              this.alerts = this.alerts.filter(a => a.id !== payload.old.id);
              this.currentSensorAlerts = this.currentSensorAlerts.filter(a => a.id !== payload.old.id);
            }
          })
          .subscribe();
      } catch (e) {
          console.error('[Alerts Store] Error en la suscripción a alertas:', e);
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
