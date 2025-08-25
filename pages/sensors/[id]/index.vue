<template>
  <div>
    <PageHeader title="Detalles del Sensor" :subtitle="sensorStore.currentSensor?.name">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/sensors" class="btn btn-secondary">Volver</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-500">Cargando información del sensor...</p>
    </div>

    <div v-else-if="error" class="text-center py-8 text-red-600">
      <p>Error al cargar el sensor: {{ error }}</p>
    </div>

    <div v-else-if="!sensorStore.currentSensor" class="text-center py-8 text-gray-500">Sensor no encontrado.</div>

    <div v-else class="space-y-6">
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Información General</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p class="text-sm font-medium text-gray-500">Nombre</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.name }}</p>
          </div>
           <div>
            <p class="text-sm font-medium text-gray-500">Activo</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.assetName || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Código</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.code || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Marca</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.brandName || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Modelo</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.modelName || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Firmware</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.firmwareVersion || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tipo</p>
            <p class="mt-1 text-gray-900">{{ translateSensorType(sensorStore.currentSensor.type) || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Unidad</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.unit || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Organización</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.organizationName || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Ubicación Geográfica (Activo)</p>
            <p class="mt-1 text-gray-900">{{ combinedAssetLocation || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Descripción de la ubicación (Sensor)</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.location_description || "No especificada" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Estado</p>
            <span :class="getSensorStatusClass(sensorStore.currentSensor.status)" class="px-2.5 py-0.5 rounded-full text-xs font-medium">
              {{ translateSensorStatus(sensorStore.currentSensor.status) }}
            </span>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Última Comunicación</p>
            <p class="mt-1 text-gray-900">
              {{ sensorStore.currentSensor.last_reading_timestamp ? new Date(sensorStore.currentSensor.last_reading_timestamp).toLocaleString() : "N/A" }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Última Lectura</p>
            <div class="mt-1">
                <div v-if="sensorStore.currentSensor.type === 'vibration'">
                    <div v-if="parseVibrationValue(sensorStore.currentSensor.last_value)" class="flex items-center gap-1 sm:gap-2">
                        <span class="axis-badge bg-red-100 text-red-800"><b class="font-bold">X:</b> {{ parseVibrationValue(sensorStore.currentSensor.last_value).x }}</span>
                        <span class="axis-badge bg-green-100 text-green-800"><b class="font-bold">Y:</b> {{ parseVibrationValue(sensorStore.currentSensor.last_value).y }}</span>
                        <span class="axis-badge bg-blue-100 text-blue-800"><b class="font-bold">Z:</b> {{ parseVibrationValue(sensorStore.currentSensor.last_value).z }}</span>
                        {{ sensorStore.currentSensor.last_unit }}
                      </div>
                    <p v-else class="text-gray-900">{{ sensorStore.currentSensor.last_value || "N/A" }}</p>
                </div>
                <!-- [MEJORADO] Se aplica badge azul a la lectura de temperatura -->
                <div v-else-if="sensorStore.currentSensor.last_value !== null">
                    <span class="status-badge bg-blue-100 text-blue-800 font-mono">
                        {{ sensorStore.currentSensor.last_value }} {{ sensorStore.currentSensor.last_unit }}
                    </span>
                </div>
                <p v-else class="text-gray-900">N/A</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Umbrales Definidos</h2>
        <div v-if="sensorStore.currentSensor.type === 'vibration' && vibrationProfile">
           <VibrationProfileDisplay :profile="vibrationProfile" />
        </div>
        <div v-else>
            <div v-if="hasThresholds">              
               <p class="text-sm text-gray-600 mb-4">
            Estos umbrales definen los rangos de operación de tu sensor.           
            <template v-if="sensorStore.currentSensor.type !== 'vibration'">
              <br />
              • <strong class="text-green-700">Normal:</strong> Valores entre
              <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.normalMin ?? 'N/A' }}</span>
              y
              <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.normalMax ?? 'N/A' }}</span>
              .
              <br />
              • <strong class="text-yellow-700">Advertencia:</strong> Valores fuera del rango Normal pero dentro de los límites Críticos.
              <br />
              • <strong class="text-red-700">Crítico:</strong> Valores fuera de los límites
              <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.criticalMin ?? 'N/A' }}</span>
              o
              <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.criticalMax ?? 'N/A' }}</span>
              .
            </template>
          </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p class="text-sm font-medium text-red-500">Mínimo Crítico</p>
                  <p class="mt-1 text-lg font-semibold text-red-800">
                    {{ isDefined(sensorStore.currentSensor.thresholds.criticalMin) ? sensorStore.currentSensor.thresholds.criticalMin : 'N/A' }} {{ sensorStore.currentSensor.unit || '' }}
                  </p>
                </div>

                <div>
                  <p class="text-sm font-medium text-red-500">Máximo Crítico</p>
                  <p class="mt-1 text-lg font-semibold text-red-800">
                    {{ isDefined(sensorStore.currentSensor.thresholds.criticalMax) ? sensorStore.currentSensor.thresholds.criticalMax : 'N/A' }} {{ sensorStore.currentSensor.unit || '' }}
                  </p>
                </div>

                <div>
                  <p class="text-sm font-medium text-green-500">Mínimo Normal</p>
                  <p class="mt-1 text-lg font-semibold text-green-800">
                    {{ isDefined(sensorStore.currentSensor.thresholds.normalMin) ? sensorStore.currentSensor.thresholds.normalMin : 'N/A' }} {{ sensorStore.currentSensor.unit || '' }}
                  </p>
                </div>

                <div>
                  <p class="text-sm font-medium text-green-500">Máximo Normal</p>
                  <p class="mt-1 text-lg font-semibold text-green-800">
                    {{ isDefined(sensorStore.currentSensor.thresholds.normalMax) ? sensorStore.currentSensor.thresholds.normalMax : 'N/A' }} {{ sensorStore.currentSensor.unit || '' }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 text-gray-500">
                <span v-if="sensorStore.currentSensor.type === 'vibration'">Este sensor de vibración no tiene un perfil de activo asignado.</span>
                <span v-else>No hay umbrales definidos para este sensor.</span>
            </div>
        </div>
      </div>
      
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Monitoreo en Tiempo Real</h2>
        <SensorChart
          v-if="sensorStore.currentSensor"
          :sensors="[sensorStore.currentSensor]"
          :height="400"
          initial-empty-message="Sensor no disponible para la gráfica."
          empty-data-message="No hay lecturas disponibles para este sensor en el rango seleccionado."
        />
        <div v-else class="text-center text-gray-500 py-4">No se puede mostrar la gráfica.</div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Historial de Lecturas Recientes</h2>
        <p v-if="sensorStore.isLoading" class="text-gray-500">Cargando lecturas...</p>
        <div v-else-if="paginatedReadings.length === 0" class="text-gray-500">No hay lecturas disponibles para este sensor.</div>
        <ul v-else class="space-y-3">
          <template v-if="sensorStore.currentSensor.type === 'vibration'">
            <li v-for="reading in paginatedReadings" :key="reading.id" class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-600 font-mono w-1/3">{{ new Date(reading.timestamp).toLocaleString() }}</span>
              <!-- [MEJORADO] Se aplica la visualización con badges -->
              <div class="flex items-center justify-end space-x-2 w-2/3 text-right">
                <span class="axis-badge bg-red-100 text-red-800"><b class="font-bold">X:</b> {{ reading.x ? reading.x.oavelocity.toFixed(3) : '-' }}</span>
                <span class="axis-badge bg-green-100 text-green-800"><b class="font-bold">Y:</b> {{ reading.y ? reading.y.oavelocity.toFixed(3) : '-' }}</span>
                <span class="axis-badge bg-blue-100 text-blue-800"><b class="font-bold">Z:</b> {{ reading.z ? reading.z.oavelocity.toFixed(3) : '-' }}</span>
                <span class="text-xs text-gray-500">{{ reading.unit }}</span>
              </div>
            </li>
          </template>

          <template v-else>
            <li v-for="reading in paginatedReadings" :key="reading.id" class="flex justify-between items-center p-2 bg-gray-50 rounded-md">
              <span>{{ new Date(reading.timestamp).toLocaleString() }}</span>
              <!-- [MEJORADO] Se aplica badge azul a la lectura de temperatura en el historial -->
              <span class="status-badge bg-blue-100 text-blue-800 font-mono">
                {{ reading.value }} {{ reading.unit }}
              </span>
            </li>
          </template>
        </ul>
        <div v-if="totalPages > 1" class="flex justify-center items-center mt-4 space-x-2">
          <button @click="prevPage" :disabled="currentPage === 1" class="px-3 py-1 rounded-md text-sm" :class="currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'">Anterior</button>
          <span class="text-sm text-gray-700">Página {{ currentPage }} de {{ totalPages }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages" class="px-3 py-1 rounded-md text-sm" :class="currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'">
            Siguiente
          </button>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Alertas Recientes</h2>
        <!-- [MEJORADO] Se usa el nuevo paginatedAlerts -->
        <AlertList :alerts="paginatedAlerts" />
        <p v-if="alertsForCurrentSensor.length === 0 && !alertStore.isLoading" class="text-center text-gray-500 py-4">No hay alertas recientes.</p>
        <p v-if="alertStore.isLoading" class="text-center text-gray-500 py-4">Cargando alertas...</p>
        <!-- [NUEVO] Componente de paginación para las alertas -->
        <div v-if="totalAlertsPages > 1" class="mt-4">
            <Pagination
                :total-items="alertsForCurrentSensor.length"
                :current-page="alertsCurrentPage"
                :items-per-page="alertsItemsPerPage"
                @page-change="handleAlertsPageChange"
            />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useSensorStore } from "@/stores/sensors";
import { useAlertStore } from "@/stores/alerts";
import { useOrganizationStore } from "@/stores/organizations";
import { useAssetStore } from "@/stores/assets"; 
import AlertList from "@/components/AlertList.vue";
import SensorChart from "@/components/SensorChart.vue"; 
import PageHeader from "@/components/PageHeader.vue";
import VibrationProfileDisplay from "@/components/VibrationProfileDisplay.vue";
import PermissionGuard from "@/components/PermissionGuard.vue";
import Pagination from "@/components/Pagination.vue"; 
import { useBreadcrumbStore } from "~/stores/breadCrumb";

const route = useRoute();
const sensorStore = useSensorStore();
const alertStore = useAlertStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore(); 
const breadcrumbStore = useBreadcrumbStore();

const error = ref(null);
const isLoading = ref(true); 
const vibrationProfile = ref(null);
const itemsPerPage = ref(10);
const currentPage = ref(1);

// [NUEVO] Estado para la paginación de alertas
const alertsCurrentPage = ref(1);
const alertsItemsPerPage = ref(5);

const loadSensorDetails = async (sensorId) => {
    isLoading.value = true;
    error.value = null;
    vibrationProfile.value = null;
    try {
        await sensorStore.fetchSensor(sensorId);
        const sensor = sensorStore.currentSensor;
        if (sensor) {
            breadcrumbStore.setNameForPath({ path: route.path, name: sensor.name });
            const dataPromises = [
                sensorStore.fetchAndSubscribeToDetailReadings(sensorId),
                alertStore.fetchAlerts()
            ];
            if (sensor.type === 'vibration' && sensor.assetId) {
                dataPromises.push(
                    sensorStore.getVibrationProfileForAsset(sensor.assetId).then(({ profile }) => {
                        if (profile) vibrationProfile.value = profile;
                    })
                );
            }
            await Promise.all(dataPromises);
            alertStore.subscribeToAlertUpdates();
            sensorStore.subscribeToSensorUpdates();
        }
    } catch (e) {
        console.error("[idSensorPage] Error al cargar detalles del sensor:", e);
        error.value = e.message || "Error desconocido al cargar el sensor.";
    } finally {
        isLoading.value = false;
    }
};

const totalPages = computed(() => {
  const totalReadings = sensorStore.currentSensorReadings?.length || 0;
  if (totalReadings === 0) return 1;
  return Math.ceil(totalReadings / itemsPerPage.value);
});

const paginatedReadings = computed(() => {
  const readings = sensorStore.currentSensorReadings || [];
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  return readings.slice(startIndex, startIndex + itemsPerPage.value);
});

const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };
const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };

