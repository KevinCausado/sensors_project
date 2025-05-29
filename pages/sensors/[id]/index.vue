<template>
  <div>
    <PageHeader
      title="Detalles del Sensor"
      :subtitle="sensorStore.currentSensor?.name">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink
            to="/sensors"
            class="btn btn-secondary">
            Volver
          </NuxtLink>
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

    <div v-else-if="!sensorStore.currentSensor" class="text-center py-8 text-gray-500">
      Sensor no encontrado.
    </div>

    <div v-else class="space-y-6">
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Información General</h2>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-500">Nombre</label>
            <p class="mt-1 text-sm text-gray-900">{{ sensorStore.currentSensor.name }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Tipo</label>
            <p class="mt-1 text-sm text-gray-900">{{ translateSensorType(sensorStore.currentSensor.type) }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Estado</label>
            <span class="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getStatusClass(sensorStore.currentSensor.status)">
              {{ translateStatus(sensorStore.currentSensor.status) }}
            </span>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Ubicación</label>
            <p class="mt-1 text-sm text-gray-900">{{ sensorStore.currentSensor.location }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Organización</label>
            <p class="mt-1 text-sm text-gray-900">{{ sensorStore.currentSensor.organizationName || 'N/A' }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Última Lectura</label>
            <p class="mt-1 text-sm text-gray-900">
              {{ formatDate(sensorStore.currentSensor.lastReading) }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Valor Actual</label>
            <p class="mt-1 text-lg font-bold text-primary-600">
              {{ sensorStore.currentSensor.value }} {{ sensorStore.currentSensor.unit }}
            </p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Umbrales</h2>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-500">Mínimo</label>
            <p class="mt-1 text-sm text-gray-900">{{ sensorStore.currentSensor.thresholds.min }} {{ sensorStore.currentSensor.unit }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Máximo</label>
            <p class="mt-1 text-sm text-gray-900">{{ sensorStore.currentSensor.thresholds.max }} {{ sensorStore.currentSensor.unit }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Mínimo Crítico</label>
            <p class="mt-1 text-sm text-gray-900">{{ sensorStore.currentSensor.thresholds.criticalMin }} {{ sensorStore.currentSensor.unit }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Máximo Crítico</label>
            <p class="mt-1 text-sm text-gray-900">{{ sensorStore.currentSensor.thresholds.criticalMax }} {{ sensorStore.currentSensor.unit }}</p>
          </div>

          <div v-if="sensorStore.currentSensor.thresholds.normalMin !== undefined">
            <label class="block text-sm font-medium text-gray-500">Mínimo Normal</label>
            <p class="mt-1 text-sm text-gray-900">{{ sensorStore.currentSensor.thresholds.normalMin }} {{ sensorStore.currentSensor.unit }}</p>
          </div>

          <div v-if="sensorStore.currentSensor.thresholds.normalMax !== undefined">
            <label class="block text-sm font-medium text-gray-500">Máximo Normal</label>
            <p class="mt-1 text-sm text-gray-900">{{ sensorStore.currentSensor.thresholds.normalMax }} {{ sensorStore.currentSensor.unit }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Historial de Lecturas Recientes</h2>
        <p v-if="sensorStore.isLoadingReadings" class="text-gray-500">Cargando lecturas...</p>
        <p v-else-if="sensorStore.errorReadings" class="text-error-600">Error al cargar lecturas: {{ sensorStore.errorReadings }}</p>
        <div v-else-if="paginatedReadings.length === 0" class="text-gray-500">
          No hay lecturas disponibles para este sensor.
        </div>
        <ul v-else class="space-y-2">
          <li v-for="reading in paginatedReadings" :key="reading.timestamp" class="flex justify-between items-center p-2 bg-gray-50 rounded-md">
            <span>{{ new Date(reading.timestamp).toLocaleString() }}</span>
            <span class="font-medium">{{ reading.value }} {{ sensorStore.currentSensor.unit }}</span>
          </li>
        </ul>

        <div v-if="totalPages > 1" class="flex justify-center items-center mt-4 space-x-2">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="px-3 py-1 rounded-md text-sm"
            :class="currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'"
          >
            Anterior
          </button>
          <span class="text-sm text-gray-700">Página {{ currentPage }} de {{ totalPages }}</span>
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 rounded-md text-sm"
            :class="currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'"
          >
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
        <div v-else class="text-center text-gray-500 py-4">
          No se puede mostrar la gráfica porque la información del sensor no está disponible.
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Alertas Recientes</h2>
        <AlertList :alerts="sensorAlerts" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSensorStore } from '~/stores/sensors';
import { useAlertStore } from '~/stores/alerts';

import SensorChart from '~/components/SensorChart.vue';
import PageHeader from '~/components/PageHeader.vue';
import AlertList from '~/components/AlertList.vue';

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const sensorStore = useSensorStore();
const alertStore = useAlertStore();

// --- Paginación para Lecturas Recientes ---
const itemsPerPage = ref(10); // Puedes ajustar cuántas lecturas mostrar por página
const currentPage = ref(1);

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

watch(sensorStore.currentSensorReadings, () => {
  currentPage.value = 1;
}, { deep: true });


const sensorAlerts = computed(() => {
  // alertStore.alertsForSensor filtra del array global de alertas
  return alertStore.alertsForSensor(route.params.id);
});

const sensorForChart = computed(() => {
  if (!sensorStore.currentSensor) return null;
  return {
    ...sensorStore.currentSensor,
    readings: sensorStore.currentSensorReadings,
  };
});

// Métodos de utilidad (se mantienen sin cambios)
const translateSensorType = (type) => {
  const types = {
    'temperature': 'Temperatura',
    'humidity': 'Humedad',
    'pressure': 'Presión',
    'level': 'Nivel',
    'power': 'Energía',
    'air-quality': 'Calidad del Aire'
  };
  return types[type] || type;
};

const translateStatus = (status) => {
  const statuses = {
    'active': 'Activo',
    'inactive': 'Inactivo',
    'maintenance': 'Mantenimiento',
    'error': 'Error'
  };
  return statuses[status] || status;
};

const getStatusClass = (status) => {
  switch (status) {
    case 'active':
      return 'bg-success-100 text-success-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'maintenance':
      return 'bg-warning-100 text-warning-800';
    case 'error':
      return 'bg-error-100 text-error-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('es-ES');
};

onMounted(async () => {
  const sensorId = route.params.id;
  try {
    if (!sensorStore.currentSensor || sensorStore.currentSensor.id !== sensorId) {
      await sensorStore.fetchSensor(sensorId);
    }
    await sensorStore.fetchAndSubscribeToDetailReadings(sensorId);
    
    // CARGAR Y SUSCRIBIR A ALERTAS
    await alertStore.fetchAlerts(); // Carga inicial de todas las alertas
    await alertStore.subscribeToAlertUpdates(); // <--- NUEVO: Suscribirse a Realtime para alertas
  } catch (error) {
    console.error('Error al cargar sensor o configurar suscripción:', error);
    sensorStore.error = error.message || 'Error desconocido al cargar el sensor.';
  }
});

onUnmounted(async () => {
  await sensorStore.unsubscribeFromDetailReadings();
  await alertStore.unsubscribeFromAlertUpdates(); // <--- NUEVO: Desuscribirse de Realtime para alertas
});

watch(() => route.params.id, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    console.log(`ID del sensor cambió de ${oldId} a ${newId}. Recargando y re-suscribiéndose a lecturas de detalle.`);
    try {
      await sensorStore.unsubscribeFromDetailReadings();
      await alertStore.unsubscribeFromAlertUpdates(); // <--- NUEVO: Desuscribirse de alertas al cambiar de sensor
      
      await sensorStore.fetchSensor(newId);
      await sensorStore.fetchAndSubscribeToDetailReadings(newId);
      await alertStore.fetchAlerts(); // Recargar alertas para el nuevo sensor
      await alertStore.subscribeToAlertUpdates(); // <--- NUEVO: Suscribirse de nuevo para alertas del nuevo sensor
    } catch (error) {
      console.error('Error al cambiar de sensor o configurar suscripción:', error);
      sensorStore.error = error.message || 'Error desconocido al cargar el sensor.';
    }
  }
});
</script>

<style scoped>
/* Tus estilos aquí */
</style>