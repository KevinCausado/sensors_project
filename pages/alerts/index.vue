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

        <div class="flex gap-2">
         

          <select v-model="filterPriority" class="form-input py-2 text-sm">
            <option value="">Todas las Prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>

          <select v-model="filterStatus" class="form-input py-2 text-sm">
            <option value="">Todos los Estados</option>
            <option value="active">Activa</option>
            <option value="resolved">Resuelta</option>
          </select>
        </div>
      </div>

      <div class="space-y-4">
        <div v-if="alertStore.isLoading || organizationStore.isLoading || sensorStore.isLoading" class="text-center py-8 text-gray-500">
          Cargando datos...
        </div>
        <div v-else-if="alertStore.error || organizationStore.error || sensorStore.error" class="text-center py-8 text-error-600">
          Error: {{ alertStore.error || organizationStore.error || sensorStore.error }}
        </div>
        <div v-else-if="paginatedAlerts.length === 0" class="text-center py-8 text-gray-500">
          No se encontraron alertas.
        </div>
        <div
          v-else
          v-for="alert in paginatedAlerts"
          :key="alert.id"
          class="p-4 rounded-lg border"
          :class="getAlertBorderClass(alert.priority)"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-4">
              <div :class="getAlertIconClass(alert.priority)" class="p-2 rounded-full">
                <AlertIcon class="h-5 w-5" />
              </div>

              <div>
                <h3 class="text-sm font-medium text-gray-900">{{ alert.title }}</h3>
                <p class="mt-1 text-sm text-gray-500">{{ alert.message }}</p>
                <div class="mt-2 flex items-center space-x-4">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getAlertBadgeClass(alert.priority)"
                  >
                    {{ translatePriority(alert.priority) }}
                  </span>
                  <span class="text-xs text-gray-500">
                    {{ formatDate(alert.createdAt) }}
                  </span>
                  <span v-if="alert.sensorName" class="text-xs text-gray-500">
                    Sensor: {{ alert.sensorName }}
                  </span>
                  <span v-if="alert.organizationName" class="text-xs text-gray-500">
                    Organización: {{ alert.organizationName }}
                  </span>
                </div>
              </div>
            </div>

            <button
              v-if="alert.status === 'active'"
              @click="resolveAlert(alert.id)"
              class="text-sm text-primary-600 hover:text-primary-500"
            >
              Resolver
            </button>
            <span v-else class="text-sm text-success-600"> Resuelta </span>
          </div>
        </div>
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
import { ref, computed, onMounted, defineComponent, h, watch } from 'vue';
import { useAlertStore } from '~/stores/alerts';
import { useOrganizationStore } from '~/stores/organizations'; // Importa el store de organizaciones
import { useSensorStore } from '~/stores/sensors'; // Importa el store de sensores

// Icons (placeholders)
const SearchIcon = defineComponent({
  render: () => h('div', { class: 'i-heroicons-magnifying-glass' })
});
const AlertIcon = defineComponent({
  render: () => h('div', { class: 'i-heroicons-exclamation-triangle' })
});

definePageMeta({
  // middleware: ['auth'], // Asegúrate de que tu middleware de autenticación esté activo si es necesario
  permission: 'alerts.ver', // Permiso para ver las alertas
});

// Stores
const alertStore = useAlertStore();
const organizationStore = useOrganizationStore();
const sensorStore = useSensorStore();

// Estado local para los filtros
const searchQuery = ref('');
const filterPriority = ref('');
const filterStatus = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10); // Puedes ajustar esto según tus necesidades
const selectedOrganizationIdLocal = ref(null); // Estado local para el filtro de organización

// --- Computed Properties ---

// Listado de todas las organizaciones para el select
const organizations = computed(() => organizationStore.organizations);

// Listado de todos los sensores (sin filtrar por organización aún aquí)
// Necesitamos los sensores para mapear su organización a las alertas
const sensors = computed(() => sensorStore.sensors);

// Alertas con información de sensor y organización (si aplica)
const alertsWithSensorAndOrg = computed(() => {
  return alertStore.alerts.map(alert => {
    const sensor = sensors.value.find(s => s.id === alert.sensorId);
    let organizationName = null;
    if (sensor && sensor.organizationId) {
      const org = organizations.value.find(o => o.id === sensor.organizationId);
      organizationName = org ? org.name : 'Desconocida';
    }
    return {
      ...alert,
      sensorName: sensor ? sensor.name : 'Desconocido',
      organizationId: sensor ? sensor.organizationId : null, // Agregamos organizationId a la alerta
      organizationName: organizationName,
    };
  });
});