const translateSensorType = (type) => ({ "temperature": "Temperatura", "humidity": "Humedad", "vibration": "Vibración", "pressure": "Presión", "other": "Otro" }[type] || type);
const getSensorStatusClass = (status) => ({ "active": "bg-green-100 text-green-800", "maintenance": "bg-yellow-100 text-yellow-800", "inactive": "bg-red-100 text-red-800", "error": "bg-red-100 text-red-800" }[status] || "bg-gray-100 text-gray-800");
const translateSensorStatus = (status) => ({ "active": "Activo", "maintenance": "Mantenimiento", "inactive": "Inactivo", "error": "Error" }[status] || status);

const alertsForCurrentSensor = computed(() => {
  const currentSensorId = sensorStore.currentSensor?.id;
  if (!currentSensorId || !alertStore.alerts) return [];
  return alertStore.alerts.filter(alert => alert.sensor_id === currentSensorId).map(alert => ({
    ...alert,
    sensorName: sensorStore.currentSensor.name,
    organizationName: organizationStore.organizations.find(org => org.id === (alert.organization_id || sensorStore.currentSensor.organizationId))?.name || "Desconocida",
    assetName: assetStore.assets.find(a => a.id === (alert.asset_id || sensorStore.currentSensor.assetId))?.name || "N/A",
  }));
});

