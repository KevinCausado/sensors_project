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

    <!-- <div v-else-if="sensorStore.error" class="text-center py-8 text-error-600">
      <p>Error al cargar el sensor: {{ sensorStore.error }}</p>
    </div> -->

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
        <div v-if="sensorStore.currentSensor?.thresholds && hasThresholds">
          <p class="text-sm text-gray-600 mb-4">
            Estos umbrales definen los rangos de operación de tu sensor.
            <template v-if="sensorStore.currentSensor.type === 'vibration'">
              <br />
              • <strong class="text-green-700">Normal:</strong> Valores entre
              <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.normalMin ?? 'N/A' }}</span>
              y
              <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.normalMax ?? 'N/A' }}</span>
              .
              <br />
              • <strong class="text-yellow-700">Alarma:</strong> Valores entre
              <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.normalMax ?? 'N/A' }}</span>
              y
              <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.alarm_level ?? 'N/A' }}</span>
              .
              <br />
              • <strong class="text-red-700">Crítico:</strong> Valores superiores a
              <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.critical_level ?? 'N/A' }}</span>
              .
            </template>
            <template v-else>
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

          <!-- GRID CONDICIONAL BASADO EN EL TIPO DE SENSOR -->
          <div :class="{'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4': sensorStore.currentSensor.type === 'vibration', 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4': sensorStore.currentSensor.type !== 'vibration'}">
            
            <!-- Umbrales Generales (siempre presentes, solo se ajusta el layout) -->
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

            <!-- Umbrales Específicos de Vibración (solo si el tipo es 'vibration') -->
            <template v-if="sensorStore.currentSensor.type === 'vibration'">
              <div>
                <p class="text-sm font-medium text-yellow-500">Nivel de Alarma</p>
                <p class="mt-1 text-lg font-semibold text-yellow-800">
                  {{ isDefined(sensorStore.currentSensor.thresholds.alarm_level) ? sensorStore.currentSensor.thresholds.alarm_level : 'N/A' }} {{ sensorStore.currentSensor.unit || '' }}
                </p>
              </div>
              <div>
                <p class="text-sm font-medium text-red-500">Nivel Crítico</p>
                <p class="mt-1 text-lg font-semibold text-red-800">
                  {{ isDefined(sensorStore.currentSensor.thresholds.critical_level) ? sensorStore.currentSensor.thresholds.critical_level : 'N/A' }} {{ sensorStore.currentSensor.unit || '' }}
                </p>
              </div>
            </template>
          </div>
        </div>
        <div v-else class="text-center py-4 text-gray-500">No hay umbrales definidos para este sensor.</div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Historial de Lecturas Recientes</h2>
        <p v-if="sensorStore.isLoading" class="text-gray-500">Cargando lecturas...</p>
        <!-- <p v-else-if="sensorStore.error" class="text-error-600">Error al cargar lecturas: {{ sensorStore.error }}</p> -->
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
        <div v-else class="text-center text-gray-500 py-4">No se puede mostrar la gráfica porque la información del sensor no está disponible.</div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Alertas Recientes</h2>
        <AlertList :alerts="alertsForCurrentSensor" />
        <p v-if="alertsForCurrentSensor.length === 0 && !alertStore.isLoading" class="text-center text-gray-500 py-4">No hay alertas recientes para este sensor.</p>
        <p v-if="alertStore.isLoading" class="text-center text-gray-500 py-4">Cargando alertas...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSensorStore } from "@/stores/sensors";
import { useAlertStore } from "@/stores/alerts";
import { useOrganizationStore } from "@/stores/organizations";
import { useAssetStore } from "@/stores/assets"; 
import AlertList from "@/components/AlertList.vue";
import SensorChart from "@/components/SensorChart.vue"; 
import PageHeader from "@/components/PageHeader.vue";

const route = useRoute();
const router = useRouter();
const sensorStore = useSensorStore();
const alertStore = useAlertStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore(); 


