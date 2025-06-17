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
        </div>
      </template>
    </PageHeader>

    <!-- Sección de Tarjetas de Estadísticas -->
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

    <!-- Contenedor principal para todas las tarjetas de detalle -->
    <div v-else class="max-w-7xl mx-auto space-y-6">

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
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción de Ubicación</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Lectura</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="sensor in sensorsForCurrentAsset" :key="sensor.id">
                <td class="px-6 py-4 whitespace-nowrap">{{ sensor.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ translateSensorType(sensor.type) }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ sensor.location_description || 'N/A' }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="`badge ${getSensorStatusBadgeClass(sensor.status)}`">
                    {{ translateStatus(sensor.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {{ sensor.last_value !== null ? sensor.last_value : "N/A" }}
                  <span v-if="sensor.last_unit">{{ sensor.last_unit }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(sensor.created_at) }}</td>
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
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensaje</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generada el</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resuelta el</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="alert in paginatedAlertsForCurrentAsset" :key="alert.id">
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
import { useOrganizationStore } from '~/stores/organizations';
import { useSensorStore } from '~/stores/sensors';
import { useAlertStore } from '~/stores/alerts';
import PageHeader from '~/components/PageHeader.vue';
import StatCard from '~/components/StatCard.vue';
import SensorChart from '~/components/SensorChart.vue'; 
import Pagination from '~/components/Pagination.vue'; // Asegúrate de importar el componente de paginación

// Para los iconos (si los usas, deben estar definidos o importados correctamente)
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'; // Ajusta la ruta si es necesario

definePageMeta({
  // middleware: ['auth'] // Puedes agregar un middleware de autenticación si lo usas.
});

const route = useRoute();
const router = useRouter();
const assetStore = useAssetStore();
const organizationStore = useOrganizationStore();
const sensorStore = useSensorStore();
const alertStore = useAlertStore();

const loading = ref(true);
const asset = ref(null);
const selectedSensorIds = ref([]); // Almacena los IDs de los sensores seleccionados para la gráfica

// Paginación para alertas
const currentAlertPage = ref(1);
const alertsPerPage = ref(5); // Número de alertas por página


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
  if (!asset.value || !sensorStore.sensors) {
    return [];
  }
  // Filtra los sensores que tienen el assetId del activo actual
  const filtered = sensorStore.sensors.filter(sensor => {
    return sensor.assetId === asset.value.id;
  });
  return filtered;
});

// Propiedad computada para obtener solo los sensores disponibles para la selección de la gráfica
const availableSensorsForCharts = computed(() => {
  // Filtra sensores asociados al activo y que estén activos y tengan alguna comunicación reciente
  return sensorsForCurrentAsset.value.filter(s => s.status === 'active' && s.last_communication);
});


// Propiedad computada para los datos que se pasan al SensorChart
const realtimeSelectedSensorsForChart = computed(() => {
  // Filtra los sensores del activo que están seleccionados por el usuario
  const selectedSensors = sensorsForCurrentAsset.value.filter(sensor => selectedSensorIds.value.includes(sensor.id));
  
  // Para cada sensor seleccionado, adjunta sus lecturas en tiempo real
  // sensorStore.getReadingsBySensorId es el nuevo getter que proporciona las lecturas en tiempo real
  return selectedSensors.map(sensor => ({
    ...sensor,
    readings: sensorStore.getReadingsBySensorId(sensor.id), 
  }));
});


// Propiedades computadas para las estadísticas de sensores
const totalSensorsForAsset = computed(() => sensorsForCurrentAsset.value.length);
const activeSensorsForAsset = computed(() => sensorsForCurrentAsset.value.filter(s => s.status === 'active').length);
const maintenanceSensorsForAsset = computed(() => sensorsForCurrentAsset.value.filter(s => s.status === 'maintenance').length);


// Propiedades computadas para las alertas del activo actual (ahora filtradas y ordenadas)
const alertsForCurrentAsset = computed(() => {
  if (!asset.value || !alertStore.alerts) {
    return [];
  }
  // Filtra las alertas que tienen el asset_id del activo actual
  const filtered = alertStore.alerts.filter(alert => {
    return alert.asset_id === asset.value.id;
  });

  // Ordenar las alertas por fecha, las más recientes primero
  filtered.sort((a, b) => new Date(b.alert_time) - new Date(a.alert_time));

  return filtered.map((alert) => {
    // Busca el sensor asociado a esta alerta para obtener su nombre, si existe
    const sensor = sensorStore.sensors.find((s) => s.id === alert.sensor_id);
    const sensorName = sensor ? sensor.name : "Desconocido";

    // Busca la organización para la alerta
    const organization = organizationStore.organizations.find((org) => org.id === alert.organization_id);
    const organizationName = organization ? organization.name : "Desconocida";

    // Asignar el nombre del activo, que ya lo tenemos en el store principal del activo
    const assetName = asset.value.name || 'N/A';

    return {
      ...alert,
      sensorName: sensorName,
      organizationName: organizationName,
      assetName: assetName, 
    };
  });
});

