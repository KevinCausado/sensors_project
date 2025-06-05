<template>
  <div>
    <PageHeader
      title="Dashboard"
      subtitle="Monitoreo y estadísticas del sistema" />

    <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4">
      <StatCard
        title="Total Sensores"
        :value="totalSensors"
        icon="sensor"
        color="primary"
        :trend="sensorTrend"
        :percentage="Math.abs(totalSensorsPercentage).toFixed(1)" />

      <StatCard
        title="Alertas Activas"
        :value="activeAlerts"
        icon="alert"
        color="error"
        :trend="alertTrend"
        :percentage="Math.abs(activeAlertsPercentage).toFixed(1)" />

      <StatCard
        title="Total Sensores Activos" :value="activeSensors"
        icon="sensor"
        color="success"
        :trend="activeSensorTrend"
        :percentage="Math.abs(activeSensorsPercentage).toFixed(1)" />

      <StatCard
        title="Organizaciones"
        :value="totalOrganizations"
        icon="org"
        color="secondary"
        :trend="orgTrend"
        :percentage="Math.abs(totalOrganizationsPercentage).toFixed(1)" />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Sensores Recientes</h2>
          <button
            @click="expandedSection = expandedSection === 'sensors' ? null : 'sensors'"
            class="text-sm text-primary-600 hover:text-primary-500">
            {{ expandedSection === 'sensors' ? 'Ver menos' : 'Ver todo' }}
          </button>
        </div>

        <div class="space-y-4"
              :class="{ 'max-h-80 overflow-y-auto': expandedSection === 'sensors' }">
          <div v-for="sensor in displayedSensors" :key="sensor.id"
                class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center">
              <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                {{ sensor.name.substring(0, 2).toUpperCase() }}
              </div>
              <div class="ml-4">
                <h3 class="text-sm font-medium text-gray-900">{{ sensor.name }}</h3>
                <p class="text-sm text-gray-500">{{ sensor.location }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-gray-900">{{ sensor.value }} {{ sensor.unit }}</p>
              <p class="text-xs text-gray-500">{{ formatTimeAgo(sensor.lastReading) }}</p>
            </div>
          </div>
          <p v-if="displayedSensors.length === 0" class="text-center text-gray-500">No hay sensores disponibles para esta organización.</p>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Alertas Recientes</h2>
          <button
            @click="expandedSection = expandedSection === 'alerts' ? null : 'alerts'"
            class="text-sm text-primary-600 hover:text-primary-500">
            {{ expandedSection === 'alerts' ? 'Ver menos' : 'Ver todo' }}
          </button>
        </div>

        <div :class="{ 'max-h-80 overflow-y-auto': expandedSection === 'alerts' }">
          <AlertList :alerts="displayedAlerts" :loading="loading" />
        </div>
      </div>

      <div class="card lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Monitoreo en Tiempo Real</h2>
          <button
            @click="expandedSection = expandedSection === 'chart' ? null : 'chart'"
            class="text-sm text-primary-600 hover:text-primary-500">
            {{ expandedSection === 'chart' ? 'Ver menos' : 'Ver todo' }}
          </button>
        </div>

        <div class="mb-4 flex flex-wrap gap-2">
          <label v-for="sensor in availableSensorsForSelection"
                  :key="sensor.id"
                  class="inline-flex items-center">
            <input type="checkbox"
                    v-model="selectedSensorIds"
                    :value="sensor.id"
                    class="form-checkbox h-4 w-4 text-primary-600 rounded border-gray-300" />
            <span class="ml-2 text-sm text-gray-700">{{ sensor.name }}</span>
          </label>
          <p v-if="availableSensorsForSelection.length === 0" class="text-sm text-gray-500">No hay sensores activos para monitorear en esta organización.</p>
        </div>

        <SensorChart
          :sensors="realtimeSelectedSensorsForChart"
          :height="expandedSection === 'chart' ? 600 : 300"
          :show-time-range-controls="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useSensorStore } from '~/stores/sensors';
import { useAlertStore } from '~/stores/alerts';
import { useOrganizationStore } from '~/stores/organizations';
import { definePageMeta, useNuxtApp } from '#imports';

definePageMeta({
  // middleware: ['auth'],
  permission: 'dashboard.ver',
});

// Stores
const sensorStore = useSensorStore();
const alertStore = useAlertStore();
const organizationStore = useOrganizationStore();
const { $supabase } = useNuxtApp();

// State
const loading = ref(false);
const expandedSection = ref(null);
const selectedSensorIds = ref([]); // Sensores seleccionados para la gráfica

// Historical data for percentage calculation (store total count from 24 hours ago)
const previousTotalSensors = ref(0);
const previousTotalOrganizations = ref(0);

// --- Helper para calcular el cambio porcentual ---
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

// Stats (valores actuales) - AHORA USAN filteredSensors
const totalSensors = computed(() => sensorStore.filteredSensors.length);
const activeAlerts = computed(() => alertStore.activeAlerts); // Las alertas no se filtran por organización en este contexto
const totalAlerts = computed(() => alertStore.totalAlerts); // Las alertas no se filtran por organización en este contexto
const activeSensors = computed(() => sensorStore.filteredSensors.filter(s => s.status === 'active').length);
const totalOrganizations = computed(() => organizationStore.allOrganizations.length); // Esto siempre será el total de organizaciones

// --- Porcentajes calculados ---
const totalSensorsPercentage = computed(() =>
  calculatePercentageChange(totalSensors.value, previousTotalSensors.value)
);

const totalOrganizationsPercentage = computed(() =>
  calculatePercentageChange(totalOrganizations.value, previousTotalOrganizations.value)
);

const activeSensorsPercentage = computed(() => {
  if (totalSensors.value === 0) return 0;
  return (activeSensors.value / totalSensors.value) * 100;
});

const activeAlertsPercentage = computed(() => {
  if (totalAlerts.value === 0) return 0;
  return (activeAlerts.value / totalAlerts.value) * 100;
});

// --- Tendencias (solo algunas serán dinámicas) ---
const sensorTrend = computed(() => totalSensorsPercentage.value > 0 ? 'up' : totalSensorsPercentage.value < 0 ? 'down' : 'stable');
const orgTrend = computed(() => totalOrganizationsPercentage.value > 0 ? 'up' : totalOrganizationsPercentage.value < 0 ? 'down' : 'stable');
const alertTrend = 'down'; // Ej: 'up', 'down', 'stable'
const activeSensorTrend = 'up'; // Ej: 'up', 'down', 'stable'

// Propiedades computadas para la visualización de listas - AHORA USAN filteredSensors
const displayedSensors = computed(() => {
  // `sensorStore.recentSensors` ya devuelve los 5 más recientes de los filtrados
  const sensors = sensorStore.recentSensors;
  return expandedSection.value === 'sensors' ? sensors : sensors.slice(0, 3);
});

const displayedAlerts = computed(() => {
  // Use alertStore.recentAlerts which is already filtered and enriched
  const alerts = alertStore.recentAlerts; 
  return expandedSection.value === 'alerts' ? alerts : alerts.slice(0, 3);
});
// Propiedad computada para los sensores disponibles para selección - AHORA USAN filteredSensors
const availableSensorsForSelection = computed(() => {
  return sensorStore.filteredSensors
    .filter(s => s.status === 'active')
    .sort((a, b) => {
      if (a.lastReading && b.lastReading) {
        return new Date(b.lastReading) - new Date(a.lastReading);
      }
      if (a.lastReading) return -1;
      if (b.lastReading) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
});

const realtimeSelectedSensorsForChart = computed(() => {
  // Asegúrate de que solo seleccionamos sensores que están en la vista filtrada actual
  const currentFilteredSensorIds = availableSensorsForSelection.value.map(s => s.id);
  return selectedSensorIds.value
    .filter(id => currentFilteredSensorIds.includes(id)) // Filtra los seleccionados para la gráfica si no están en la vista actual
    .map(id => {
      const sensorDetails = sensorStore.sensors.find(s => s.id === id); // Busca en `sensorStore.sensors` (todos los sensores)
      const readings = sensorStore.allSensorRecentReadings[id] || [];
      return sensorDetails ? {
        ...sensorDetails,
        readings: readings,
      } : null;
    }).filter(Boolean);
});

// Métodos para formatear la fecha
const formatTimeAgo = (date) => {
  if (!date) return '';
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) {
    return `Hace ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} hora${hours === 1 ? '' : 's'}`;
  }

  const days = Math.floor(hours / 24);
  return `Hace ${days} día${days === 1 ? '' : 's'}`;
};

// --- Watchers y Ciclo de Vida ---

// Watcher para suscribirse/desuscribirse a lecturas de sensores en tiempo real para el gráfico
watch(selectedSensorIds, (newIds, oldIds) => {
  console.log('Watcher selectedSensorIds: ', newIds);
  if (newIds && newIds.length > 0) {
    sensorStore.subscribeToDashboardReadings(newIds);
  } else if (oldIds && oldIds.length > 0) {
    // Si la lista se vacía, desuscribe todo
    sensorStore.unsubscribeFromAllDashboardReadings();
  }
}, { immediate: true }); // ¡CRÍTICO: Ejecutar en la carga inicial!


// Watcher para cuando cambie la organización seleccionada, resetear los sensores seleccionados para la gráfica
watch(() => organizationStore.selectedOrganizationId, async (newOrgId, oldOrgId) => {
  if (newOrgId !== oldOrgId) {
    console.log(`Organización cambiada de ${oldOrgId} a ${newOrgId}.`);
    // Primero, desuscribe todas las lecturas del dashboard existentes
    await sensorStore.unsubscribeFromAllDashboardReadings();
    // Limpia la selección actual de sensores para el gráfico
    selectedSensorIds.value = [];

    // Luego, re-selecciona los sensores activos de la *nueva* organización.
    // Esto disparará el primer `watch(selectedSensorIds, ...)` y reiniciará las suscripciones.
    if (availableSensorsForSelection.value.length > 0) {
        selectedSensorIds.value = availableSensorsForSelection.value.map(s => s.id);
        console.log('Sensores re-seleccionados para la nueva organización:', selectedSensorIds.value);
    } else {
        console.log('No hay sensores activos para la nueva organización.');
    }
  }
}, { immediate: true }); // ¡CRÍTICO: Ejecutar en la carga inicial!


// Cargar datos y calcular porcentajes al montar el componente
onMounted(async () => {
    loading.value = true;
    try {
        // Cargar datos iniciales en paralelo
        await Promise.all([
            sensorStore.fetchSensors(),
            alertStore.fetchAlerts(),
            organizationStore.fetchOrganizations()
        ]);

        // --- Lógica para inicializar la organización seleccionada ---
        // if (process.client) { // Solo ejecutar en el lado del cliente (navegador)
        //     const storedOrgId = localStorage.getItem('selected_org_id');
        //     if (storedOrgId && organizationStore.allOrganizations.some(org => org.id === storedOrgId)) {
        //         // Si hay un ID guardado y es válido, usarlo
        //         organizationStore.setSelectedOrganization(storedOrgId);
        //         console.log(`Organización inicial cargada desde localStorage: ${storedOrgId}`);
        //     } else if (organizationStore.allOrganizations.length > 0) {
        //         // Si no hay ID guardado, o es inválido, seleccionar la primera organización disponible
        //         organizationStore.setSelectedOrganization(organizationStore.allOrganizations[0].id);
        //         console.log('No hay organización guardada o es inválida, seleccionando la primera disponible.');
        //     } else {
        //         // Si no hay organizaciones disponibles en absoluto
        //         organizationStore.setSelectedOrganization(null);
        //         console.log('No hay organizaciones disponibles para seleccionar.');
        //     }
        // }
        // --- FIN de la lógica de inicialización de organización ---

        // Lógica para la selección inicial de sensores en el gráfico (tal como la tienes)
        if (selectedSensorIds.value.length === 0 && availableSensorsForSelection.value.length > 0) {
            selectedSensorIds.value = availableSensorsForSelection.value.map(s => s.id);
            console.log('Sensores iniciales seleccionados para la gráfica en onMounted:', selectedSensorIds.value);
        } else if (selectedSensorIds.value.length === 0) {
            console.log('No hay sensores activos disponibles para seleccionar en la carga inicial (onMounted).');
        }

        // REVISAR: Cargar datos históricos para los porcentajes (si es necesario desde Supabase)
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const { count: totalSensorsTwentyFourHoursAgo, error: errSensorsYesterday } = await $supabase
            .from('Sensors')
            .select('id', { count: 'exact' })
            .lt('createdAt', twentyFourHoursAgo.toISOString());

        const { count: totalOrganizationsTwentyFourHoursAgo, error: errOrgsYesterday } = await $supabase
            .from('Organizations')
            .select('id', { count: 'exact' })
            .lt('createdAt', twentyFourHoursAgo.toISOString());

        if (errSensorsYesterday) console.error("Error al obtener el total de sensores hace 24h:", errSensorsYesterday);
        if (errOrgsYesterday) console.error("Error al obtener el total de organizaciones hace 24h:", errOrgsYesterday);

        previousTotalSensors.value = totalSensorsTwentyFourHoursAgo || 0;
        previousTotalOrganizations.value = totalOrganizationsTwentyFourHoursAgo || 0;

        // --- SECCIÓN DE SUSCRIPCIONES REALTIME ---
        console.log('[Dashboard.vue - onMounted] Preparando para iniciar suscripciones de Realtime...');
        console.log('--- TEST: Llamando a alertStore.subscribeToAlertUpdates() ahora ---');
        alertStore.subscribeToAlertUpdates(); // Llama a la acción SIN await para no bloquear
        console.log('--- TEST: alertStore.subscribeToAlertUpdates() ha sido llamada ---');

        // Las suscripciones que NO SON para el gráfico, pueden ser awaited o no, dependiendo de tu flujo
        sensorStore.subscribeToSensorUpdates(); // Suscripción a cambios generales de sensores

    } catch (error) {
        console.error("Error al cargar el dashboard:", error);
    } finally {
        loading.value = false;
    }
});
// Desuscribirse al desmontar el componente para evitar fugas de memoria
onUnmounted(async () => {
  console.log('[Dashboard.vue - onMounted] Preparando para iniciar suscripciones de Realtime...');
  await sensorStore.unsubscribeFromAllDashboardReadings();
  await sensorStore.unsubscribeFromSensorUpdates();
  await alertStore.unsubscribeFromAlertUpdates(); // Asegúrate de tener esta acción en tu alertStore
});
</script>

<style scoped>
/* Tus estilos aquí */
</style>