<template>
  <div>
    <PageHeader title="Detalles del Sensor" :subtitle="sensorStore.currentSensor?.name">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/sensors" class="btn btn-secondary">Volver</NuxtLink>      
        </div>
      </template>
    </PageHeader>

    <div v-if="sensorStore.isLoading && !sensorStore.currentSensor" class="flex items-center justify-center py-8">
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
            <p class="text-sm font-medium text-gray-500">Número de Serie</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.serial_number || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Modelo</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.model || "N/A" }}</p>
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
              {{ sensorStore.currentSensor.last_communication ? new Date(sensorStore.currentSensor.last_communication).toLocaleString() : "N/A" }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Nivel de Batería</p>
            <p class="mt-1 text-gray-900">
              {{ sensorStore.currentSensor.battery_level !== null ? `${sensorStore.currentSensor.battery_level}%` : "N/A" }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Intensidad de Señal</p>
            <p class="mt-1 text-gray-900">
              {{ sensorStore.currentSensor.signal_strength !== null ? `${sensorStore.currentSensor.signal_strength} dBm` : "N/A" }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Última Lectura</p>
            <p class="mt-1 text-gray-900">
              {{ sensorStore.currentSensor.last_value !== null ? sensorStore.currentSensor.last_value : "N/A" }}
              <span class="text-blue-600">
                {{ sensorStore.currentSensor.last_unit ? sensorStore.currentSensor.last_unit : "" }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Umbrales Definidos</h2>

        <!-- ++ INICIO DEL AJUSTE: Lógica condicional para mostrar el perfil o los umbrales ++ -->
        
        <!-- CASO 1: Es un sensor de vibración y tiene un perfil cargado -->
        <div v-if="sensorStore.currentSensor.type === 'vibration' && vibrationProfile">
           <VibrationProfileDisplay :profile="vibrationProfile" />
        </div>
        
        <!-- CASO 2: Es un sensor de cualquier tipo SIN perfil de vibración visible -->
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
        <!-- ++ FIN DEL AJUSTE ++ -->
      </div>
      
      <!-- Secciones de Historial, Gráfica y Alertas (sin cambios) -->
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Historial de Lecturas Recientes</h2>
        <p v-if="sensorStore.isLoading" class="text-gray-500">Cargando lecturas...</p>
        <div v-else-if="paginatedReadings.length === 0" class="text-gray-500">No hay lecturas disponibles para este sensor.</div>
        <ul v-else class="space-y-2">
          <li v-for="reading in paginatedReadings" :key="reading.timestamp" class="flex justify-between items-center p-2 bg-gray-50 rounded-md">
            <span>{{ new Date(reading.timestamp).toLocaleString() }}</span>
            <span class="font-medium">{{ reading.value }} {{ sensorStore.currentSensor.unit }}</span>
          </li>
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
        <h2 class="text-lg font-medium text-gray-900 mb-4">Gráfica del Historial</h2>
        <SensorChart
          v-if="sensorForChart"
          :sensors="[sensorForChart]"
          :height="400"
          :show-time-range-controls="true"
          initial-empty-message="Sensor no disponible para la gráfica."
          empty-data-message="No hay lecturas disponibles para este sensor en el rango seleccionado."
        />
        <div v-else class="text-center text-gray-500 py-4">No se puede mostrar la gráfica.</div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Alertas Recientes</h2>
        <AlertList :alerts="alertsForCurrentSensor" />
        <p v-if="alertsForCurrentSensor.length === 0 && !alertStore.isLoading" class="text-center text-gray-500 py-4">No hay alertas recientes.</p>
        <p v-if="alertStore.isLoading" class="text-center text-gray-500 py-4">Cargando alertas...</p>
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
import VibrationProfileDisplay from "@/components/VibrationProfileDisplay.vue"; // ++ IMPORTAR COMPONENTE

const route = useRoute();
const sensorStore = useSensorStore();
const alertStore = useAlertStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore(); 

const error = ref(null);
const vibrationProfile = ref(null); // ++ AÑADIR REF PARA EL PERFIL
const itemsPerPage = ref(10);
const currentPage = ref(1);

const loadSensorDetails = async (sensorId) => {
    error.value = null;
    vibrationProfile.value = null; // Reset on load
    try {
        await sensorStore.fetchSensor(sensorId);
        
        // Si el sensor cargado es de vibración y tiene un activo, buscar su perfil
        const sensor = sensorStore.currentSensor;
        if (sensor && sensor.type === 'vibration' && sensor.assetId) {
            const { profile } = await sensorStore.getVibrationProfileForAsset(sensor.assetId);
            if (profile) {
                vibrationProfile.value = profile;
            }
        }
        
        // Cargar lecturas y alertas
        await sensorStore.fetchAndSubscribeToDetailReadings(sensorId);
        await alertStore.fetchAlerts();
        await alertStore.subscribeToAlertUpdates();
        await sensorStore.subscribeToSensorUpdates();
        
    } catch (e) {
        console.error("[idSensorPage] Error al cargar detalles del sensor:", e);
        error.value = e.message || "Error desconocido al cargar el sensor.";
    }
};

const sortedAllReadings = computed(() => {
  if (!sensorStore.currentSensorReadings) return [];
  return [...sensorStore.currentSensorReadings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
});

const totalPages = computed(() => {
  if (!sortedAllReadings.value.length) return 1;
  return Math.ceil(sortedAllReadings.value.length / itemsPerPage.value);
});

const paginatedReadings = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  return sortedAllReadings.value.slice(startIndex, startIndex + itemsPerPage.value);
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

const sensorForChart = computed(() => {
  if (!sensorStore.currentSensor) return null;
  return { ...sensorStore.currentSensor, readings: sensorStore.currentSensorReadings };
});

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

onMounted(async () => {
    await Promise.all([
        assetStore.fetchAssets(),
        organizationStore.fetchOrganizations(),
        sensorStore.fetchSensors(),
    ]);
    await loadSensorDetails(route.params.id);
});

onUnmounted(async () => {
  await sensorStore.unsubscribeFromDetailReadings();
  await alertStore.unsubscribeFromAlertUpdates();
  await sensorStore.unsubscribeFromSensorUpdates();
});

watch(() => route.params.id, async (newId) => {
    if (newId) {
        await loadSensorDetails(newId);
    }
});

watch(() => sensorStore.currentSensorReadings, () => { currentPage.value = 1; }, { deep: true });
</script>

<style scoped>
.card { @apply bg-white shadow rounded-lg p-6; }
.btn { @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow; }
.btn-secondary { @apply text-gray-700 bg-gray-200 hover:bg-gray-300; }
</style>