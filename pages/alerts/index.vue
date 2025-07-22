<template>
  <div>
    <PageHeader title="Alertas" subtitle="Monitorear y gestionar alertas del sistema" />

    <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4">
      <StatCard
        title="Total de Alertas"
        :value="totalAlerts"
        icon="alert"
        color="primary"
      />

      <StatCard
        title="Prioridad Alta"
        :value="highPriorityAlerts"
        icon="alert"
        color="error"
      />

      <StatCard
        title="Prioridad Media"
        :value="mediumPriorityAlerts"
        icon="alert"
        color="warning"
      />

      <StatCard
        title="Prioridad Baja"
        :value="lowPriorityAlerts"
        icon="alert"
        color="success"
      />
    </div>

    <div class="card">
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            class="form-input pl-9"
            placeholder="Buscar alertas..."
          />
          <SearchIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <div class="flex gap-2 flex-wrap sm:flex-nowrap">
          <!-- Filtro por Prioridad -->
          <select v-model="filterPriority" class="form-select">
            <option value="">Todas las Prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>

          <!-- Filtro por Estado -->
          <select v-model="filterStatus" class="form-select">
            <option value="">Todos los Estados</option>            
            <option value="active">Activa</option>
            <option value="resolved">Resuelta</option>
          </select>       
        </div>
      </div>

      <!-- Lista de Alertas -->
      <div class="space-y-3">
        <div v-if="alertStore.isLoading || organizationStore.isLoading || sensorStore.isLoading" class="text-center py-8 text-gray-500">
          Cargando datos...
        </div>
        <div v-else-if="alertStore.error || organizationStore.error || sensorStore.error" class="text-center py-8 text-error-600">
          Error: {{ alertStore.error || organizationStore.error || sensorStore.error }}
        </div>
        <div v-else-if="paginatedAlerts.length === 0" class="text-center py-8 text-gray-500">
          No se encontraron alertas.
        </div>       
        <TransitionGroup v-else name="fade">
          <div v-for="alert in paginatedAlerts" :key="alert.id" 
               class="relative flex flex-col p-3 rounded-md border 
                      transition-all hover:shadow-sm" 
               :class="getAlertBgClass(alert.priority)">
            
            <!-- Botón de Acción/Estado (Arriba a la derecha) -->
            <PermissionGuard moduleId="alerts" permission="resolve">
              <div class="absolute top-3 right-3 z-10">
                <button v-if="alert.status === 'active'" 
                        @click="handleResolveAlert(alert.id)" 
                        class="text-xs text-primary-600 hover:text-primary-500 font-semibold transition-colors duration-200">
                  Resolver
                </button>
                <span v-else class="text-xs text-success-600 font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.535-1.28-1.28a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.135-.082l3.75-5.25Z" clip-rule="evenodd" /></svg>
                  Resuelta
                </span>
              </div>
            </PermissionGuard>

            <div class="flex items-start mb-2 pr-16 sm:pr-24"> 
              <div :class="getAlertIconClass(alert.priority)" 
                   class="flex-shrink-0 rounded-full p-2 
                          flex items-center justify-center shadow-sm">
                <component :is="getAlertIcon(alert.type)" class="h-5 w-5" />
              </div>

              <div class="ml-3 flex-1 min-w-0">
                <p class="text-base font-semibold text-gray-900 truncate">{{ alert.title }}</p>
                <!-- DESCRIPCIÓN: Letra más pequeña (text-xs) -->
                <p class="text-xs text-gray-600 mt-1 line-clamp-2">{{ alert.description }}</p>
              </div>
            </div>

            <!-- Detalles adicionales y badges -->
            <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div class="flex flex-wrap gap-1">
                <span class="badge" :class="getAlertBadgeClass(alert.priority)">
                  {{ translatePriority(alert.priority) }}
                </span>
                <span class="badge badge-secondary">
                  Sensor: {{ alert.sensorName || "Desconocido" }}
                </span>
                <span class="badge badge-secondary">
                  Organización: {{ alert.organizationName || "Desconocida" }}
                </span>         
                <NuxtLink 
                  v-if="alert.assetName && alert.assetName !== 'N/A' && alert.asset_id" 
                  :to="`/asset-status/${alert.asset_id}`"
                  class="badge asset-link-badge border border-transparent transition-colors duration-200 flex items-center group cursor-pointer">
                  Activo: {{ alert.assetName }}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </NuxtLink>
              </div>
              <span class="text-gray-500 flex-shrink-0">Generada {{ formatTimeAgo(alert.alert_time) }}</span>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <div class="mt-4">
        <Pagination
          :total-items="totalFilteredAlerts"
          :current-page="currentPage"
          :items-per-page="itemsPerPage"
          @page-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h, watch, onUnmounted } from 'vue';
