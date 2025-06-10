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
          <select v-model="filterPriority" class="form-input py-2 text-sm w-full sm:w-auto">
            <option value="">Todas las Prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>

          <!-- Filtro por Estado -->
          <select v-model="filterStatus" class="form-input py-2 text-sm w-full sm:w-auto">
            <option value="">Todos los Estados</option>
            
            <option value="active">Activa</option>
            <option value="resolved">Resuelta</option>
          </select>

          <!-- Filtro por Organización -->
          <select v-model="selectedOrganizationIdLocal" class="form-input py-2 text-sm w-full sm:w-auto">
            <option :value="null">Todas las Organizaciones</option>
            <option v-for="org in organizations" :key="org.id" :value="org.id">
              {{ org.name }}
            </option>
          </select>
        </div>
      </div>

     
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
        <!-- INICIO DE LA ESTRUCTURA DE ALERTA INDIVIDUAL (COPIADA DE AlertList.vue) -->
        <div v-else v-for="alert in paginatedAlerts" :key="alert.id"
             class="relative flex flex-col p-3 rounded-md border
                    transition-all hover:shadow-sm"
             :class="getAlertBgClass(alert.priority)">

          <!-- Botón de Acción/Estado (Arriba a la derecha) -->
          <PermissionGuard moduleId="alerts" permission="resolve">
            <div class="absolute top-3 right-3 z-10">
           
             <button v-if="alert.status !== 'resolved'"
                      @click="handleResolveAlert(alert.id)"
                      class="text-xs text-blue-600 hover:text-blue-500 font-semibold transition-colors duration-200 block">
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
              <p class="text-xs text-gray-600 mt-1">{{ alert.description }}</p>
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
              <span v-if="alert.assetName && alert.assetName !== 'Activo Desconocido'" class="badge badge-secondary">
                Activo: {{ alert.assetName }}
              </span>
            </div>
            <span class="text-gray-500 flex-shrink-0">Generada {{ formatTimeAgo(alert.alert_time) }}</span>
          </div>
        </div>
        <!-- FIN DE LA ESTRUCTURA DE ALERTA INDIVIDUAL -->
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
import PermissionGuard from "~/components/PermissionGuard.vue"; // Importar PermissionGuard

// Importar los iconos de Heroicons que usa AlertList.vue
import {
  ExclamationTriangleIcon, // Para tipo "threshold" o "data_issue"
  ExclamationCircleIcon,   // Para tipo "error"
  InformationCircleIcon,   // Para tipo por defecto
  ArrowPathIcon,           // Para tipo "status_change"
  MagnifyingGlassIcon as SearchIconRaw // Para el icono de búsqueda en el input
} from '@heroicons/vue/24/outline'; // Asegúrate de que esta ruta es correcta para tu proyecto

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
const confirmingAction = ref(null); // Para deshabilitar botones durante la acción

// --- Computed Properties ---

const organizations = computed(() => organizationStore.organizations);
const sensors = computed(() => sensorStore.sensors);
const assets = computed(() => assetStore.assets);