const itemsPerPage = ref(10);
const currentPage = ref(1);

const sortedAllReadings = computed(() => {
  if (!sensorStore.currentSensorReadings) return [];
  // Ordena las lecturas por marca de tiempo en orden descendente (más recientes primero)
  return [...sensorStore.currentSensorReadings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
});

const totalPages = computed(() => {
  if (!sortedAllReadings.value.length) return 1;
  return Math.ceil(sortedAllReadings.value.length / itemsPerPage.value);
});

const paginatedReadings = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  return sortedAllReadings.value.slice(startIndex, endIndex);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

watch(
  () => sensorStore.currentSensorReadings,
  () => {
    currentPage.value = 1; // Reinicia a la primera página cuando cambian las lecturas
  },
  { deep: true }
);

// Función de ayuda para traducir el tipo de sensor
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


const getSensorStatusClass = (status) => {
  switch (status) {
    case "active": return "bg-green-100 text-green-800";
    case "maintenance": return "bg-yellow-100 text-yellow-800";
    case "inactive": return "bg-red-100 text-red-800";
    case "error": return "bg-red-100 text-red-800"; 
    default: return "bg-gray-100 text-gray-800";
  }
};

const translateSensorStatus = (status) => {
  switch (status) {
    case "active": return "Activo";
    case "maintenance": return "Mantenimiento";
    case "inactive": return "Inactivo";
    case "error": return "Error";
    default: return status;
  }
};

const alertsForCurrentSensor = computed(() => {
  const currentSensorId = sensorStore.currentSensor?.id;
  if (!currentSensorId || !alertStore.alerts || alertStore.alerts.length === 0) {
    return [];
  }

  const filtered = alertStore.alerts.filter((alert) => alert.sensor_id === currentSensorId);

  return filtered.map((alert) => {
    const sensor = sensorStore.sensors.find((s) => s.id === alert.sensor_id);
    const sensorName = sensor ? sensor.name : "Desconocido";

    const organizationId = alert.organization_id || sensor?.organization_id;
    const organization = organizationStore.organizations.find((org) => org.id === organizationId);
    const organizationName = organization ? organization.name : "Desconocida";

    let assetName = 'N/A';
    const effectiveAssetId = alert.asset_id || sensor?.assetId; 
    if (effectiveAssetId && assetStore.assets.length > 0) {
        const asset = assetStore.assets.find(a => a.id === effectiveAssetId);
        assetName = asset ? asset.name : 'Activo Desconocido';
    } else if (effectiveAssetId && assetStore.assets.length === 0) {
        console.log(`[idSensorPage] alertsForCurrentSensor: assetStore.assets está vacío, no se puede mapear assetName para alerta ${alert.id}.`);
    }

    return {
      ...alert,
      sensorName: sensorName,
      organizationName: organizationName,
      assetName: assetName, 
    };
  });
});

const sensorForChart = computed(() => {
  if (!sensorStore.currentSensor) return null;
  // El componente del gráfico espera un array de sensores, cada uno con un array de 'lecturas'.
  // El array 'lecturas' debe actualizarse en tiempo real mediante la lógica de suscripción del store.
  return {
    ...sensorStore.currentSensor,
    readings: sensorStore.currentSensorReadings, // Este array se actualiza con fetchAndSubscribeToDetailReadings
  };
});

const combinedAssetLocation = computed(() => {
  const sensor = sensorStore.currentSensor;
  if (!sensor) return 'N/A';

  const parts = [];
  if (sensor.assetCity && sensor.assetCity !== 'N/A') parts.push(sensor.assetCity);
  if (sensor.assetState && sensor.assetState !== 'N/A') parts.push(sensor.assetState);
  if (sensor.assetCountry && sensor.assetCountry !== 'N/A') parts.push(sensor.assetCountry);

  const result = parts.length > 0 ? parts.join(', ') : 'N/A';
  return result;
});

// Propiedad computada para verificar si hay algún umbral definido
const hasThresholds = computed(() => {
  const thresholds = sensorStore.currentSensor?.thresholds;
  if (!thresholds) return false;
  // Verifica si al menos uno de los campos de umbral no es null o undefined
  return (
    (thresholds.criticalMin !== null && thresholds.criticalMin !== undefined) ||
    (thresholds.criticalMax !== null && thresholds.criticalMax !== undefined) ||
    (thresholds.normalMin !== null && thresholds.normalMin !== undefined) ||
    (thresholds.normalMax !== null && thresholds.normalMax !== undefined) ||
    (thresholds.alarm_level !== null && thresholds.alarm_level !== undefined) ||
    (thresholds.critical_level !== null && thresholds.critical_level !== undefined)
  );
});

// Función de ayuda para verificar si un valor está definido y no es null
const isDefined = (value) => value !== undefined && value !== null;


onMounted(async () => {
  try {
    await Promise.all([
      assetStore.fetchAssets(), 
      organizationStore.fetchOrganizations(), 
      sensorStore.fetchSensors(), 
    ]);
    
    // Obtiene y se suscribe a las actualizaciones generales del sensor (para last_value, battery_level, etc.)
    await sensorStore.subscribeToSensorUpdates(); 

    // Obtiene y se suscribe a las lecturas detalladas para el gráfico y la lista histórica
    await sensorStore.fetchSensor(route.params.id); 
    await sensorStore.fetchAndSubscribeToDetailReadings(route.params.id);
    
    // Obtiene y se suscribe a las alertas del sensor actual
    await alertStore.fetchAlerts();
    await alertStore.subscribeToAlertUpdates();

  } catch (error) {
    console.error("[idSensorPage] Error al cargar sensor o configurar suscripción:", error);
    sensorStore.error = error.message || "Error desconocido al cargar el sensor.";
  }
});

onUnmounted(async () => {
  // Cancela todas las suscripciones en tiempo real cuando el componente se desmonta
  await sensorStore.unsubscribeFromDetailReadings();
  await alertStore.unsubscribeFromAlertUpdates();
  await sensorStore.unsubscribeFromSensorUpdates(); // Cancela la suscripción a las actualizaciones generales del sensor
});

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      console.log(`[idSensorPage] ID del sensor cambió de ${oldId} a ${newId}. Recargando y re-suscribiéndose a lecturas y alertas.`);
      try {
        // Cancela las suscripciones antiguas
        await sensorStore.unsubscribeFromDetailReadings();
        await alertStore.unsubscribeFromAlertUpdates();
        await sensorStore.unsubscribeFromSensorUpdates(); // Cancela la suscripción a las actualizaciones generales del sensor

        // Vuelve a obtener y a suscribirse para el nuevo sensor
        await sensorStore.fetchSensor(newId); 
        await sensorStore.fetchAndSubscribeToDetailReadings(newId);
        await alertStore.fetchAlerts(); 
        await alertStore.subscribeToAlertUpdates();
        await sensorStore.subscribeToSensorUpdates(); // Vuelve a suscribirse a las actualizaciones generales del sensor para el nuevo sensor

        console.log('[idSensorPage] Watcher: sensorStore.currentSensor (después de cambio de ID):', JSON.parse(JSON.stringify(sensorStore.currentSensor)));

      } catch (error) {
        console.error("[idSensorPage] Error al cambiar de sensor o configurar suscripción:", error);
        sensorStore.error = error.message || "Error desconocido al cargar el sensor.";
      }
    }
  }
);
</script>

<style scoped>
/* Agrega tus estilos específicos para esta página si los tienes */
.card {
  @apply bg-white shadow rounded-lg p-6;
}
.form-label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}
.form-input {
  @apply mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
}
.btn {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow;
}
.btn-secondary {
  @apply text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-gray-500;
}
.text-error-600 {
  @apply text-red-600;
}
</style>