import { useAlertStore } from '~/stores/alerts';
import { useOrganizationStore } from '~/stores/organizations';
import { useSensorStore } from '~/stores/sensors';
import { useAssetStore } from '~/stores/assets'; 
import PageHeader from '~/components/PageHeader.vue';
import Pagination from '~/components/Pagination.vue'; 
import PermissionGuard from "~/components/PermissionGuard.vue";
import StatCard from '~/components/StatCard.vue';
import { ExclamationTriangleIcon, ExclamationCircleIcon, InformationCircleIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';


const SearchIcon = defineComponent({
  render: () => h('svg', { class: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    h('path', { d: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-8 8a10 10 0 1 1 17.32 5.92l4.68 4.68a1 1 0 0 1-1.42 1.42l-4.68-4.68A10 10 0 0 1 2 10z' })
  ])
});

const getAlertIcon = (type) => {
  switch (type) {
    case "threshold":
      return ExclamationTriangleIcon; 
    case "status_change":
      return ArrowPathIcon; 
    case "data_issue":
      return ExclamationTriangleIcon; 
    case "error":
      return ExclamationCircleIcon; 
    default:
      return InformationCircleIcon; 
  }
};


definePageMeta({
  permission: 'alerts.ver',
});

// Stores
const alertStore = useAlertStore();
const organizationStore = useOrganizationStore();
const sensorStore = useSensorStore();
const assetStore = useAssetStore(); 

// Estado local para los filtros
const searchQuery = ref('');
const filterPriority = ref('');
const filterStatus = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10);
const selectedOrganizationIdLocal = ref(null); 

// --- Computed Properties ---

const organizations = computed(() => organizationStore.organizations);
const sensors = computed(() => sensorStore.sensors);
const assets = computed(() => assetStore.assets);

// Alertas con información de sensor, activo y organización enriquecida
const alertsWithFullDetails = computed(() => {  
  return alertStore.alerts.map(alert => {
    let sensorName = 'Sensor Desconocido';
    let organizationName = 'Organización Desconocida';
    let assetName = 'Activo Desconocido';
    let organizationIdForAlert = null; 

    const sensor = sensors.value.find(s => s.id === alert.sensor_id);
    if (sensor) {
      sensorName = sensor.name;
      organizationIdForAlert = sensor.organization_id; 
    }
    
    const effectiveAssetId = alert.asset_id || sensor?.assetId; 
    const asset = assets.value.find(a => a.id === effectiveAssetId);
    if (asset) {
      assetName = asset.name;
    }

    const finalOrgIdToLookup = alert.organization_id || organizationIdForAlert;

    if (finalOrgIdToLookup) {
      const org = organizations.value.find(o => o.id === finalOrgIdToLookup);
      organizationName = org ? org.name : 'Organización Desconocida';
    }

    return {
      ...alert,
      description: alert.description || alert.message,
      sensorName: sensorName,
      assetName: assetName, 
      organizationId: finalOrgIdToLookup, 
      organizationName: organizationName,
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
      (alert.title && alert.title.toLowerCase().includes(query)) ||
      (alert.description && alert.description.toLowerCase().includes(query)) ||
      (alert.sensorName && alert.sensorName.toLowerCase().includes(query)) ||
      (alert.assetName && alert.assetName.toLowerCase().includes(query)) ||
      (alert.organizationName && alert.organizationName.toLowerCase().includes(query))
    );
  }

  if (filterPriority.value) {
    result = result.filter(alert => alert.priority === filterPriority.value);
  }

  if (filterStatus.value) {
    if (filterStatus.value === 'active') {
      result = result.filter(alert => alert.status === 'active');
    } else {
      result = result.filter(alert => alert.status === filterStatus.value);
    }
  }

  result.sort((a, b) => new Date(b.alert_time) - new Date(a.alert_time));

  return result;
});

const paginatedAlerts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredAlerts.value.slice(start, end);
});

const totalAlerts = computed(() => filteredAlerts.value.length);
const highPriorityAlerts = computed(() => filteredAlerts.value.filter(a => a.priority === 'high').length);
const mediumPriorityAlerts = computed(() => filteredAlerts.value.filter(a => a.priority === 'medium').length);
const lowPriorityAlerts = computed(() => filteredAlerts.value.filter(a => a.priority === 'low').length);
const totalFilteredAlerts = computed(() => filteredAlerts.value.length); 


const handlePageChange = (page) => {
  currentPage.value = page;
};

// --- Watchers ---
watch([searchQuery, filterPriority, filterStatus, selectedOrganizationIdLocal], () => {
  currentPage.value = 1;
});

watch(() => organizationStore.selectedOrganizationId, (newValue) => {
  selectedOrganizationIdLocal.value = newValue; 
  currentPage.value = 1; 
});

// --- Funciones Auxiliares para la UI (movidas de AlertList) ---

const getAlertIconClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700"; 
    case "medium":
      return "bg-yellow-100 text-yellow-700"; 
    case "low":
      return "bg-green-100 text-green-700"; 
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getAlertBgClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-red-50 border-red-200"; 
    case "medium":
      return "bg-yellow-50 border-yellow-200"; 
    case "low":
      return "bg-green-50 border-green-200"; 
    default:
      return "bg-white border-gray-200";
  }
};

const getAlertBadgeClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-red-200 text-red-800 font-semibold"; 
    case "medium":
      return "bg-yellow-200 text-yellow-800 font-semibold"; 
    case "low":
      return "bg-green-200 text-green-800 font-semibold"; 
    default:
      return "bg-gray-200 text-gray-800 font-semibold";
  }
};

const translatePriority = (priority) => {
  switch (priority) {
    case "high":
      return "Prioridad: Alta";
    case "medium":
      return "Prioridad: Media"; 
    case "low":
      return "Prioridad: Baja";
    default:
      return "Prioridad: Desconocida"; 
  }
};

/**
 * Formats a date to a "time ago" string.
 * @param {string} createdAt - The creation date of the alert (ISO string).
 * @returns {string} The formatted string.
 */
const formatTimeAgo = (createdAt) => {
  if (!createdAt) return "Fecha desconocida";
  const date = new Date(createdAt);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = [
    { label: "segundo", seconds: 1 },
    { label: "minuto", seconds: 60 },
    { label: "hora", seconds: 3600 },
    { label: "día", seconds: 86400 },
    { label: "semana", seconds: 604800 },
    { label: "mes", seconds: 2592000 }, 
    { label: "año", seconds: 31536000 }, 
  ];

  for (let i = intervals.length - 1; i >= 0; i--) {
    const interval = intervals[i];
    if (seconds >= interval.seconds) {
      const value = Math.floor(seconds / interval.seconds);
      if (interval.label === "segundo" && value < 5) return "hace un instante";
      return `hace ${value} ${interval.label}${value > 1 ? (interval.label === "mes" ? "es" : "s") : ""}`;
    }
  }
  return "justo ahora"; 
};

/**
 * Llama a la acción de la store para resolver una alerta.
 * @param {string} alertId - El ID de la alerta a resolver.
 */
const handleResolveAlert = async (alertId) => {
  await alertStore.resolveAlert(alertId);
};


// --- Lifecycle Hook ---
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
</script>

<style scoped>
.card {
  @apply bg-white shadow rounded-lg p-6;
}
.form-input {
  @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
}
.btn {
  @apply inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm transition-colors;
}
.btn-success { @apply bg-green-600 text-white hover:bg-green-700; }
.btn-error { @apply bg-red-600 text-white hover:bg-red-700; }

.badge {
  @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium;
  white-space: nowrap;
}
.badge-secondary { @apply bg-gray-100 text-gray-700; }
.bg-red-50 { background-color: #FEF2F2; }
.bg-yellow-50 { background-color: #FFFBEB; }
.bg-green-50 { background-color: #F0FDF4; }
.border-red-200 { border-color: #FECACA; }
.border-yellow-200 { border-color: #FDE68A; }
.border-green-200 { border-color: #BBF7D0; }
.bg-red-100 { background-color: #FEE2E2; }
.bg-yellow-100 { background-color: #FEF3C7; }
.bg-green-100 { background-color: #DCFCE7; }
.text-red-700 { color: #B91C1C; }
.text-yellow-700 { color: #B45309; }
.text-green-700 { color: #047857; }
.bg-red-200 { background-color: #FECACA; }
.text-red-800 { color: #991B1B; }
.bg-yellow-200 { background-color: #FDE68A; }
.text-yellow-800 { color: #92400E; }
.bg-green-200 { background-color: #BBF7D0; }
.text-green-800 { color: #065F46; }
.bg-gray-100 { background-color: #F3F4F6; }
.text-gray-700 { color: #374151; }
.text-gray-800 { color: #1F2937; }
.text-error-600 { @apply text-red-600; }
.text-success-600 { @apply text-green-600; }


.form-select {
  @apply block pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
}

/* Estilos para la transición de entrada/salida de elementos */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Estilos de badges personalizados (si no se cubren completamente con Tailwind) */
.badge {
  @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium;
  white-space: nowrap; /* Evita que los badges se dividan en varias líneas */
}

.badge-secondary {
  @apply bg-gray-100 text-gray-700;
}

.asset-link-badge {
  @apply bg-gray-100 text-gray-700; /* Estilos base */
  @apply hover:bg-blue-600 hover:text-white; /* Estilos al pasar el mouse */
}
</style>