// [NUEVO] Computadas para la paginación de alertas
const totalAlertsPages = computed(() => {
    const total = alertsForCurrentSensor.value.length;
    return total > 0 ? Math.ceil(total / alertsItemsPerPage.value) : 1;
});

const paginatedAlerts = computed(() => {
    const alerts = alertsForCurrentSensor.value;
    const startIndex = (alertsCurrentPage.value - 1) * alertsItemsPerPage.value;
    return alerts.slice(startIndex, startIndex + alertsItemsPerPage.value);
});

// [NUEVO] Handler para cambiar de página en las alertas
const handleAlertsPageChange = (page) => {
    alertsCurrentPage.value = page;
};

const combinedAssetLocation = computed(() => {
  const sensor = sensorStore.currentSensor;
  if (!sensor) return 'N/A';
  const parts = [sensor.assetCity, sensor.assetState, sensor.assetCountry].filter(p => p && p !== 'N/A');
  return parts.length > 0 ? parts.join(', ') : 'N/A';
});

const hasThresholds = computed(() => {
  const t = sensorStore.currentSensor?.thresholds;
  return t && Object.values(t).some(val => val !== null && val !== undefined);
});

const isDefined = (value) => value !== undefined && value !== null;

const parseVibrationValue = (value) => {
    if (typeof value !== 'string' || !value.includes(':')) return null;
    const parts = value.replace(/,/g, ' ').split(/\s+/).reduce((acc, part) => {
        if (part.includes(':')) {
            const [axis, val] = part.split(':');
            if (axis && val) acc[axis.trim().toLowerCase()] = val.trim();
        }
        return acc;
    }, {});
    return parts.x && parts.y && parts.z ? parts : null;
};

