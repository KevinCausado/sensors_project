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
    // General purpose filtered alerts, now also enriched with sensor and organization names.
    // This getter is reactive to:
    // - `state.alerts` (raw alerts from DB/Realtime)
    // - `organizationStore.selectedOrganizationId` (for filtering)
    // - `sensorStore.sensors` (for sensor name lookup)
    // - `organizationStore.organizations` (for organization name lookup)
    filteredAlerts: (state) => {
      const organizationStore = useOrganizationStore();
      const sensorStore = useSensorStore();

      let filtered = state.alerts;

      // --- CRITICAL DEPENDENCY CHECK ---
      // Ensure that sensorStore.sensors and organizationStore.organizations are populated
      // before attempting to filter or enrich. If they are not, the .find() calls would fail
      // or return incorrect 'Desconocido' values.
      if (!sensorStore.sensors.length || !organizationStore.organizations.length) {
          console.warn('[Alerts Store] filteredAlerts: Sensors or Organizations not yet loaded for enrichment. Returning partial data.');
          // Return alerts without enrichment, or an empty array, or a loading state.
          // Returning un-enriched alerts allows the UI to show 'Cargando...' for names
          return state.alerts.map(alert => ({
              ...alert,
              sensorName: 'Cargando...',
              organizationName: 'Cargando...'
          }));
      }

      // Apply organization filter if a specific organization is selected
      if (organizationStore.selectedOrganizationId) {
        // Find all sensors belonging to the selected organization.
        // We use `sensorStore.sensors` (all sensors) here, not `filteredSensors`,
        // to ensure we can correctly map alerts to sensors within the selected organization,
        // regardless of the current sensor filter.
        const sensorIdsInSelectedOrg = sensorStore.sensors
          .filter(sensor => sensor.organization_id === organizationStore.selectedOrganizationId)
          .map(sensor => sensor.id);

        filtered = filtered.filter(alert =>
          // Check if the alert's sensor_id is in the list of sensors from the selected organization
          (alert.sensor_id && sensorIdsInSelectedOrg.includes(alert.sensor_id)) ||
          // OR if the alert itself has an organization_id that matches the selected organization.
          // This handles alerts that might not be directly tied to a sensor but directly to an organization.
          (alert.organization_id && alert.organization_id === organizationStore.selectedOrganizationId)
        );
      }

      // After filtering, enrich each alert with sensorName and organizationName
      return filtered.map(alert => {
        // Find the associated sensor
        const sensor = sensorStore.sensors.find(s => s.id === alert.sensor_id);
        const sensorName = sensor ? sensor.name : 'Desconocido';

        // Determine the effective organization ID for the alert
        // Prioritize `alert.organization_id` if it exists.
        // Otherwise, fall back to the `sensor.organization_id` if a sensor was found.
        const effectiveOrgId = alert.organization_id || sensor?.organization_id;
        const organization = organizationStore.organizations.find(org => org.id === effectiveOrgId);
        const organizationName = organization ? organization.name : 'Desconocida';

        return {
          ...alert,
          sensorName: sensorName,
          organizationName: organizationName,
        };
      });
    },

    // Specific getter for the dashboard's "Recent Alerts" section.
    // This getter is reactive to `filteredAlerts`.
    recentAlerts: (state) => {
      // Re-use the already filtered and enriched alerts from `filteredAlerts` getter.
      // This automatically applies the selected organization filter and has names.
      const alertsToProcess = state.filteredAlerts;

      // Sort alerts by `alert_time` in descending order (most recent first)
      const sorted = [...alertsToProcess].sort((a, b) => {
        const dateA = new Date(a.alert_time).getTime();
        const dateB = new Date(b.alert_time).getTime();
        return dateB - dateA;
      });

      // Limit the number of alerts for a concise dashboard display (e.g., top 5)
      return sorted.slice(0, 5); // You can adjust this limit (e.g., to 10)
    },

    // Your existing statistical getters
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
          .select('*')
          .order('alert_time', { ascending: false }); // Order by alert_time for initial fetch

        if (error) throw error;
        this.alerts = data;
      } catch (error) {
        this.error = error.message;
        console.error('Error fetching alerts:', error.message);
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
      .update({ status: 'resolved', resolved_time: new Date().toISOString() }) // <-- CHANGE HERE: resolved_at to resolved_time
      .eq('id', id);

    if (error) throw error;

    // Optimistically update the local state (Realtime might also update it)
    const index = this.alerts.findIndex(alert => alert.id === id);
    if (index !== -1) {
      this.alerts[index].status = 'resolved';
      this.alerts[index].resolved_time = new Date().toISOString(); // <-- CHANGE HERE: resolved_at to resolved_time
    }
  } catch (error) {
    this.error = error.message;
    console.error('Error resolving alert:', error.message);
  } finally {
    this.isLoading = false;
  }
},

    async subscribeToAlertUpdates() {
      // Prevent multiple subscriptions
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
              // Add new alert to the beginning and re-sort to maintain chronological order
              this.alerts.unshift(payload.new);
              this.alerts.sort((a, b) => new Date(b.alert_time) - new Date(a.alert_time));
            } else if (payload.eventType === 'UPDATE') {
              // Update existing alert and re-sort
              const index = this.alerts.findIndex(alert => alert.id === payload.old.id);
              if (index !== -1) {
                this.alerts[index] = payload.new;
                this.alerts.sort((a, b) => new Date(b.alert_time) - new Date(a.alert_time));
              }
            } else if (payload.eventType === 'DELETE') {
              // Remove deleted alert
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