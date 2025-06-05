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
import { ref, computed, onMounted, defineComponent, h, watch, onUnmounted } from 'vue';
import { useAlertStore } from '~/stores/alerts';
import { useOrganizationStore } from '~/stores/organizations';
import { useSensorStore } from '~/stores/sensors';

// Icons (placeholders)
const SearchIcon = defineComponent({
  render: () => h('div', { class: 'i-heroicons-magnifying-glass' })
});
const AlertIcon = defineComponent({
  render: () => h('div', { class: 'i-heroicons-exclamation-triangle' })
});

definePageMeta({
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
const itemsPerPage = ref(10);
const selectedOrganizationIdLocal = ref(null); // Estado local para el filtro de organización

// --- Computed Properties ---

// Listado de todas las organizaciones para el select
const organizations = computed(() => organizationStore.organizations);

// Listado de todos los sensores
const sensors = computed(() => sensorStore.sensors);

// Alertas con información de sensor y organización (si aplica)
const alertsWithSensorAndOrg = computed(() => {
  return alertStore.alerts.map(alert => {
    let sensorName = 'Desconocido';
    let organizationName = 'Desconocida';
    let organizationIdForAlert = null; // Usaremos esto para el filtro y display

    // 1. Obtener nombre del sensor (como ya lo tienes funcionando)
    // Usamos alert.sensor_id ya que es el nombre de la columna en la BD
    if (alert.sensor_id) {
      const sensor = sensors.value.find(s => s.id === alert.sensor_id);
      if (sensor) {
        sensorName = sensor.name;
        // La organization_id del sensor es la que nos interesa para la alerta
        organizationIdForAlert = sensor.organization_id;
      }
    }

    // 2. Obtener el nombre de la organización
    // Primero, intenta con el organization_id asociado directamente a la alerta,
    // o con el organization_id obtenido del sensor.
    const orgIdToLookup = organizationIdForAlert || alert.organization_id; // Prioriza el del sensor si existe, si no, el de la alerta

    if (orgIdToLookup) {
      const org = organizations.value.find(o => o.id === orgIdToLookup);
      organizationName = org ? org.name : 'Desconocida';
    }

    return {
      ...alert,
      sensorName: sensorName,
      organizationId: orgIdToLookup, // Añade esta propiedad a la alerta enriquecida para el filtro
      organizationName: organizationName,
      // Asegúrate de que las propiedades utilizadas en el template son consistentes
      // con las que vienen de la BD (snake_case) o las que has remapeado aquí.
      // alert.description y alert.alert_time ya son correctos.
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
  const nuxtApp = useNuxtApp();
  const supabase = nuxtApp.$supabase;

  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        status: 'resolved',
        resolved_time: new Date().toISOString() // Establece la hora actual en formato ISO
      })
      .eq('id', id); // Condición para actualizar solo la alerta con el ID específico

    if (error) {
      console.error('[Alerts Page] Error al resolver alerta:', error.message);
      // Opcional: Mostrar una notificación al usuario sobre el error
      return;
    }

    console.log('[Alerts Page] Alerta resuelta con éxito:', data);
    // Como tienes una suscripción en tiempo real (alertStore.subscribeToAlertUpdates()),
    // la interfaz debería actualizarse automáticamente una vez que la base de datos cambie.
    // No necesitas actualizar manualmente el estado 'alerts' aquí si el realtime está funcionando.
    // Si la alerta se resuelve y el filtro de estado está en 'active', la alerta desaparecerá.
    // Si está en 'Todos los Estados', verás que su estado cambia a 'Resuelta'.

  } catch (e) {
    console.error('[Alerts Page] Excepción al resolver alerta:', e.message);
    // Opcional: Mostrar una notificación de error al usuario
  }
};

const handlePageChange = (page) => {
  currentPage.value = page;
};

// No necesitas handleOrganizationChange ya que el watcher maneja la sincronización.
// Si tuvieras un selector local en esta página, entonces sí necesitarías este método.

// --- Watchers ---
// Resetea la página actual a 1 cada vez que se aplican nuevos filtros locales
watch([searchQuery, filterPriority, filterStatus], () => {
  currentPage.value = 1;
});

// ¡ESTE ES EL WATCHER CLAVE AÑADIDO PARA LA SINCRONIZACIÓN GLOBAL!
// Observa los cambios en la selección de organización del store global (sidebar)
watch(() => organizationStore.selectedOrganizationId, (newValue) => {
  console.log(`[Alerts Module] organizationStore.selectedOrganizationId cambió a: ${newValue}`);
  selectedOrganizationIdLocal.value = newValue; // Actualiza el filtro local con el valor global
  currentPage.value = 1; // Resetea la paginación
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
  console.log(`[Alerts Module] Initializing with organizationStore.selectedOrganizationId: ${organizationStore.selectedOrganizationId}`);

  // Suscribirse a las actualizaciones de alertas para que sean en tiempo real
  alertStore.subscribeToAlertUpdates();
});

// Desuscribirse cuando el componente se desmonte para evitar fugas de memoria
onUnmounted(() => {
  alertStore.unsubscribeFromAlertUpdates();
});
</script>

<style scoped>
/* Tus estilos aquí */
</style>