// Alertas con información de sensor, activo y organización enriquecida
const alertsWithFullDetails = computed(() => {
  console.log('[Alerts Page] alertsWithFullDetails - Recalculando...');
  console.log(`  - alertStore.alerts: ${alertStore.alerts.length}`);
  console.log(`  - sensorStore.sensors: ${sensorStore.sensors.length}`);
  console.log(`  - organizationStore.organizations: ${organizationStore.organizations.length}`);
  console.log(`  - assetStore.assets: ${assetStore.assets.length}`);

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

    const effectiveAssetId = alert.asset_id || sensor?.asset_id; 
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
      // Mapear alert.message a alert.description para consistencia con AlertList.vue
      // Asumiendo que 'message' en AlertPage original era lo que AlertList.vue llama 'description'
      description: alert.description || alert.message, // Usa 'description' si existe, si no 'message'
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

  // Filtrar por estado. Aseguramos que 'active' en el filtro muestre 'new' y 'acknowledged'
  if (filterStatus.value) {
    if (filterStatus.value === 'active') {
      result = result.filter(alert => alert.status === 'active');
    } else {
      result = result.filter(alert => alert.status === filterStatus.value);
    }
  }

  result.sort((a, b) => new Date(b.alert_time) - new Date(a.alert_time));

  console.log('[Alerts Page] filteredAlerts - Cantidad:', result.length);
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

const startIndex = computed(() => {
  if (totalFilteredAlerts.value === 0) return 0;
  return (currentPage.value - 1) * itemsPerPage.value + 1;
});

const endIndex = computed(() => {
  const end = currentPage.value * itemsPerPage.value;
  return Math.min(end, totalFilteredAlerts.value);
});


// --- Métodos de Ayuda para Estilos e Íconos (COPIADOS DE AlertList.vue) ---

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

const getAlertIconClass = (priority) => {
  switch (priority) {
    case "high": return "bg-red-100 text-red-700"; 
    case "medium": return "bg-yellow-100 text-yellow-700"; 
    case "low": return "bg-green-100 text-green-700"; 
    default: return "bg-gray-100 text-gray-700";
  }
};

const getAlertBgClass = (priority) => {
  switch (priority) {
    case "high": return "bg-red-50 border-red-200"; 
    case "medium": return "bg-yellow-50 border-yellow-200"; 
    case "low": return "bg-green-50 border-green-200"; 
    default: return "bg-white border-gray-200";
  }
};

const getAlertBadgeClass = (priority) => {
  switch (priority) {
    case "high": return "bg-red-200 text-red-800 font-semibold"; 
    case "medium": return "bg-yellow-200 text-yellow-800 font-semibold"; 
    case "low": return "bg-green-200 text-green-800 font-semibold"; 
    default: return "bg-gray-200 text-gray-800 font-semibold";
  }
};

const translatePriority = (priority) => {
  switch (priority) {
    case "high": return "Prioridad: Alta";
    case "medium": return "Prioridad: Media"; 
    case "low": return "Prioridad: Baja";
    default: return "Prioridad: Desconocida"; 
  }
};

// Se mantiene el formato de tiempo de AlertList.vue
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


// Funciones para los badges de estado
const getAlertStatusBadgeClass = (status) => {
  switch (status) {
    case "active": return "bg-red-100 text-red-800";     
    case "resolved": return "bg-green-100 text-green-800"; 
    default: return "bg-gray-100 text-gray-800";
  }
};

const translateAlertStatus = (status) => {
  const statuses = {
    active: "Activa",
    resolved: "Resuelta",
  };
  return statuses[status] || status;
};

// Íconos auxiliares para detalles (como en AlertList.vue)
const AssetIcon = defineComponent({
  components: { FactoryIcon: ExclamationTriangleIcon }, // Usamos un icono genérico de Heroicons como placeholder
  template: `<FactoryIcon class="h-4 w-4" />`
});
const SensorIcon = defineComponent({
  components: { RadarIcon: ExclamationTriangleIcon }, // Usamos un icono genérico de Heroicons como placeholder
  template: `<RadarIcon class="h-4 w-4" />`
});
const OrganizationIcon = defineComponent({
  components: { UsersIcon: ExclamationTriangleIcon }, // Usamos un icono genérico de Heroicons como placeholder
  template: `<UsersIcon class="h-4 w-4" />`
});
const SearchIcon = SearchIconRaw; // Asignamos directamente el icono de búsqueda


// --- Manejadores de Acciones ---

const handleAcknowledgeAlert = async (alertId) => {
  confirmingAction.value = alertId;
  try {
    // Aquí puedes llamar a la acción de tu store si tienes una para "reconocer"
    // alertStore.acknowledgeAlert(alertId); // Asume que esta acción existe en tu store
    console.log(`[Alerts Page] Alerta ${alertId} reconocida.`);
    // Simulación: Actualiza el estado local para ver el cambio inmediato si no usas realtime para acknowledge
    const index = alertStore.alerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      alertStore.alerts[index].status = 'acknowledged';
    }
  } catch (error) {
    console.error(`[Alerts Page] Error al reconocer alerta ${alertId}:`, error);
  } finally {
    confirmingAction.value = null;
  }
};

const handleResolveAlert = async (alertId) => {
  confirmingAction.value = alertId;
  try {
    await alertStore.resolveAlert(alertId); // Esto llama a la acción de tu store
    console.log(`[Alerts Page] Alerta ${alertId} resuelta.`);
  } catch (error) {
    console.error(`[Alerts Page] Error al resolver alerta ${alertId}:`, error);
  } finally {
    confirmingAction.value = null;
  }
};

const handlePageChange = (page) => {
  currentPage.value = page;
};

// --- Watchers ---
watch([searchQuery, filterPriority, filterStatus, selectedOrganizationIdLocal], () => {
  currentPage.value = 1;
});

watch(() => organizationStore.selectedOrganizationId, (newValue) => {
  console.log(`[Alerts Module] organizationStore.selectedOrganizationId cambió a: ${newValue}`);
  selectedOrganizationIdLocal.value = newValue; 
  currentPage.value = 1; 
});

// --- Lifecycle Hook ---
onMounted(async () => {
  console.log('[Alerts Page] onMounted - Iniciando carga de datos.');
  await Promise.all([
    assetStore.fetchAssets(), 
    organizationStore.fetchOrganizations(), 
    sensorStore.fetchSensors(), 
    alertStore.fetchAlerts(), 
  ]);

  selectedOrganizationIdLocal.value = organizationStore.selectedOrganizationId;
  console.log(`[Alerts Module] Initializing with organizationStore.selectedOrganizationId: ${organizationStore.selectedOrganizationId}`);

  alertStore.subscribeToAlertUpdates();
  console.log('[Alerts Page] Suscrito a actualizaciones de alertas en tiempo real.');
});

onUnmounted(() => {
  console.log('[Alerts Page] onUnmounted - Desuscribiendo de los canales de Realtime.');
  alertStore.unsubscribeFromAlertUpdates();
});
</script>

<style scoped>
/* Estilos COPIADOS/ADAPTADOS de AlertList.vue y otros para consistencia */
.card {
  @apply bg-white shadow rounded-lg p-6;
}
.form-input, .form-select {
  @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500;
}
.btn {
  @apply inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm transition-colors;
}
.btn-success {
  @apply bg-green-600 text-white hover:bg-green-700;
}
.btn-warning { /* Aunque no se usa directamente un btn-warning, las clases de color de prioridad sí. */
  @apply bg-yellow-500 text-white hover:bg-yellow-600;
}
.btn-error {
  @apply bg-red-600 text-white hover:bg-red-700;
}

/* Estilos de badges personalizados (copiados de AlertList.vue) */
.badge {
  @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium;
  white-space: nowrap; /* Evita que los badges se dividan en varias líneas */
}
.badge-secondary {
  @apply bg-gray-100 text-gray-700;
}

/* Colores de fondo y borde para las alertas (copiados de AlertList.vue) */
.bg-red-50 { background-color: #FEF2F2; }
.bg-yellow-50 { background-color: #FFFBEB; }
.bg-green-50 { background-color: #F0FDF4; }

.border-red-200 { border-color: #FECACA; }
.border-yellow-200 { border-color: #FDE68A; }
.border-green-200 { border-color: #BBF7D0; }

/* Colores de íconos y texto de prioridad (copiados de AlertList.vue) */
.bg-red-100 { background-color: #FEE2E2; }
.bg-yellow-100 { background-color: #FEF3C7; }
.bg-green-100 { background-color: #DCFCE7; }

.text-red-700 { color: #B91C1C; }
.text-yellow-700 { color: #B45309; }
.text-green-700 { color: #047857; }

/* Colores de badge de prioridad (copiados de AlertList.vue) */
.bg-red-200 { background-color: #FECACA; }
.text-red-800 { color: #991B1B; }

.bg-yellow-200 { background-color: #FDE68A; }
.text-yellow-800 { color: #92400E; }

.bg-green-200 { background-color: #BBF7D0; }
.text-green-800 { color: #065F46; }

.bg-gray-100 { background-color: #F3F4F6; }
.text-gray-700 { color: #374151; }
.text-gray-800 { color: #1F2937; }


/* Clases generales (mantener si no están en tus estilos globales de Tailwind) */
.text-error-600 { @apply text-red-600; }
.text-success-600 { @apply text-green-600; }
</style>