// Propiedades computadas para la paginación de alertas
const paginatedAlertsForCurrentAsset = computed(() => {
  const start = (currentAlertPage.value - 1) * alertsPerPage.value;
  const end = start + alertsPerPage.value;
  return alertsForCurrentAsset.value.slice(start, end);
});

const totalFilteredAlertsForAsset = computed(() => alertsForCurrentAsset.value.length);


const activeAlertsForCurrentAsset = computed(() => alertsForCurrentAsset.value.filter(alert => alert.status !== 'resolved').length);


const loadAsset = async () => {
  const assetId = route.params.id;

  if (assetId === 'new') {
    router.replace('/assets/new');
    return;
  }

  loading.value = true;
  try {
    // Cargar datos de base antes de cargar el activo para que los mapeos funcionen
    await Promise.all([
      assetStore.initializeDataForForms(), // Asegura que los tipos de activo, etc., estén cargados
      organizationStore.fetchOrganizations(), // Asegura que las organizaciones estén cargadas
    ]);

    // Cargar el activo específico
    const fetchedAsset = await assetStore.fetchAssetById(assetId);
    if (fetchedAsset) {
      asset.value = fetchedAsset;
      console.log('Datos del Activo (con nombres mapeados) cargados:', asset.value);

      // Una vez que el activo está cargado, cargar los sensores asociados a él
      await sensorStore.fetchSensors(); // Esto carga todos los sensores y los filtros en `sensorsForCurrentAsset`

      // Después de cargar los sensores, seleccionamos todos por defecto para la gráfica
      // Solo selecciona los sensores que estén activos y hayan tenido comunicación
      selectedSensorIds.value = availableSensorsForCharts.value.map(s => s.id);

      // Suscribirse a las lecturas en tiempo real para los sensores seleccionados
      if (selectedSensorIds.value.length > 0) {
        sensorStore.subscribeToGraphReadings(selectedSensorIds.value);
      }
      
      // Finalmente, cargar alertas
      await alertStore.fetchAlerts(); // Esto carga todas las alertas y los filtros en `alertsForCurrentAsset`
      // Suscribirse a las actualizaciones de alertas en tiempo real
      alertStore.subscribeToAlertUpdates();
      // Suscribirse a las actualizaciones de sensores generales (para la tabla de sensores)
      sensorStore.subscribeToSensorUpdates();


    } else {
      console.warn('Activo no encontrado para el ID:', assetId);
      router.push('/assets'); // Redirigir si el activo no existe
    }
  } catch (e) {
    console.error('Error al cargar el activo:', e);
    // Podrías mostrar un mensaje de error al usuario aquí
    router.push('/assets'); // Redirigir en caso de error grave
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

// Helper para traducir el tipo de sensor (repetido de pages/sensors/[id].vue, pero útil aquí también)
const translateSensorType = (type) => {
  switch (type) {
    case "temperature": return "Temperatura";
    case "humidity": return "Humedad";
    case "vibration": return "Vibración";
    case "pressure": return "Presión";
    case "other": return "Otro";
    default: return type;
  }
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

// Watcher para la selección de sensores de la gráfica
watch(selectedSensorIds, (newIds) => {
  // Cuando la selección cambia, desuscribirse de lo anterior y suscribirse a lo nuevo
  // Se usa la función renombrada
  sensorStore.unsubscribeFromAllGraphReadings(); 
  if (newIds.length > 0) {
    // Se usa la función renombrada
    sensorStore.subscribeToGraphReadings(newIds);
  }
}, { deep: true }); // Observa cambios profundos en el array (elementos añadidos/eliminados)

// Manejador para el cambio de página de alertas
const handleAlertPageChange = (page) => {
  currentAlertPage.value = page;
};

// Ciclo de vida
onMounted(async () => {
  await loadAsset();
});

onUnmounted(async () => {
  // Al salir de la página del activo, desuscribirse de todas las lecturas de gráficas para evitar fugas de memoria
  sensorStore.unsubscribeFromAllGraphReadings(); 
  // Desuscribirse de las actualizaciones de alertas si no se necesitan globalmente
  alertStore.unsubscribeFromAlertUpdates();
  // Desuscribirse de las actualizaciones generales de sensores
  sensorStore.unsubscribeFromSensorUpdates(); 
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
