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
                <!-- MODIFICACIÓN CLAVE: Mostrar el nombre del activo aquí -->
                <p class="text-sm text-gray-500">{{ sensor.assetName || sensor.location_description || 'N/A' }}</p>
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
            <!-- Opcional: mostrar el nombre del activo en la selección del gráfico -->
            <span v-if="sensor.assetName" class="ml-1 text-xs text-gray-500">({{ sensor.assetName }})</span>
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

// Importar el store de activos si el Dashboard lo usa para algo más que solo nombres mapeados
// import { useAssetStore } from '~/stores/assets'; 

definePageMeta({
  // middleware: ['auth'],
  permission: 'dashboard.ver',
});

// Stores
const sensorStore = useSensorStore();
const alertStore = useAlertStore();
const organizationStore = useOrganizationStore();
const { $supabase } = useNuxtApp();
// const assetStore = useAssetStore(); // Solo si lo necesitas para algo más, de lo contrario no es necesario aquí.


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
  // `sensorStore.recentSensors` ya devuelve los 5 más recientes de los filtrados,
  // y ahora esos objetos ya tendrán `assetName`.
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
      // Si lastReading no existe, intenta usar createdAt para ordenar
      const dateA = a.lastReading ? new Date(a.lastReading) : (a.createdAt ? new Date(a.createdAt) : new Date(0));
      const dateB = b.lastReading ? new Date(b.lastReading) : (b.createdAt ? new Date(b.createdAt) : new Date(0));
      return dateB - dateA;
    });
});

const realtimeSelectedSensorsForChart = computed(() => {
  // Asegúrate de que solo seleccionamos sensores que están en la vista filtrada actual
  const currentFilteredSensorIds = availableSensorsForSelection.value.map(s => s.id);
  return selectedSensorIds.value
    .filter(id => currentFilteredSensorIds.includes(id)) // Filtra los seleccionados para la gráfica si no están en la vista actual
    .map(id => {
      // Busca en `sensorStore.sensors` (todos los sensores cargados), que ya tienen assetName
      const sensorDetails = sensorStore.sensors.find(s => s.id === id); 
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
    // Asegurarse de que availableSensorsForSelection se recalcule con la nueva organización antes de usarse
    // No necesitamos un `await sensorStore.fetchSensors()` aquí porque `selectedOrganizationId`
    // es un filtro sobre `sensorStore.sensors` que ya debería estar poblado.
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

        // REVISAR: Cargar datos históricos para los porcentajes (si es necesario desde Supabase)
        // Esto es para calcular el cambio porcentual de los totales de sensores y organizaciones
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Ajustar el nombre de la tabla a 'sensors' (minúscula) y 'organizations'
        const { count: totalSensorsTwentyFourHoursAgo, error: errSensorsYesterday } = await $supabase
            .from('sensors') // Cambiado de 'Sensors' a 'sensors'
            .select('id', { count: 'exact' })
            .lt('created_at', twentyFourHoursAgo.toISOString()); // Asumiendo 'created_at' para la fecha de creación

        const { count: totalOrganizationsTwentyFourHoursAgo, error: errOrgsYesterday } = await $supabase
            .from('organizations') // Cambiado de 'Organizations' a 'organizations'
            .select('id', { count: 'exact' })
            .lt('created_at', twentyFourHoursAgo.toISOString()); // Asumiendo 'created_at' para la fecha de creación


        if (errSensorsYesterday) console.error("Error al obtener el total de sensores hace 24h:", errSensorsYesterday);
        if (errOrgsYesterday) console.error("Error al obtener el total de organizaciones hace 24h:", errOrgsYesterday);

        previousTotalSensors.value = totalSensorsTwentyFourHoursAgo || 0;
        previousTotalOrganizations.value = totalOrganizationsTwentyFourHoursAgo || 0;

        // Lógica para la selección inicial de sensores en el gráfico (tal como la tienes)
        if (selectedSensorIds.value.length === 0 && availableSensorsForSelection.value.length > 0) {
            selectedSensorIds.value = availableSensorsForSelection.value.map(s => s.id);
            console.log('Sensores iniciales seleccionados para la gráfica en onMounted:', selectedSensorIds.value);
        } else if (selectedSensorIds.value.length === 0) {
            console.log('No hay sensores activos disponibles para seleccionar en la carga inicial (onMounted).');
        }

        // --- SECCIÓN DE SUSCRIPCIONES REALTIME ---
        console.log('[Dashboard.vue - onMounted] Preparando para iniciar suscripciones de Realtime...');

        // 1. Suscripción para alertas
        alertStore.subscribeToAlertUpdates();
        console.log('--- alertStore.subscribeToAlertUpdates() ha sido llamada ---');

        // 2. Suscripción a cambios generales de sensores (status, last_communication, etc.)
        sensorStore.subscribeToSensorUpdates();
        console.log('--- sensorStore.subscribeToSensorUpdates() ha sido llamada ---');

        // 3. Suscripción para las lecturas recientes en las tarjetas de sensores
        sensorStore.subscribeToDashboardRecentReadings();
        console.log('--- sensorStore.subscribeToDashboardRecentReadings() ha sido llamada ---');

    } catch (error) {
        console.error("Error al cargar el dashboard:", error);
    } finally {
        loading.value = false;
    }
});

// --- onUnmounted hook ---
// Desuscribirse al desmontar el componente para evitar fugas de memoria
onUnmounted(async () => {
  console.log('[Dashboard.vue - onUnmounted] Desuscribiendo de los canales de Realtime...');
  await sensorStore.unsubscribeFromAllDashboardReadings(); // Desuscribe de las suscripciones individuales del gráfico
  await sensorStore.unsubscribeFromSensorUpdates();      // Desuscribe de los cambios generales de sensores
  await sensorStore.unsubscribeFromDashboardRecentReadings(); // Desuscribe de las lecturas recientes para StatCards
  await alertStore.unsubscribeFromAlertUpdates();         // Desuscribe de las alertas
});
</script>

<style scoped>
/* Tus estilos aquí */
</style>