onMounted(async () => {
    await Promise.all([
        assetStore.fetchAssets(),
        organizationStore.fetchOrganizations(),
        sensorStore.fetchSensors(),
    ]);
    await loadSensorDetails(route.params.id);
});

onUnmounted(async () => {
  breadcrumbStore.clearNameForPath(route.path);
  await sensorStore.unsubscribeFromDetailReadings();
  await alertStore.unsubscribeFromAlertUpdates();
  await sensorStore.unsubscribeFromSensorUpdates();
});

watch(() => route.params.id, async (newId) => {
    if (newId) {
        await loadSensorDetails(newId);
    }
});

watch(() => sensorStore.currentSensorReadings, () => { 
    if (currentPage.value > totalPages.value) {
        currentPage.value = totalPages.value || 1;
    }
}, { deep: true });
</script>

<style scoped>
.card { @apply bg-white shadow rounded-lg p-6; }
.btn { @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow; }
.btn-primary { @apply text-white bg-primary-600 hover:bg-primary-700; }
.btn-secondary { @apply text-gray-700 bg-gray-200 hover:bg-gray-300; }
.axis-badge { @apply px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-md items-center font-mono; }
/* [NUEVO] Se añade la clase para el badge de temperatura */
.status-badge { @apply px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize; }
</style>
