<template>
  <div>
    <!-- Componente de cabecera de página, como en tus otros diseños. -->
    <PageHeader
      title="Análisis Básico"
      subtitle="Resultados del análisis de vibración de tus activos y sensores."
    />

    <!-- Sección de filtros y mensaje de paginación -->
    <div class="card p-6 mb-6">
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <!-- Campo de búsqueda -->
        <div class="relative w-full sm:w-64">
          <input v-model="analysisStore.searchQuery" type="text" class="form-input pl-9" placeholder="Buscar análisis..." />
          <MagnifyingGlassIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <!-- Contenedor para los filtros, alineados a la derecha -->
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <!-- Filtro por Estado Final -->
          <div class="w-full sm:w-48">
            <label for="statusFilter" class="sr-only">Filtrar por Estado</label>
            <select
              id="statusFilter"
              v-model="analysisStore.filterByStatus"
              class="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option :value="null">Todos los estados</option>
              <option value="Normal">Normal</option>
              <option value="Alerta">Alerta</option>
              <option value="Precaucion">Precaución</option>
              <option value="Peligro">Peligro</option>
              <option value="No Definido">No Definido</option>
            </select>
          </div>

          <!-- Filtro por Activo (Dropdown de Activos Existentes) -->
          <div class="w-full sm:w-48">
            <label for="assetFilter" class="sr-only">Filtrar por Activo</label>
            <select
              id="assetFilter"
              v-model="analysisStore.filterByAssetId"
              class="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option :value="null">Todos los activos</option>
              <option v-for="asset in assetStore.assets" :key="asset.id" :value="asset.id">
                {{ asset.name }}
              </option>
            </select>
          </div>

          <!-- Filtro por Sensor (Dropdown de Sensores Existentes) -->
          <div class="w-full sm:w-48">
            <label for="sensorFilter" class="sr-only">Filtrar por Sensor</label>
            <select
              id="sensorFilter"
              v-model="analysisStore.filterBySensorId"
              class="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option :value="null">Todos los sensores</option>
              <option v-for="sensor in sensorStore.sensors" :key="sensor.id" :value="sensor.id">
                {{ sensor.name }} ({{ translateSensorType(sensor.data_type) }})
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tabla de Resultados del Análisis -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha/Hora</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sensor</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Medido</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado ISO</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Perfil</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Final</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <!-- Estados de carga y error -->
            <tr v-if="analysisStore.isLoading">
              <td colspan="7" class="px-6 py-4 text-center text-gray-500">Cargando resultados de análisis...</td>
            </tr>
            <tr v-else-if="analysisStore.error">
              <td colspan="7" class="px-6 py-4 text-center text-red-600">Error: {{ analysisStore.error }}</td>
            </tr>
            <tr v-else-if="analysisStore.getPaginatedAnalysisResults.length === 0">
              <td colspan="7" class="px-6 py-4 text-center text-gray-500">No se encontraron resultados de análisis.</td>
            </tr>
            <!-- Filas de datos de análisis -->
            <tr v-else v-for="result in analysisStore.getPaginatedAnalysisResults" :key="result.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatDate(result.analysis_timestamp) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ result.asset_name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ result.sensor_name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ result.measured_value }} {{ result.sensor_unit }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', analysisStore.getStatusBadgeClass(result.iso_status)]">
                  {{ analysisStore.translateStatus(result.iso_status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', analysisStore.getStatusBadgeClass(result.profile_status)]">
                  {{ analysisStore.translateStatus(result.profile_status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', analysisStore.getStatusBadgeClass(result.final_status)]">
                  {{ analysisStore.translateStatus(result.final_status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Componente de Paginación -->
      <div class="mt-4">
        <Pagination
          :total-items="analysisStore.getTotalFilteredResults"
          :current-page="analysisStore.currentPage"
          :items-per-page="analysisStore.itemsPerPage"
          @page-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAnalysisStore } from '~/stores/analysis';
import { useSensorStore } from '~/stores/sensors';
import { useAssetStore } from '~/stores/assets';
import PageHeader from '~/components/PageHeader.vue';
import Pagination from '~/components/Pagination.vue';
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline"; // Importa el ícono

definePageMeta({
  // middleware: ['auth'] // Descomenta esta línea si estás usando un middleware de autenticación global en Nuxt.
});

// Inicializar las stores Pinia necesarias.
const analysisStore = useAnalysisStore();
const sensorStore = useSensorStore();
const assetStore = useAssetStore();

/**
 * handlePageChange: Método llamado por el componente Pagination cuando cambia la página.
 * Actualiza la página actual en la store de análisis.
 * @param {number} page - El nuevo número de página.
 */
const handlePageChange = (page) => {
  analysisStore.setCurrentPage(page);
};

/**
 * formatDate: Función de utilidad para formatear marcas de tiempo en un formato legible localmente.
 * @param {string | Date} date - La fecha/hora a formatear.
 * @returns {string} La fecha/hora formateada o 'N/A' si no es válida.
 */
const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * translateSensorType: Helper para traducir los tipos de sensor de la base de datos a un formato más amigable en la UI.
 * @param {string} type - El tipo de sensor (ej. 'vibration', 'temperature').
 * @returns {string} El tipo de sensor traducido.
 */
const translateSensorType = (type) => {
  switch (type) {
    case "vibration": return "Vibración";
    case "temperature": return "Temperatura";
    case "humidity": return "Humedad";
    case "pressure": return "Presión";
    case "current": return "Corriente";
    case "voltage": return "Voltaje";
    case "other": return "Otro";
    default: return type;
  }
};


// Hook de ciclo de vida 'onMounted': Se ejecuta cuando el componente está montado en el DOM.
onMounted(async () => {
  // Cargar primero los datos de sensores y activos. Esto es importante para que los filtros
  // dropdowns y el mapeo de nombres en la tabla funcionen correctamente al cargar la página.
  await Promise.all([
    sensorStore.fetchSensors(),
    assetStore.fetchAssets()
  ]);

  // Después de cargar las dependencias, cargar los resultados del análisis y suscribirse a cambios en tiempo real.
  await analysisStore.fetchAnalysisResults();
  analysisStore.subscribeToAnalysisResults();
});

// Hook de ciclo de vida 'onUnmounted': Se ejecuta cuando el componente está a punto de ser desmontado.
// Es crucial desuscribirse de los listeners en tiempo real para evitar fugas de memoria.
onUnmounted(() => {
  analysisStore.unsubscribeFromAnalysisResults();
});

// Watcher: Observa cambios en los filtros de la store de análisis.
// Cada vez que un filtro cambia, la paginación se reinicia a la primera página para una mejor UX.
watch([
  () => analysisStore.filterByStatus,
  () => analysisStore.filterByAssetId,
  () => analysisStore.filterBySensorId,
  () => analysisStore.searchQuery // Agregado para observar cambios en la búsqueda
], () => {
  analysisStore.setCurrentPage(1);
});
</script>

<style scoped>
/* Estilos generales para las tarjetas, alineados con tus otros diseños. */
.card {
  @apply bg-white shadow-md rounded-lg;
}

/* Estilos para los select (dropdowns) de filtro. */
.form-select {
  @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm;
}

/* Estilos para los badges de estado. Las clases de color (bg-green-100, text-green-800, etc.)
   son proporcionadas por el método getStatusBadgeClass en la store. */
.px-2.inline-flex.text-xs.leading-5.font-semibold.rounded-full {
  /* No se necesita CSS adicional aquí si Tailwind ya está configurado y las clases se aplican directamente. */
}
</style>
