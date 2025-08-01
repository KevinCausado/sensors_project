<template>
  <div>
    <PageHeader title="Alertas" subtitle="Monitorear y gestionar alertas del sistema" />

    <!-- Tarjetas de Estadísticas -->
    <div class="grid grid-cols-1 gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total de Alertas" :value="totalAlerts" icon="alert" color="primary" />
      <StatCard title="Prioridad Alta" :value="highPriorityAlerts" icon="alert" color="error" />
      <StatCard title="Prioridad Media" :value="mediumPriorityAlerts" icon="alert" color="warning" />
      <StatCard title="Prioridad Baja" :value="lowPriorityAlerts" icon="alert" color="success" />
    </div>

    <!-- Filtros y Búsqueda -->
    <div class="card mb-6">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            class="form-input pl-10"
            placeholder="Buscar por título, activo..."
          />
          <Icon name="i-heroicons-magnifying-glass-20-solid" class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>

        <div class="flex gap-2 flex-wrap sm:flex-nowrap">
          <select v-model="filterPriority" class="form-select">
            <option value="">Todas las Prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <select v-model="filterStatus" class="form-select">
            <option value="">Todos los Estados</option>
            <option value="active">Activa</option>
            <option value="resolved">Resuelta</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Usamos el componente AlertList mejorado -->
    <AlertList :alerts="paginatedAlerts" :loading="isLoading" />
    
    <!-- Paginación -->
    <div v-if="!isLoading && paginatedAlerts.length > 0" class="mt-6">
      <Pagination
        :total-items="totalFilteredAlerts"
        :current-page="currentPage"
        :items-per-page="itemsPerPage"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useAlertStore } from '~/stores/alerts';
import { useOrganizationStore } from '~/stores/organizations';
import { useSensorStore } from '~/stores/sensors';
import { useAssetStore } from '~/stores/assets';
import PageHeader from '~/components/PageHeader.vue';
import Pagination from '~/components/Pagination.vue';
import StatCard from '~/components/StatCard.vue';
import AlertList from '~/components/AlertList.vue'; // Importamos el nuevo componente

definePageMeta({
  permission: 'alerts.ver',
});

// Stores
const alertStore = useAlertStore();
const organizationStore = useOrganizationStore();
const sensorStore = useSensorStore();
const assetStore = useAssetStore();

// Estado local
const searchQuery = ref('');
const filterPriority = ref('');
const filterStatus = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10);
const selectedOrganizationIdLocal = ref(null);

// --- Propiedades Computadas ---

const isLoading = computed(() => alertStore.isLoading || organizationStore.isLoading || sensorStore.isLoading || assetStore.isLoading);
const hasError = computed(() => alertStore.error || organizationStore.error || sensorStore.error || assetStore.error);

const alertsWithFullDetails = computed(() => {
  if (isLoading.value || hasError.value) return [];
  return alertStore.alerts.map(alert => {
    const sensor = sensorStore.sensors.find(s => s.id === alert.sensor_id);
    const asset = assetStore.assets.find(a => a.id === (alert.asset_id || sensor?.assetId));
    const organization = organizationStore.organizations.find(o => o.id === (alert.organization_id || sensor?.organization_id));
    return {
      ...alert,
      description: alert.description || alert.message || 'Sin descripción detallada.',
      sensorName: sensor?.name || 'Desconocido',
      assetName: asset?.name || 'N/A',
      organizationId: organization?.id,
      organizationName: organization?.name || 'Desconocida',
    };
  });
});

const filteredAlerts = computed(() => {
  let result = [...alertsWithFullDetails.value];

  if (selectedOrganizationIdLocal.value) {
    result = result.filter(alert => alert.organizationId === selectedOrganizationIdLocal.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(alert =>
      (alert.title?.toLowerCase().includes(query)) ||
      (alert.description?.toLowerCase().includes(query)) ||
      (alert.sensorName?.toLowerCase().includes(query)) ||
      (alert.assetName?.toLowerCase().includes(query))
    );
  }

  if (filterPriority.value) {
    result = result.filter(alert => alert.priority === filterPriority.value);
  }

  if (filterStatus.value) {
    result = result.filter(alert => alert.status === filterStatus.value);
  }

  return result.sort((a, b) => new Date(b.alert_time) - new Date(a.alert_time));
});

const paginatedAlerts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredAlerts.value.slice(start, end);
});

const totalFilteredAlerts = computed(() => filteredAlerts.value.length);
const totalAlerts = computed(() => filteredAlerts.value.length);
const highPriorityAlerts = computed(() => filteredAlerts.value.filter(a => a.priority === 'high').length);
const mediumPriorityAlerts = computed(() => filteredAlerts.value.filter(a => a.priority === 'medium').length);
const lowPriorityAlerts = computed(() => filteredAlerts.value.filter(a => a.priority === 'low').length);

// --- Watchers y Ciclo de Vida ---

watch([searchQuery, filterPriority, filterStatus, selectedOrganizationIdLocal], () => {
  currentPage.value = 1;
});

watch(() => organizationStore.selectedOrganizationId, (newValue) => {
  selectedOrganizationIdLocal.value = newValue;
  currentPage.value = 1;
});

onMounted(async () => {
  await Promise.all([
    assetStore.fetchAssets(),
    organizationStore.fetchOrganizations(),
    sensorStore.fetchSensors(),
    alertStore.fetchAlerts(),
  ]);
  selectedOrganizationIdLocal.value = organizationStore.selectedOrganizationId;
  alertStore.subscribeToAlertUpdates();
});

onUnmounted(() => {
  alertStore.unsubscribeFromAlertUpdates();
});

// --- Acciones ---

const handlePageChange = (page) => {
  currentPage.value = page;
};
</script>

<style scoped>
.card { @apply bg-white shadow-sm rounded-xl p-4 sm:p-6; }
.form-input { @apply block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm transition; }
.form-select {
  @apply block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm transition;
  -webkit-appearance: none; -moz-appearance: none; appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em;
}
</style>
