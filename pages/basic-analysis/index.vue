<template>
  <div>
    <PageHeader
      title="Análisis por Activo"
      subtitle="Resultados del análisis de vibración agrupados por cada activo."
    />

    <div class="card">
      <!-- Controles de Filtro -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input v-model="analysisStore.searchQuery" type="text" class="form-input pl-9"placeholder="Buscar por activo o sensor..." />
          <SearchIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">        
          <select v-model="analysisStore.filterByStatus" class="form-select w-full sm:w-48">
            <option value="">Todos los estados</option>
            <option value="Normal">Normal</option>
            <option value="Advertencia">Advertencia</option>
            <option value="Crítico">Crítico</option>
            <option value="No Definido">No Definido</option>
          </select>
          
          <select v-model="analysisStore.filterByAssetId" class="form-select w-full sm:w-52">
            <option value="">Todos los activos</option>
            <option v-for="asset in assetStore.assets" :key="asset.id" :value="asset.id">
              {{ asset.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Tabla Principal de Activos -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-header">Última Actualización</th>
              <th class="table-header">Activo</th>
              <th class="table-header">Sensores con Medición</th>
              <th class="table-header">Estado General</th>
              <th class="table-header w-12"><span class="sr-only">Expandir</span></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="analysisStore.isLoading">
              <td colspan="5" class="table-cell-feedback">Cargando resultados...</td>
            </tr>
            <tr v-else-if="analysisStore.error">
              <td colspan="5" class="table-cell-feedback text-red-600">Error: {{ analysisStore.error }}</td>
            </tr>
            <tr v-else-if="!enrichedPaginatedResults || enrichedPaginatedResults.length === 0">
              <td colspan="5" class="table-cell-feedback">No se encontraron activos con los filtros actuales.</td>
            </tr>
            
            <template v-else v-for="asset in enrichedPaginatedResults" :key="asset.asset_id">
              <tr class="hover:bg-gray-50 cursor-pointer" @click="toggleExpand(asset.asset_id)">
                <td class="table-cell">{{ formatDate(asset.latest_timestamp) }}</td>
                <td class="table-cell font-medium text-gray-900">{{ asset.asset_name }}</td>
                <td class="table-cell">{{ asset.sensor_readings.length }} mediciones</td>
                <td class="table-cell">
                  <span :class="['status-badge', getStatusBadgeClass(calculateOverallStatus(asset.sensor_readings))]">
                    {{ calculateOverallStatus(asset.sensor_readings) }}
                  </span>
                </td>
                <td class="table-cell text-center">
                    <button class="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                        <ChevronDownIcon class="h-5 w-5 transition-transform" :class="{'rotate-180': expandedAssets.includes(asset.asset_id)}" />
                    </button>
                </td>
              </tr>
              <!-- Fila Desplegable con Tabla de Detalles -->
              <tr v-if="expandedAssets.includes(asset.asset_id)">
                 <td colspan="5" class="p-0 bg-gray-50">
                    <div class="p-4 border-l-4" :class="getStatusBorderClass(calculateOverallStatus(asset.sensor_readings))">
                        <h4 class="font-semibold text-sm mb-3 text-gray-700">Detalle de mediciones para {{ asset.asset_name }}:</h4>
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-100">
                               <tr>
                                   <th class="detail-table-header">Fecha/Hora</th>
                                   <th class="detail-table-header">Sensor</th>
                                   <th class="detail-table-header">Valor Medido</th>
                                   <th class="detail-table-header">Estado</th>
                                   <th class="detail-table-header">Umbrales / Perfil</th>
                               </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                               <tr v-for="reading in asset.sensor_readings" :key="reading.id">
                                   <td class="detail-table-cell">{{ formatDate(reading.analysis_timestamp) }}</td>
                                   <td class="detail-table-cell">{{ reading.sensor_name }}</td>
                                   <td class="detail-table-cell">
                                        <div v-if="reading.sensor_type === 'vibration' && reading.axes_values" class="flex items-center gap-1 sm:gap-2">
                                            <span class="axis-badge bg-red-100 text-red-800"><b class="font-bold">X:</b> {{ reading.axes_values.x }}</span>
                                            <span class="axis-badge bg-green-100 text-green-800"><b class="font-bold">Y:</b> {{ reading.axes_values.y }}</span>
                                            <span class="axis-badge bg-blue-100 text-blue-800"><b class="font-bold">Z:</b> {{ reading.axes_values.z }}</span>
                                            <span class="text-xs text-gray-500 ml-1 hidden sm:inline">{{ reading.sensor_unit }}</span>
                                        </div>
                                        <div v-else>
                                            <span class="status-badge bg-blue-100 text-blue-800 font-mono">
                                                {{ reading.measured_value }} {{ reading.sensor_unit }}
                                            </span>
                                        </div>
                                   </td>
                                   <td class="detail-table-cell">
                                       <!-- [CAMBIO CLAVE] Se usa el estado calculado en el frontend -->
                                       <span :class="['status-badge', getStatusBadgeClass(reading.calculated_status)]">
                                            {{ analysisStore.translateStatus(reading.calculated_status) }}
                                        </span>
                                   </td>
                                   <td class="detail-table-cell align-top text-xs">
                                     <template v-if="sensorStore.getSensorById(reading.sensor_id)">
                                       <div v-if="sensorStore.getSensorById(reading.sensor_id).type === 'vibration'">
                                            <div v-if="loadingProfiles.includes(reading.asset_id)" class="text-gray-400 italic">Cargando perfil...</div>
                                            <div v-else-if="sensorStore.getVibrationProfileFromCache(reading.asset_id) && sensorStore.getVibrationProfileFromCache(reading.asset_id).ranges">
                                                <p class="font-bold">{{ sensorStore.getVibrationProfileFromCache(reading.asset_id).name }}</p>
                                                <p class="text-gray-500 mb-1">
                                                  ({{ assetStore.getAssetById(reading.asset_id).custom_vibration_profile_id ? 'Personalizado' : 'Estándar ISO' }})
                                                </p>
                                                <table class="min-w-full text-left">
                                                    <tbody>
                                                        <tr v-for="range in sensorStore.getVibrationProfileFromCache(reading.asset_id).ranges" :key="range.severity">
                                                            <td class="pr-2 py-0.5"><span :class="getSeverityClass(range.severity)" class="px-2 py-0.5 rounded-full font-bold">Z. {{range.severity}}</span></td>
                                                            <td class="py-0.5">{{range.min_value}} - {{range.max_value}}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div v-else class="text-gray-400 italic">Sin perfil de vibración asignado.</div>
                                       </div>
                                       <div v-else-if="sensorStore.getSensorById(reading.sensor_id).thresholds && Object.keys(sensorStore.getSensorById(reading.sensor_id).thresholds).length > 0">
                                            <ul class="space-y-1">
                                                <li v-if="isDefined(sensorStore.getSensorById(reading.sensor_id).thresholds.criticalMax)" class="flex justify-between"><span>Crítico ></span> <span class="font-semibold text-red-600">{{ sensorStore.getSensorById(reading.sensor_id).thresholds.criticalMax }}</span></li>
                                                <li v-if="isDefined(sensorStore.getSensorById(reading.sensor_id).thresholds.normalMax)" class="flex justify-between"><span>Normal <</span> <span class="font-semibold text-green-600">{{ sensorStore.getSensorById(reading.sensor_id).thresholds.normalMax }}</span></li>
                                                <li v-if="isDefined(sensorStore.getSensorById(reading.sensor_id).thresholds.normalMin)" class="flex justify-between"><span>Normal ></span> <span class="font-semibold text-green-600">{{ sensorStore.getSensorById(reading.sensor_id).thresholds.normalMin }}</span></li>
                                                <li v-if="isDefined(sensorStore.getSensorById(reading.sensor_id).thresholds.criticalMin)" class="flex justify-between"><span>Crítico <</span> <span class="font-semibold text-red-600">{{ sensorStore.getSensorById(reading.sensor_id).thresholds.criticalMin }}</span></li>
                                            </ul>
                                       </div>
                                       <div v-else class="text-gray-400 italic">Sin umbrales definidos.</div>
                                     </template>
                                   </td>
                               </tr>
                            </tbody>
                        </table>
                    </div>
                 </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="mt-4">
        <Pagination
          :total-items="analysisStore.getTotalResults"
          :current-page="analysisStore.currentPage"
          :items-per-page="analysisStore.itemsPerPage"
          @page-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineComponent, h, computed } from 'vue';
import { useAnalysisStore } from '~/stores/analysis';
import { useSensorStore } from '~/stores/sensors';
import { useAssetStore } from '~/stores/assets';
import { useCustomVibrationProfileStore } from '~/stores/customVibrationProfiles';
import PageHeader from '~/components/PageHeader.vue';
import Pagination from '~/components/Pagination.vue';
import {ChevronDownIcon } from "@heroicons/vue/24/outline";

definePageMeta({
  // middleware: ['auth'] 
});

const SearchIcon = defineComponent({
  render: () => h('svg', { class: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    h('path', { d: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-8 8a10 10 0 1 1 17.32 5.92l4.68 4.68a1 1 0 0 1-1.42 1.42l-4.68-4.68A10 10 0 0 1 2 10z' })
  ])
});


const analysisStore = useAnalysisStore();
const sensorStore = useSensorStore();
const assetStore = useAssetStore();
const customProfileStore = useCustomVibrationProfileStore();

const expandedAssets = ref([]);
const loadingProfiles = ref([]);

// --- Lógica de Cálculo de Estado en Frontend ---

/**
 * Encuentra el rango de severidad (zona) para un valor de vibración dado.
 * @param {number} value - El valor medido.
 * @param {object} profile - El perfil de vibración con sus rangos.
 * @returns {object|null} El objeto del rango que corresponde al valor, o null.
 */
const findTriggeredRange = (value, profile) => {
  if (!profile || !profile.ranges || value === null) return null;
  const sortedRanges = [...profile.ranges].sort((a, b) => a.max_value - b.max_value);
  for (const range of sortedRanges) {
    if (value >= range.min_value && value <= range.max_value) return range;
  }
  if (sortedRanges.length > 0 && value > sortedRanges[sortedRanges.length - 1].max_value) {
      return sortedRanges[sortedRanges.length - 1];
  }
  return null;
};

/**
 * Propiedad computada que enriquece los resultados del análisis con un estado calculado en el frontend.
 */
const enrichedPaginatedResults = computed(() => {
  if (!analysisStore.getPaginatedResults) return [];
  
  return analysisStore.getPaginatedResults.map(asset => {
    const newSensorReadings = asset.sensor_readings.map(reading => {
      const newReading = { ...reading };
      
      // Por defecto, el estado calculado es el que viene de la DB.
      newReading.calculated_status = reading.final_status;

      // Si es de vibración, intentamos recalcularlo.
      if (reading.sensor_type === 'vibration') {
        const profile = sensorStore.getVibrationProfileFromCache(reading.asset_id);
        if (profile) {
          const range = findTriggeredRange(reading.measured_value, profile);
          if (range) {
            // Sobrescribimos con el estado calculado en el frontend.
            newReading.calculated_status = `${range.condition_name} (Zona ${range.severity})`;
          } else {
            newReading.calculated_status = 'No Definido';
          }
        }
      }
      return newReading;
    });
    
    return { ...asset, sensor_readings: newSensorReadings };
  });
});

/**
 * Calcula el estado general de un activo basado en el peor estado de sus sensores.
 * @param {Array} readings - El array de lecturas de sensores para un activo.
 * @returns {string} El estado de mayor severidad encontrado.
 */
const calculateOverallStatus = (readings) => {
    if (!readings || readings.length === 0) return 'No Definido';

    const severityMap = {
        'crítico': 4, 'inaceptable': 4, 'extrema': 4, 'peligro': 4,
        'advertencia': 3, 'insatisfactoria': 3, 'precaución': 3,
        'satisfactoria': 2, 'normal': 1, 'no definido': 0
    };

    let maxSeverity = 0;

    for (const reading of readings) {
        // Usa el 'calculated_status' para determinar la severidad.
        const status = (reading.calculated_status || 'No Definido').split(' (')[0].toLowerCase();
        const level = severityMap[status] ?? 0;
        if (level > maxSeverity) {
            maxSeverity = level;
        }
    }

    if (maxSeverity >= 4) return 'Crítico';
    if (maxSeverity === 3) return 'Advertencia';
    if (maxSeverity > 0) return 'Normal';
    return 'No Definido';
};


const toggleExpand = async (assetId) => {
    const index = expandedAssets.value.indexOf(assetId);
    if (index > -1) {
        expandedAssets.value.splice(index, 1);
    } else {
        expandedAssets.value.push(assetId);
        if (!sensorStore.getVibrationProfileFromCache(assetId)) {
            loadingProfiles.value.push(assetId);
            try {
                await sensorStore.getVibrationProfileForAsset(assetId);
            } catch (e) {
                console.error(`Error cargando el perfil para el activo ${assetId}:`, e);
            } finally {
                const loadingIndex = loadingProfiles.value.indexOf(assetId);
                if (loadingIndex > -1) {
                    loadingProfiles.value.splice(loadingIndex, 1);
                }
            }
        }
    }
};

/**
 * [CORREGIDO] Devuelve la clase CSS para el badge de estado, priorizando la zona.
 * @param {string} status - El estado del análisis.
 * @returns {string} Las clases de Tailwind CSS para el badge.
 */
const getStatusBadgeClass = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const statusLower = status.toLowerCase();

    // Prioriza la coloración por Zonas de vibración para máxima consistencia.
    if (statusLower.includes('zona d')) return 'bg-red-100 text-red-800';
    if (statusLower.includes('zona c')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('zona b')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('zona a')) return 'bg-green-100 text-green-800';

    // Lógica de fallback para estados generales (ej. temperatura, estado general del activo)
    if (statusLower.includes('crítico') || statusLower.includes('inaceptable')) return 'bg-red-100 text-red-800';
    if (statusLower.includes('advertencia') || statusLower.includes('insatisfactoria')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('normal') || statusLower.includes('satisfactoria')) return 'bg-green-100 text-green-800';
            
    return 'bg-gray-100 text-gray-800'; // Color por defecto
};


const getStatusBorderClass = (status) => {
    if (!status) return 'border-gray-300';
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
        case 'normal': return 'border-green-400';
        case 'advertencia': return 'border-yellow-400';
        case 'crítico': return 'border-red-500';
        default: return 'border-gray-300';
    }
};

const handlePageChange = (page) => {
  analysisStore.setCurrentPage(page);
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

const getSeverityClass = (severity) => ({'A': 'bg-green-100 text-green-800', 'B': 'bg-blue-100 text-blue-800','C': 'bg-yellow-100 text-yellow-800', 'D': 'bg-red-100 text-red-800',}[severity] || 'bg-gray-100');
const isDefined = (value) => value !== null && value !== undefined;

onMounted(async () => {
  await Promise.all([
      analysisStore.fetchAnalysisResults(),
      sensorStore.fetchSensors(),
      assetStore.fetchAssets(),
      customProfileStore.fetchProfiles()
  ]);
  analysisStore.subscribeToAnalysisResults();
});

onUnmounted(() => {
  analysisStore.unsubscribeFromAnalysisResults();
});

watch(
  [() => analysisStore.filterByStatus, () => analysisStore.filterByAssetId, () => analysisStore.searchQuery],
  () => { analysisStore.setCurrentPage(1); }
);
</script>

<style scoped>
.card { @apply bg-white shadow-md rounded-lg p-6; }
.form-input { @apply block w-full py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow; }
.form-select {
  @apply block pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
}
.table-header { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
.table-cell { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-700; }
.table-cell-feedback { @apply px-6 py-8 text-center text-sm text-gray-500; }
.status-badge { @apply px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize; }
.axis-badge { @apply px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-md items-center; }
.detail-table-header { @apply px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider; }
.detail-table-cell { @apply px-4 py-3 whitespace-nowrap text-sm text-gray-700; }
</style>
