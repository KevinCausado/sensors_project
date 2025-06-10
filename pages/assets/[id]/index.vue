<template>
  <div>
    <PageHeader
      :title="`Detalles del Activo: ${asset?.name || 'Cargando...'}`"
      :subtitle="`ID: ${asset?.id || 'N/A'}`"
    >
      <template #actions>
        <div class="flex gap-2">
        
          <NuxtLink
            to="/assets"
            class="btn btn-secondary"
          >
            Volver
          </NuxtLink>
          <!-- Botón de edición del activo -->
         
        </div>
      </template>
    </PageHeader>

    <!-- Sección de Tarjetas de Estadísticas (max-w-7xl mx-auto) -->
    <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4 max-w-7xl mx-auto" v-if="!loading && asset">
      <StatCard title="Sensores del Activo" :value="totalSensorsForAsset" icon="sensor" color="primary" />
      <StatCard title="Sensores Activos" :value="activeSensorsForAsset" icon="sensor" color="success" />
      <StatCard title="En Mantenimiento" :value="maintenanceSensorsForAsset" icon="sensor" color="warning" />
      <StatCard title="Alertas Activas" :value="activeAlertsForCurrentAsset" icon="alert" color="error" />
    </div>


    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-600">Cargando activo...</p>
    </div>

    <div v-else-if="!asset" class="text-center py-8 text-gray-500">
      Activo no encontrado. Verifique el ID o si existen datos.
    </div>

    <!-- Contenedor principal para todas las tarjetas de detalle (AHORA TAMBIÉN max-w-7xl mx-auto) -->
    <div v-else class="max-w-7xl mx-auto space-y-6"> <!-- CAMBIO CLAVE AQUÍ: max-w-7xl -->

      <!-- Información General del Activo -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4 border-b pb-2">Información General</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500">Nombre del Activo</p>
            <p class="form-input-static">{{ asset.name }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Código del Activo</p>
            <p class="form-input-static">{{ asset.asset_code || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Número de Serie</p>
            <p class="form-input-static">{{ asset.serial_number || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Modelo</p>
            <p class="form-input-static">{{ asset.model_number || 'N/A' }}</p>
          </div>
           <div class="md:col-span-2">
            <p class="text-sm font-medium text-gray-500">Ubicación Geográfica</p>
            <p class="form-input-static">{{ combinedLocation || 'N/A' }}</p>
          </div>
          <div class="md:col-span-2">
            <p class="text-sm font-medium text-gray-500">Descripción</p>
            <p class="form-input-static">{{ asset.description || 'N/A' }}</p>
          </div>
        </div>
      </div>

      <!-- Configuración Técnica -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4 border-b pb-2 mt-6">Configuración Técnica</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500">Organización</p>
            <p class="form-input-static">{{ asset.organization_name || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tipo de Activo</p>
            <p class="form-input-static">{{ asset.asset_type_name || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Grupo ISO</p>
            <p class="form-input-static">{{ asset.iso_group_name || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tipo de Rigidez</p>
            <p class="form-input-static">{{ asset.rigidity_type_name || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tipo de Cimentación</p>
            <p class="form-input-static">{{ asset.foundation_type_name || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tipo de Acoplamiento</p>
            <p class="form-input-static">{{ asset.coupling_type_name || 'N/A' }}</p>
          </div>
           <div>
            <p class="text-sm font-medium text-gray-500">Perfil de Vibración</p>
            <p class="form-input-static">{{ asset.vibration_profile_display_name || 'N/A' }}</p>
          </div>
        </div>
      </div>

      <!-- Parámetros Operativos -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4 border-b pb-2 mt-6">Parámetros Operativos</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500">Potencia (kW)</p>
            <p class="form-input-static">{{ asset.power_kw ?? 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Velocidad (RPM)</p>
            <p class="form-input-static">{{ asset.speed_rpm ?? 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Velocidad Crítica (RPM)</p>
            <p class="form-input-static">{{ asset.critical_speed_rpm ?? 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Temperatura Operativa (°C)</p>
            <p class="form-input-static">{{ asset.operating_temp_c ?? 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Dirección IP</p>
            <p class="form-input-static">{{ asset.ip_address || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Versión de Firmware</p>
            <p class="form-input-static">{{ asset.firmware_version || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Estado</p>
            <span :class="['badge', getAssetStatusClass(asset.is_active)]">
              {{ translateAssetStatus(asset.is_active) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Fechas -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4 border-b pb-2 mt-6">Fechas</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500">Fecha de Fabricación</p>
            <p class="form-input-static">{{ formatDate(asset.manufacture_date) }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Fecha de Instalación</p>
            <p class="form-input-static">{{ formatDate(asset.installation_date) }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Última Fecha de Mantenimiento</p>
            <p class="form-input-static">{{ formatDate(asset.last_maintenance_date) }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Próxima Fecha de Mantenimiento</p>
            <p class="form-input-static">{{ formatDate(asset.next_maintenance_date) }}</p>
          </div>
        </div>
      </div>

      <!-- TARJETA DE SENSORES ASOCIADOS -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Sensores Asociados ({{ sensorsForCurrentAsset?.length || 0 }})</h3>
        <div v-if="sensorsForCurrentAsset && sensorsForCurrentAsset.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción de Ubicación</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="sensor in sensorsForCurrentAsset" :key="sensor.id">
                <td class="px-6 py-4 whitespace-nowrap">{{ sensor.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ sensor.location_description || 'N/A' }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="`badge ${getSensorStatusBadgeClass(sensor.status)}`">
                    {{ translateStatus(sensor.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(sensor.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center text-gray-500 py-4">No hay sensores asociados a este activo.</div>
      </div>

      <!-- TARJETA DE ALERTAS ASOCIADAS -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Alertas Asociadas ({{ alertsForCurrentAsset?.length || 0 }})</h3>
        <div v-if="alertsForCurrentAsset && alertsForCurrentAsset.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensaje</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generada el</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resuelta el</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="alert in alertsForCurrentAsset" :key="alert.id">
                <td class="px-6 py-4 whitespace-nowrap">{{ alert.type || 'N/A' }}</td>
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
                <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(alert.resolved_time) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center text-gray-500 py-4">No hay alertas asociadas a este activo.</div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAssetStore } from '~/stores/assets';
import { useOrganizationStore } from '~/stores/organizations';
import { useSensorStore } from '~/stores/sensors';
import { useAlertStore } from '~/stores/alerts';
import PageHeader from '~/components/PageHeader.vue';
import StatCard from '~/components/StatCard.vue';

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const router = useRouter();
const assetStore = useAssetStore();
const organizationStore = useOrganizationStore();
const sensorStore = useSensorStore();
const alertStore = useAlertStore();

const loading = ref(true);
const asset = ref(null);

// Propiedad computada para la ubicación combinada del activo
const combinedLocation = computed(() => {
  if (!asset.value) return '';
  const parts = [];
  if (asset.value.city) parts.push(asset.value.city);
  if (asset.value.state) parts.push(asset.value.state);
  if (asset.value.country) parts.push(asset.value.country);
  return parts.join(', ');
});

// Propiedad computada para filtrar sensores por el ID del activo actual
const sensorsForCurrentAsset = computed(() => {
  console.log('--- Debugging Sensores ---');
  console.log('ID del Activo Actual (asset.value?.id):', asset.value?.id);
  console.log('Sensores en sensorStore.sensors:', sensorStore.sensors);
  
  const filtered = !asset.value || !sensorStore.sensors
    ? []
    : sensorStore.sensors.filter(sensor => {
        // CORRECCIÓN CLAVE: Usar sensor.assetId (camelCase)
        const match = sensor.assetId === asset.value.id; 
        console.log(`Comparando sensor.assetId (${sensor.assetId}) con asset.value.id (${asset.value.id}). Resultado: ${match}`); 
        return match;
      });
  console.log('Sensores filtrados para este activo:', filtered); 
  console.log('-------------------------');
  return filtered;
});

// Propiedades computadas para las estadísticas de sensores
const totalSensorsForAsset = computed(() => sensorsForCurrentAsset.value.length);
const activeSensorsForAsset = computed(() => sensorsForCurrentAsset.value.filter(s => s.status === 'active').length);
const maintenanceSensorsForAsset = computed(() => sensorsForCurrentAsset.value.filter(s => s.status === 'maintenance').length);


// Propiedades computadas para las alertas del activo actual
const alertsForCurrentAsset = computed(() => {
  console.log('--- Debugging Alertas ---');
  console.log('ID del Activo Actual (asset.value?.id):', asset.value?.id);
  console.log('Alertas en alertStore.alerts:', alertStore.alerts);
  
  const filtered = !asset.value || !alertStore.alerts
    ? []
    : alertStore.alerts.filter(alert => {
        // CONFIRMADO: usar alert.asset_id (snake_case)
        const match = alert.asset_id === asset.value.id;
        console.log(`Comparando alert.asset_id (${alert.asset_id}) con asset.value.id (${asset.value.id}). Resultado: ${match}`); 
        return match;
      });
  console.log('Alertas filtradas para este activo:', filtered); 
  console.log('-------------------------');
  return filtered;
});

const activeAlertsForCurrentAsset = computed(() => alertsForCurrentAsset.value.filter(alert => alert.status !== 'resolved').length);


const loadAsset = async () => {
  const assetId = route.params.id;

  if (assetId === 'new') {
    router.replace('/assets/new');
    return;
  }

  loading.value = true;
  try {
    await Promise.all([
      assetStore.initializeDataForForms(),
      organizationStore.fetchOrganizations(),
      sensorStore.fetchSensors(), // ESTO ES CLAVE: Carga todos los sensores en su store
      alertStore.fetchAlerts()    // ESTO ES CLAVE: Carga todas las alertas en su store
    ]);

    const fetchedAsset = await assetStore.fetchAssetById(assetId);
    if (fetchedAsset) {
      asset.value = fetchedAsset;
      console.log('Datos del Activo (con nombres mapeados) cargados:', asset.value);
    } else {
      console.warn('Activo no encontrado para el ID:', assetId);
      router.push('/assets');
    }
  } catch (e) {
    console.error('Error al cargar el activo:', e);
    router.push('/assets');
  } finally {
    loading.value = false;
  }
};

const getAssetStatusClass = (isActive) => {
  return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

const translateAssetStatus = (isActive) => {
  return isActive ? 'Activo' : 'Inactivo';
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString("es-ES") + " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};

// Funciones de ayuda para el estado del sensor
const getSensorStatusBadgeClass = (status) => {
  switch (status) {
    case "active":
      return "badge-success";
    case "inactive":
      return "badge-danger";
    case "maintenance":
      return "badge-warning";
    case "error":
      return "badge-error";
    default:
      return "badge-light";
  }
};

const translateStatus = (status) => {
  const statuses = {
    active: "Activo",
    inactive: "Inactivo",
    maintenance: "Mantenimiento",
    error: "Error",
    new: "Nueva",
    acknowledged: "Reconocida",
    resolved: "Resuelta",
  };
  return statuses[status] || status;
};

// Funciones de ayuda para el estado y prioridad de alertas
const getAlertPriorityBadgeClass = (priority) => {
  switch (priority) {
    case "high":
      return "badge-danger";
    case "medium":
      return "badge-warning";
    case "low":
      return "badge-info";
    default:
      return "badge-light";
  }
};

const translatePriority = (priority) => {
  const priorities = {
    high: "Alta",
    medium: "Media",
    low: "Baja",
  };
  return priorities[priority] || priority;
};

const getAlertStatusBadgeClass = (status) => {
  switch (status) {
    case "new":
      return "badge-danger";
    case "acknowledged":
      return "badge-warning";
    case "resolved":
      return "badge-success";
    default:
      return "badge-light";
  }
};

onMounted(async () => {
  await loadAsset();
});
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.badge-success { @apply bg-green-100 text-green-800; }
.badge-danger { @apply bg-red-100 text-red-800; }
.badge-primary { @apply bg-indigo-100 text-indigo-800; }
.badge-info { @apply bg-blue-100 text-blue-800; }
.badge-warning { @apply bg-yellow-100 text-yellow-800; }
.badge-error { @apply bg-red-100 text-red-800; }
.badge-secondary { @apply bg-gray-100 text-gray-800; }
.badge-light { @apply bg-gray-50 text-gray-500; }

.form-input-static {
  @apply mt-1 text-sm text-gray-900;
}
</style>