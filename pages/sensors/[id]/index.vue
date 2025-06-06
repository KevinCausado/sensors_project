<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSensorStore } from "@/stores/sensors";
import { useAlertStore } from "@/stores/alerts";
import { useOrganizationStore } from "@/stores/organizations"; // Import organization store
import AlertList from "@/components/AlertList.vue"; // Make sure this path is correct

// 1. Declare stores and other dependencies first
const route = useRoute();
const router = useRouter();
const sensorStore = useSensorStore();
const alertStore = useAlertStore();
const organizationStore = useOrganizationStore(); // Initialize organization store

// --- Paginación para Lecturas Recientes ---
const itemsPerPage = ref(10); // Puedes ajustar cuántas lecturas mostrar por página
const currentPage = ref(1);

// 2. Then, define computed properties that depend on the stores
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
    currentPage.value = 1;
  },
  { deep: true }
);

// Métodos para clases de estado y traducción
const getSensorStatusClass = (status) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "maintenance":
      return "bg-yellow-100 text-yellow-800";
    case "inactive":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const translateSensorStatus = (status) => {
  switch (status) {
    case "active":
      return "Activo";
    case "maintenance":
      return "Mantenimiento";
    case "inactive":
      return "Inactivo";
    default:
      return status;
  }
};

const getAlertClass = (severity) => {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "warning":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "info":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// Propiedad computada para filtrar y ENRIQUECER las alertas para el sensor actual
const alertsForCurrentSensor = computed(() => {
  const currentSensorId = sensorStore.currentSensor?.id;
  if (!currentSensorId || !alertStore.alerts || alertStore.alerts.length === 0) {
    return [];
  }

  // Filter alerts by the current sensor's ID
  const filtered = alertStore.alerts.filter((alert) => alert.sensor_id === currentSensorId);

  // Now, enrich each filtered alert with sensor and organization details
  return filtered.map((alert) => {
    // Find the sensor associated with this alert
    const sensor = sensorStore.sensors.find((s) => s.id === alert.sensor_id);
    const sensorName = sensor ? sensor.name : "Desconocido";

    // Find the organization associated with this alert
    // If the alert has an organization_id, use it. Otherwise, try to get from the sensor.
    const organizationId = alert.organization_id || sensor?.organization_id;
    const organization = organizationStore.organizations.find((org) => org.id === organizationId);
    const organizationName = organization ? organization.name : "Desconocida";

    return {
      ...alert,
      sensorName: sensorName,
      organizationName: organizationName,
    };
  });
});

// Propiedad computada para el SensorChart
const sensorForChart = computed(() => {
  if (!sensorStore.currentSensor) return null;
  return {
    ...sensorStore.currentSensor,
    readings: sensorStore.currentSensorReadings, // SensorChart espera las lecturas dentro del objeto sensor
  };
});

// Lifecycle Hooks
onMounted(async () => {
  try {
    await sensorStore.fetchSensors(); // Fetch all sensors to populate sensorStore.sensors
    await organizationStore.fetchOrganizations(); // Fetch all organizations
    await sensorStore.fetchSensor(route.params.id);
    await sensorStore.fetchAndSubscribeToDetailReadings(route.params.id);
    await alertStore.fetchAlerts(); // Fetch all alerts
    await alertStore.subscribeToAlertUpdates(); // Subscribe to real-time alert updates
  } catch (error) {
    console.error("Error al cargar sensor o configurar suscripción:", error);
    sensorStore.error = error.message || "Error desconocido al cargar el sensor.";
  }
});

onUnmounted(async () => {
  await sensorStore.unsubscribeFromDetailReadings();
  await alertStore.unsubscribeFromAlertUpdates();
});

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      console.log(`ID del sensor cambió de ${oldId} a ${newId}. Recargando y re-suscribiéndose a lecturas y alertas.`);
      try {
        await sensorStore.unsubscribeFromDetailReadings();
        await alertStore.unsubscribeFromAlertUpdates();

        await sensorStore.fetchSensor(newId);
        await sensorStore.fetchAndSubscribeToDetailReadings(newId);
        await alertStore.fetchAlerts(); // Re-fetch alerts for potential changes
        await alertStore.subscribeToAlertUpdates(); // Re-subscribe for real-time updates
      } catch (error) {
        console.error("Error al cambiar de sensor o configurar suscripción:", error);
        sensorStore.error = error.message || "Error desconocido al cargar el sensor.";
      }
    }
  }
);
</script>

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

    <div v-else-if="sensorStore.error" class="text-center py-8 text-error-600">
      <p>Error al cargar el sensor: {{ sensorStore.error }}</p>
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
            <p class="text-sm font-medium text-gray-500">Número de Serie</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.serial_number }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Modelo</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.model }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tipo</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.type }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Unidad</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.unit }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Organización</p>
            <p class="mt-1 text-gray-900">{{ sensorStore.currentSensor.organizationName || "N/A" }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Ubicación Geográfica:</p>
            <p class="mt-1 text-gray-900">
              {{ sensorStore.currentSensor?.city || "N/A" }}
              <span v-if="sensorStore.currentSensor?.city && (sensorStore.currentSensor?.state || sensorStore.currentSensor?.country)">,</span>
              {{ sensorStore.currentSensor?.state || "" }}
              <span v-if="(sensorStore.currentSensor?.city || sensorStore.currentSensor?.state) && sensorStore.currentSensor?.country">,</span>
              {{ sensorStore.currentSensor?.country || "" }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Descripción de la ubicación</p>
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
        <div v-if="sensorStore.currentSensor?.thresholds">
          <p class="text-sm text-gray-600 mb-4">
            Estos umbrales definen los rangos de operación de tu sensor:
            <br />
            •
            <strong class="text-green-700">Normal:</strong>
            Valores entre
            <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.normalMin }}</span>
            y
            <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.normalMax }}</span>
            .
            <br />
            •
            <strong class="text-yellow-700">Advertencia:</strong>
            Valores fuera del rango Normal pero dentro de los límites Críticos.
            <br />
            •
            <strong class="text-red-700">Crítico:</strong>
            Valores fuera de los límites
            <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.criticalMin }}</span>
            o
            <span class="font-semibold">{{ sensorStore.currentSensor.thresholds.criticalMax }}</span>
            .
          </p>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div v-if="sensorStore.currentSensor.thresholds.criticalMin !== undefined && sensorStore.currentSensor.thresholds.criticalMin !== null">
              <p class="text-sm font-medium text-red-500">Mínimo Crítico</p>
              <p class="mt-1 text-lg font-semibold text-red-800">{{ sensorStore.currentSensor.thresholds.criticalMin }} {{ sensorStore.currentSensor.unit }}</p>
            </div>

            <div v-if="sensorStore.currentSensor.thresholds.criticalMax !== undefined && sensorStore.currentSensor.thresholds.criticalMax !== null">
              <p class="text-sm font-medium text-red-500">Máximo Crítico</p>
              <p class="mt-1 text-lg font-semibold text-red-800">{{ sensorStore.currentSensor.thresholds.criticalMax }} {{ sensorStore.currentSensor.unit }}</p>
            </div>

            <div v-if="sensorStore.currentSensor.thresholds.normalMin !== undefined && sensorStore.currentSensor.thresholds.normalMin !== null">
              <p class="text-sm font-medium text-green-500">Mínimo Normal</p>
              <p class="mt-1 text-lg font-semibold text-green-800">{{ sensorStore.currentSensor.thresholds.normalMin }} {{ sensorStore.currentSensor.unit }}</p>
            </div>

            <div v-if="sensorStore.currentSensor.thresholds.normalMax !== undefined && sensorStore.currentSensor.thresholds.normalMax !== null">
              <p class="text-sm font-medium text-green-500">Máximo Normal</p>
              <p class="mt-1 text-lg font-semibold text-green-800">{{ sensorStore.currentSensor.thresholds.normalMax }} {{ sensorStore.currentSensor.unit }}</p>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-4 text-gray-500">No hay umbrales definidos para este sensor.</div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Historial de Lecturas Recientes</h2>
        <p v-if="sensorStore.isLoading" class="text-gray-500">Cargando lecturas...</p>
        <p v-else-if="sensorStore.error" class="text-error-600">Error al cargar lecturas: {{ sensorStore.error }}</p>
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
        <p v-if="alertStore.error" class="text-center text-error-600 py-4">Error al cargar alertas: {{ alertStore.error }}</p>
      </div>
    </div>
  </div>
</template>

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
