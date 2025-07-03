<template>
  <div>
    <PageHeader
      :title="`Estado del Activo: ${asset?.name || 'Cargando...'}`"
      :subtitle="`ID: ${asset?.id || 'N/A'}`"
    >
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink
            to="/asset-status"
            class="btn btn-secondary"
          >
            Volver a la Lista
          </NuxtLink>
        </div>
      </template>
    </PageHeader>

    <!-- INICIO DE LA MODIFICACIÓN: Las StatCards ahora recibirán datos correctos -->
    <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4 max-w-7xl mx-auto" v-if="!loading && asset">
      <StatCard title="Sensores del Activo" :value="totalSensorsForAsset" icon="sensor" color="primary" />
      <StatCard title="Sensores Activos" :value="activeSensorsForAsset" icon="sensor" color="success" />
      <StatCard title="En Mantenimiento" :value="maintenanceSensorsForAsset" icon="sensor" color="warning" />
      <StatCard title="Alertas Activas" :value="activeAlertsForCurrentAsset" icon="alert" color="error" />
    </div>
    <!-- FIN DE LA MODIFICACIÓN -->

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-600">Cargando detalles del activo...</p>
    </div>

    <div v-else-if="!asset" class="text-center py-8 text-gray-500">
      Activo no encontrado. Verifique el ID o si existen datos.
    </div>

    <!-- Contenedor principal para las tarjetas de detalle -->
    <div v-else class="max-w-7xl mx-auto space-y-6">

      <!-- TARJETA DE MONITOREO EN TIEMPO REAL -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Monitoreo en Tiempo Real</h3>
        
        <div class="mb-4 flex flex-wrap gap-2">
          <label v-for="sensor in availableSensorsForCharts"
                  :key="sensor.id"
                  class="inline-flex items-center cursor-pointer p-2 rounded-md transition-colors hover:bg-gray-100"
                  :class="{'bg-primary-50 text-primary-700': selectedSensorIds.includes(sensor.id)}">
            <input type="checkbox"
                    v-model="selectedSensorIds"
                    :value="sensor.id"
                    class="form-checkbox h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
            <span class="ml-2 text-sm font-medium">{{ sensor.name }} ({{ translateSensorType(sensor.type) }})</span>
            <span v-if="sensor.unit" class="ml-1 text-xs text-gray-500">({{ sensor.unit }})</span>
          </label>
          <p v-if="availableSensorsForCharts.length === 0 && !sensorStore.isLoading" class="text-sm text-gray-500">No hay sensores asociados o activos para monitorear en este activo.</p>
          <p v-if="sensorStore.isLoading" class="text-sm text-gray-500">Cargando sensores...</p>
        </div>

        <SensorChart
          v-if="realtimeSelectedSensorsForChart.length > 0"
          :sensors="realtimeSelectedSensorsForChart"
          :height="400"
          :show-time-range-controls="true"
          initial-empty-message="Seleccione uno o más sensores para ver su historial de lecturas."
          empty-data-message="No hay lecturas disponibles para los sensores seleccionados en el rango de tiempo actual."
        />
        <div v-else class="text-center py-8 text-gray-500">
          Seleccione los sensores que desea monitorear en la gráfica.
        </div>
      </div>

      <!-- TARJETA DE SENSORES ASOCIADOS (Realtime) -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Sensores Asociados ({{ sensorsForCurrentAsset?.length || 0 }})</h3>
        <div v-if="sensorsForCurrentAsset && sensorsForCurrentAsset.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Lectura</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="sensor in sensorsForCurrentAsset" :key="sensor.id">
                <td class="px-6 py-4 whitespace-nowrap">{{ sensor.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ translateSensorType(sensor.type) }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="`badge ${getSensorStatusBadgeClass(sensor.status)}`">
                    {{ translateStatus(sensor.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {{ sensor.last_value !== null ? sensor.last_value : "N/A" }}
                  <span v-if="sensor.last_unit">{{ sensor.last_unit }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center text-gray-500 py-4">No hay sensores asociados a este activo.</div>
      </div>

      <!-- TARJETA DE ALERTAS ASOCIADAS (Paginación y Realtime) -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Alertas Asociadas ({{ totalFilteredAlertsForAsset }})</h3>
        <div v-if="paginatedAlertsForCurrentAsset && paginatedAlertsForCurrentAsset.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensaje</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generada el</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="alert in paginatedAlertsForCurrentAsset" :key="alert.id">
                <td class="px-6 py-4 text-xs text-gray-600 align-top max-w-xs break-words">
                    {{ alert.description || 'N/A' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="`badge ${getAlertPriorityBadgeClass(alert.priority)}`">
                    {{ translatePriority(alert.priority) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="`badge ${getAlertStatusBadgeClass(alert.status)}`">
                    {{ translateStatus(alert.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(alert.alert_time) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center text-gray-500 py-4">No hay alertas asociadas a este activo.</div>
        
        <div class="mt-4" v-if="totalFilteredAlertsForAsset > alertsPerPage">
          <Pagination
            :total-items="totalFilteredAlertsForAsset"
            :current-page="currentAlertPage"
            :items-per-page="alertsPerPage"
            @page-change="handleAlertPageChange"
          />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAssetStore } from '~/stores/assets';
import { useSensorStore } from '~/stores/sensors';
import { useAlertStore } from '~/stores/alerts';
import PageHeader from '~/components/PageHeader.vue';
import SensorChart from '~/components/SensorChart.vue'; 
import Pagination from '~/components/Pagination.vue'; 
// ++ INICIO DE LA MODIFICACIÓN: Se importa el componente StatCard ++
import StatCard from '~/components/StatCard.vue';

// Inicialización
const route = useRoute();
const router = useRouter();
const assetStore = useAssetStore();
const sensorStore = useSensorStore();
const alertStore = useAlertStore();

// Estado reactivo
const loading = ref(true);
const asset = ref(null);
const selectedSensorIds = ref([]);
const currentAlertPage = ref(1);
const alertsPerPage = ref(5);

// Carga de datos del activo
const loadAssetData = async () => {
  const assetId = route.params.id;
  loading.value = true;
  try {
    const fetchedAsset = await assetStore.fetchAssetById(assetId);
    if (fetchedAsset) {
      asset.value = fetchedAsset;

      await sensorStore.fetchSensors();
      await alertStore.fetchAlerts();

      selectedSensorIds.value = availableSensorsForCharts.value.map(s => s.id);

      if (selectedSensorIds.value.length > 0) {
        sensorStore.subscribeToGraphReadings(selectedSensorIds.value);
      }
      alertStore.subscribeToAlertUpdates();
      sensorStore.subscribeToSensorUpdates();

    } else {
      router.push('/asset-status');
    }
  } catch (e) {
    console.error('Error al cargar los detalles del activo:', e);
    router.push('/asset-status');
  } finally {
    loading.value = false;
  }
};

// ++ INICIO DE LA MODIFICACIÓN: Propiedades computadas para las StatCards ++
const sensorsForCurrentAsset = computed(() => {
  if (!asset.value) return [];
  return sensorStore.sensors.filter(sensor => sensor.assetId === asset.value.id);
});

const totalSensorsForAsset = computed(() => sensorsForCurrentAsset.value.length);
const activeSensorsForAsset = computed(() => sensorsForCurrentAsset.value.filter(s => s.status === 'active').length);
const maintenanceSensorsForAsset = computed(() => sensorsForCurrentAsset.value.filter(s => s.status === 'maintenance').length);

const alertsForCurrentAsset = computed(() => {
  if (!asset.value) return [];
  const filtered = alertStore.alerts.filter(alert => alert.asset_id === asset.value.id);
  filtered.sort((a, b) => new Date(b.alert_time) - new Date(a.alert_time));
  return filtered;
});

const activeAlertsForCurrentAsset = computed(() => alertsForCurrentAsset.value.filter(a => a.status !== 'resolved').length);
// ++ FIN DE LA MODIFICACIÓN ++


const availableSensorsForCharts = computed(() => {
  return sensorsForCurrentAsset.value.filter(s => s.status === 'active' && s.last_communication);
});

const realtimeSelectedSensorsForChart = computed(() => {
  const selected = sensorsForCurrentAsset.value.filter(sensor => selectedSensorIds.value.includes(sensor.id));
  return selected.map(sensor => ({
    ...sensor,
    readings: sensorStore.getReadingsBySensorId(sensor.id), 
  }));
});

const paginatedAlertsForCurrentAsset = computed(() => {
  const start = (currentAlertPage.value - 1) * alertsPerPage.value;
  const end = start + alertsPerPage.value;
  return alertsForCurrentAsset.value.slice(start, end);
});

const totalFilteredAlertsForAsset = computed(() => alertsForCurrentAsset.value.length);

// Watcher para la selección de sensores
watch(selectedSensorIds, (newIds) => {
  sensorStore.unsubscribeFromAllGraphReadings(); 
  if (newIds.length > 0) {
    sensorStore.subscribeToGraphReadings(newIds);
  }
}, { deep: true });

// Manejo de paginación
const handleAlertPageChange = (page) => {
  currentAlertPage.value = page;
};

// Ciclo de vida del componente
onMounted(loadAssetData);

onUnmounted(() => {
  sensorStore.unsubscribeFromAllGraphReadings(); 
  alertStore.unsubscribeFromAlertUpdates();
  sensorStore.unsubscribeFromSensorUpdates(); 
});

// Funciones de utilidad (traducciones y clases de badge)
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString("es-ES");
};

const translateSensorType = (type) => ({ temperature: "Temperatura", humidity: "Humedad", vibration: "Vibración", pressure: "Presión", other: "Otro" })[type] || type;
const translateStatus = (status) => ({ active: "Activo", inactive: "Inactivo", maintenance: "Mantenimiento", error: "Error", new: "Nueva", acknowledged: "Reconocida", resolved: "Resuelta" })[status] || status;
const translatePriority = (priority) => ({ high: "Alta", medium: "Media", low: "Baja" })[priority] || priority;

const getSensorStatusBadgeClass = (status) => ({ active: "badge-success", inactive: "badge-danger", maintenance: "badge-warning", error: "badge-error" })[status] || "badge-light";
const getAlertPriorityBadgeClass = (priority) => ({ high: "badge-danger", medium: "badge-warning", low: "badge-info" })[priority] || "badge-light";
const getAlertStatusBadgeClass = (status) => ({ new: "badge-danger", acknowledged: "badge-warning", resolved: "badge-success" })[status] || "badge-light";

</script>

<style scoped>
.btn-secondary {
    @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
}
.card {
    @apply bg-white shadow-md rounded-lg;
}
.badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
.badge-success { @apply bg-green-100 text-green-800; }
.badge-danger { @apply bg-red-100 text-red-800; }
.badge-info { @apply bg-blue-100 text-blue-800; }
.badge-warning { @apply bg-yellow-100 text-yellow-800; }
.badge-light { @apply bg-gray-50 text-gray-500; }
.form-checkbox {
    @apply h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500;
}
</style>