// Alertas filtradas por organización, búsqueda y filtros de prioridad/estado
const filteredAlerts = computed(() => {
  let result = [...alertsWithSensorAndOrg.value];

  // 1. Filtrar por organización (si se ha seleccionado una)
  if (selectedOrganizationIdLocal.value) {
    result = result.filter(alert => alert.organizationId === selectedOrganizationIdLocal.value);
  }

  // 2. Filtrar por búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(alert =>
      alert.title.toLowerCase().includes(query) ||
      alert.message.toLowerCase().includes(query) ||
      (alert.sensorName && alert.sensorName.toLowerCase().includes(query)) ||
      (alert.organizationName && alert.organizationName.toLowerCase().includes(query))
    );
  }

  // 3. Filtrar por prioridad
  if (filterPriority.value) {
    result = result.filter(alert => alert.priority === filterPriority.value);
  }

  // 4. Filtrar por estado
  if (filterStatus.value) {
    result = result.filter(alert => alert.status === filterStatus.value);
  }

  return result;
});

// Paginación
const paginatedAlerts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredAlerts.value.slice(start, end);
});

// Contadores de estadísticas (ahora basados en las alertas FILTRADAS POR ORGANIZACIÓN si aplica)
// NOTA: Si quieres que estas estadísticas SIEMPRE muestren el total sin importar el filtro de organización
// entonces deberías usar `alertsWithSensorAndOrg.value.length` en lugar de `filteredAlerts.value.length`
// para la base de los cálculos. Para este caso, lo dejaré basado en `filteredAlerts`
// para que refleje lo que se ve en la tabla.
const totalAlerts = computed(() => filteredAlerts.value.length);
const highPriorityAlerts = computed(() => filteredAlerts.value.filter(a => a.priority === 'high').length);
const mediumPriorityAlerts = computed(() => filteredAlerts.value.filter(a => a.priority === 'medium').length);
const lowPriorityAlerts = computed(() => filteredAlerts.value.filter(a => a.priority === 'low').length);
const totalFilteredAlerts = computed(() => filteredAlerts.value.length); // Total de alertas después de aplicar todos los filtros

// --- Métodos ---
const getAlertBorderClass = (priority) => {
  switch (priority) {
    case 'high': return 'border-error-200 bg-error-50';
    case 'medium': return 'border-warning-200 bg-warning-50';
    case 'low': return 'border-success-200 bg-success-50';
    default: return 'border-gray-200';
  }
};

const getAlertIconClass = (priority) => {
  switch (priority) {
    case 'high': return 'bg-error-100 text-error-600';
    case 'medium': return 'bg-warning-100 text-warning-600';
    case 'low': return 'bg-success-100 text-success-600';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const getAlertBadgeClass = (priority) => {
  switch (priority) {
    case 'high': return 'bg-error-100 text-error-800';
    case 'medium': return 'bg-warning-100 text-warning-800';
    case 'low': return 'bg-success-100 text-success-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const translatePriority = (priority) => {
  switch (priority) {
    case 'high': return 'Alta';
    case 'medium': return 'Media';
    case 'low': return 'Baja';
    default: return priority;
  }
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('es-ES');
};

const resolveAlert = async (id) => {
  await alertStore.resolveAlert(id);
};

const handlePageChange = (page) => {
  currentPage.value = page;
};

const handleOrganizationChange = () => {
  currentPage.value = 1; // Resetear la paginación al cambiar de organización
  // Si deseas que esta selección local también actualice el store global
  // (para que otros módulos reaccionen a ella, aunque no esté en el sidebar),
  // puedes hacerlo aquí:
  // organizationStore.setSelectedOrganizationId(selectedOrganizationIdLocal.value);
  // Pero si es solo para el filtro de esta página, el `selectedOrganizationIdLocal` es suficiente.
};

// --- Watchers ---
// Resetea la página actual a 1 cada vez que se aplican nuevos filtros
watch([searchQuery, filterPriority, filterStatus, selectedOrganizationIdLocal], () => {
  currentPage.value = 1;
});

// --- Lifecycle Hook ---
onMounted(async () => {
  // Cargar todos los datos necesarios para el filtrado
  await Promise.all([
    alertStore.fetchAlerts(),
    organizationStore.fetchOrganizations(), // Cargar todas las organizaciones
    sensorStore.fetchSensors(),              // Cargar todos los sensores
  ]);

  // Inicializar el filtro de organización local con el valor del store global
  // Esto es importante para que el filtro de la página refleje la selección global
  selectedOrganizationIdLocal.value = organizationStore.selectedOrganizationId;


  // Suscribirse a las actualizaciones de alertas para que sean en tiempo real
  alertStore.subscribeToAlertUpdates(); // <--- ¡DESCOMENTADA!
});

// Desuscribirse cuando el componente se desmonte para evitar fugas de memoria
onUnmounted(() => {
  alertStore.unsubscribeFromAlertUpdates(); // <--- ¡DESCOMENTADA!
});
</script>

<style scoped>
/* Tus estilos aquí */
</style>