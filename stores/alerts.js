// stores/alerts.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { useOrganizationStore } from './organizations';
import { useSensorStore } from './sensors';
import { useAssetStore } from './assets'; // Importar el store de activos

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
      const assetStore = useAssetStore(); // Obtener instancia del store de activos

      let filtered = state.alerts;

      // --- CRITICAL DEPENDENCY CHECK ---
      // Depuración: Verifica el estado de los stores antes de la enriquecimiento
      console.log('[Alerts Store] filteredAlerts - Estado de dependencias:');
      console.log(`  - sensorStore.sensors.length: ${sensorStore.sensors.length}`);
      console.log(`  - organizationStore.organizations.length: ${organizationStore.organizations.length}`);
      console.log(`  - assetStore.assets.length: ${assetStore.assets.length}`);
      console.log('  - assetStore.assets (contenido, para revisar IDs):', assetStore.assets);


      if (!sensorStore.sensors.length || !organizationStore.organizations.length || !assetStore.assets.length) {
          console.warn('[Alerts Store] filteredAlerts: Sensors, Organizations, or Assets not yet loaded for enrichment. Returning partial data.');
          return state.alerts.map(alert => ({
              ...alert,
              sensorName: 'Cargando...',
              organizationName: 'Cargando...',
              assetName: 'Cargando...' // Añadir esto para la carga
          }));
      }

      // Apply organization filter if a specific organization is selected
      if (organizationStore.selectedOrganizationId) {
        const sensorIdsInSelectedOrg = sensorStore.sensors
          .filter(sensor => sensor.organization_id === organizationStore.selectedOrganizationId)
          .map(sensor => sensor.id);

        filtered = filtered.filter(alert =>
          (alert.sensor_id && sensorIdsInSelectedOrg.includes(alert.sensor_id)) ||
          (alert.organization_id && alert.organization_id === organizationStore.selectedOrganizationId)
        );
      }

      // After filtering, enrich each alert with sensorName, organizationName, AND assetName
      const enrichedAlerts = filtered.map(alert => {
        const sensor = sensorStore.sensors.find(s => s.id === alert.sensor_id);
        const sensorName = sensor ? sensor.name : 'Desconocido';

        const effectiveOrgId = alert.organization_id || sensor?.organization_id;
        const organization = organizationStore.organizations.find(org => org.id === effectiveOrgId);
        const organizationName = organization ? organization.name : 'Desconocida';

        // Lógica para obtener el nombre del activo
        let assetName = 'Desconocido';
        const effectiveAssetId = alert.asset_id || sensor?.assetId; // Priorizar alert.asset_id, luego sensor.assetId

        if (effectiveAssetId) {
            const asset = assetStore.assets.find(a => a.id === effectiveAssetId);
            assetName = asset ? asset.name : 'N/A'; // Asegúrate de que si el activo no se encuentra, sea 'N/A'
        }
        
        const enrichedAlert = {
          ...alert,
          sensorName: sensorName,
          organizationName: organizationName,
          assetName: assetName, // Añadir el nombre del activo
        };
        console.log(`  - Alerta ID: ${enrichedAlert.id}, asset_id: ${enrichedAlert.asset_id}, effectiveAssetId: ${effectiveAssetId}, assetName: ${enrichedAlert.assetName}`);
        return enrichedAlert;
      });
      console.log('[Alerts Store] filteredAlerts - Alertas enriquecidas (primeros 5):', enrichedAlerts.slice(0,5));
      return enrichedAlerts;
    },

    recentAlerts: (state) => {
      // Re-use the already filtered and enriched alerts from `filteredAlerts` getter.
      const alertsToProcess = state.filteredAlerts;

      const sorted = [...alertsToProcess].sort((a, b) => {
        const dateA = new Date(a.alert_time).getTime();
        const dateB = new Date(b.alert_time).getTime();
        return dateB - dateA;
      });

      return sorted.slice(0, 5); 
    },

    totalAlerts: (state) => state.alerts.length,
    activeAlerts: (state) => state.alerts.filter(alert => alert.status === 'active').length,
    resolvedAlerts: (state) => state.alerts.filter(alert => alert.status === 'resolved').length,
  },

  actions: {
    async fetchAlerts() {
      this.isLoading = true;
      this.error = null;
      try {
        const { data, error } = await useNuxtApp().$supabase
          .from('alerts')
          .select(`
            id,
            type,
            priority,
            status,
            title,
            description,
            alert_time,
            resolved_time,
            asset_id,      
            sensor_id,
            organization_id
          `)
          .order('alert_time', { ascending: false }); 

        if (error) throw error;
        this.alerts = data;
        console.log('[Alerts Store] fetchAlerts - Alertas cargadas directamente de Supabase:', this.alerts); 
      } catch (error) {
        this.error = error.message;
        console.error('[Alerts Store] Error fetching alerts:', error.message);
      } finally {
        this.isLoading = false;
      }
    },

    async resolveAlert(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const { data, error } = await useNuxtApp().$supabase
          .from('alerts')
          .update({ status: 'resolved', resolved_time: new Date().toISOString() }) 
          .eq('id', id);

        if (error) throw error;

        const index = this.alerts.findIndex(alert => alert.id === id);
        if (index !== -1) {
          this.alerts[index].status = 'resolved';
          this.alerts[index].resolved_time = new Date().toISOString(); 
        }
      } catch (error) {
        this.error = error.message;
        console.error('[Alerts Store] Error resolving alert:', error.message);
      } finally {
        this.isLoading = false;
      }
    },

    async subscribeToAlertUpdates() {
      if (this.alertsChannel) {
        console.log('[Alerts Store] Already subscribed to alerts.');
        return;
      }

      try {
        const client = useNuxtApp().$supabase;
        const channel = client.channel('alerts_changes');
        channel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
            console.log('[Alerts Store] Realtime change in alerts:', payload);
            if (payload.eventType === 'INSERT') {
              this.alerts.unshift(payload.new);
              this.alerts.sort((a, b) => new Date(b.alert_time) - new Date(a.alert_time));
            } else if (payload.eventType === 'UPDATE') {
              const index = this.alerts.findIndex(alert => alert.id === payload.old.id);
              if (index !== -1) {
                this.alerts[index] = payload.new;
                this.alerts.sort((a, b) => new Date(b.alert_time) - new Date(a.alert_time));
              }
            } else if (payload.eventType === 'DELETE') {
              this.alerts = this.alerts.filter(alert => alert.id !== payload.old.id);
            }
          })
          .subscribe();
        this.alertsChannel = channel;
      } catch (e) {
          console.error('[Alerts Store] Error setting up Supabase Realtime channel for alerts:', e);
      }
    },

    async unsubscribeFromAlertUpdates() {
      if (this.alertsChannel) {
        await this.alertsChannel.unsubscribe();
        this.alertsChannel = null;
        console.log('[Alerts Store] Unsubscribed from alerts.');
      }
    }
  }
});
