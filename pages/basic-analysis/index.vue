<template>
  <div>
    <PageHeader
      title="Análisis por Activo"
      subtitle="Resultados del análisis de vibración agrupados por cada activo."
    />

    <div class="card p-6 mb-6">
      <!-- Controles de Filtro -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input 
            v-model="analysisStore.searchQuery"
            type="text" 
            class="form-input pl-9" 
            placeholder="Buscar por activo o sensor..." />
          <MagnifyingGlassIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div class="w-full sm:w-48">
            <select v-model="analysisStore.filterByStatus" class="form-select">
              <option value="">Todos los estados</option>
              <option value="Normal">Normal</option>
              <option value="Alerta">Alerta</option>
              <option value="Precaucion">Precaución</option>
              <option value="Peligro">Peligro</option>
              <option value="Crítico">Crítico</option>
              <option value="No Definido">No Definido</option>
            </select>
          </div>
          <div class="w-full sm:w-48">
            <select v-model="analysisStore.filterByAssetId" class="form-select">
              <option value="">Todos los activos</option>
              <option v-for="asset in assetStore.assets" :key="asset.id" :value="asset.id">
                {{ asset.name }}
              </option>
            </select>
          </div>
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
            <tr v-else-if="!analysisStore.getPaginatedResults || analysisStore.getPaginatedResults.length === 0">
              <td colspan="5" class="table-cell-feedback">No se encontraron activos con los filtros actuales.</td>
            </tr>
            
            <template v-else v-for="asset in analysisStore.getPaginatedResults" :key="asset.asset_id">
              <tr class="hover:bg-gray-50 cursor-pointer" @click="toggleExpand(asset.asset_id)">
                <td class="table-cell">{{ formatDate(asset.latest_timestamp) }}</td>
                <td class="table-cell font-medium text-gray-900">{{ asset.asset_name }}</td>
                <td class="table-cell">{{ asset.sensor_readings.length }} mediciones</td>
                <td class="table-cell">
                  <span :class="['status-badge', getStatusBadgeClass(asset.overall_status)]">
                    {{ analysisStore.translateStatus(asset.overall_status) }}
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
                    <div class="p-4 border-l-4" :class="getStatusBorderClass(asset.overall_status)">
                        <h4 class="font-semibold text-sm mb-3 text-gray-700">Detalle de mediciones para {{ asset.asset_name }}:</h4>
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-100">
                               <tr>
                                   <th class="detail-table-header">Fecha/Hora</th>
                                   <th class="detail-table-header">Sensor</th>
                                   <th class="detail-table-header">Valor Medido</th>
                                   <th class="detail-table-header">Estado</th>
                                   <!-- INICIO DE LA MODIFICACIÓN: Nueva columna -->
                                   <th class="detail-table-header">Umbrales / Perfil</th>
                                   <!-- FIN DE LA MODIFICACIÓN -->
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
                                            {{ reading.measured_value }} {{ reading.sensor_unit }}
                                        </div>
                                   </td>
                                   <td class="detail-table-cell">
                                       <span :class="['status-badge', getStatusBadgeClass(reading.final_status)]">
                                            {{ analysisStore.translateStatus(reading.final_status) }}
                                        </span>
                                   </td>
                                   <!-- INICIO DE LA MODIFICACIÓN: Contenido de la nueva celda -->
                                   <td class="detail-table-cell align-top text-xs">
                                     <template v-if="sensorStore.getSensorById(reading.sensor_id)">
                                       <div v-if="sensorStore.getSensorById(reading.sensor_id).type === 'vibration'">
                                         <template v-if="assetStore.getAssetById(reading.asset_id)">
                                            <div v-if="assetStore.getAssetById(reading.asset_id).custom_vibration_profile_id && customProfileStore.getProfileById(assetStore.getAssetById(reading.asset_id).custom_vibration_profile_id)">
                                                <p class="font-bold">{{ customProfileStore.getProfileById(assetStore.getAssetById(reading.asset_id).custom_vibration_profile_id).name }}</p>
                                                <p class="text-gray-500 mb-1">(Personalizado)</p>
                                                <table class="min-w-full text-left">
                                                    <tbody>
                                                        <tr v-for="range in customProfileStore.getProfileById(assetStore.getAssetById(reading.asset_id).custom_vibration_profile_id).ranges" :key="range.id">
                                                            <td class="pr-2 py-0.5"><span :class="getSeverityClass(range.severity)" class="px-2 py-0.5 rounded-full font-bold">Z. {{range.severity}}</span></td>
                                                            <td class="py-0.5">{{range.min_value}} - {{range.max_value}}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div v-else-if="assetStore.getAssetById(reading.asset_id).profileDisplayName !== 'N/A'">
                                                <p class="font-bold">{{ assetStore.getAssetById(reading.asset_id).profileDisplayName }}</p>
                                                <p class="text-gray-500">(Estándar ISO)</p>
                                            </div>
                                            <div v-else class="text-gray-400 italic">Sin perfil asignado</div>
                                         </template>
                                       </div>
                                       <div v-else-if="sensorStore.getSensorById(reading.sensor_id).thresholds && Object.keys(sensorStore.getSensorById(reading.sensor_id).thresholds).length > 0">
                                            <ul class="space-y-1">
                                                <li v-if="isDefined(sensorStore.getSensorById(reading.sensor_id).thresholds.criticalMax)" class="flex justify-between"><span>Crítico ></span> <span class="font-semibold text-red-600">{{ sensorStore.getSensorById(reading.sensor_id).thresholds.criticalMax }}</span></li>
                                                <li v-if="isDefined(sensorStore.getSensorById(reading.sensor_id).thresholds.normalMax)" class="flex justify-between"><span>Normal <</span> <span class="font-semibold text-green-600">{{ sensorStore.getSensorById(reading.sensor_id).thresholds.normalMax }}</span></li>
                                                <li v-if="isDefined(sensorStore.getSensorById(reading.sensor_id).thresholds.normalMin)" class="flex justify-between"><span>Normal ></span> <span class="font-semibold text-green-600">{{ sensorStore.getSensorById(reading.sensor_id).thresholds.normalMin }}</span></li>
                                                <li v-if="isDefined(sensorStore.getSensorById(reading.sensor_id).thresholds.criticalMin)" class="flex justify-between"><span>Crítico <</span> <span class="font-semibold text-red-600">{{ sensorStore.getSensorById(reading.sensor_id).thresholds.criticalMin }}</span></li>
                                            </ul>
                                       </div>
                                       <div v-else class="text-gray-400 italic">Sin umbrales</div>
                                     </template>
                                   </td>
                                   <!-- FIN DE LA MODIFICACIÓN -->
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
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useAnalysisStore } from '~/stores/analysis';
import { useSensorStore } from '~/stores/sensors';
import { useAssetStore } from '~/stores/assets';
// ++ INICIO DE LA MODIFICACIÓN: Importar el store de perfiles personalizados ++
import { useCustomVibrationProfileStore } from '~/stores/customVibrationProfiles';
import PageHeader from '~/components/PageHeader.vue';
import Pagination from '~/components/Pagination.vue';
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/vue/24/outline";

definePageMeta({
  // middleware: ['auth'] 
});

const analysisStore = useAnalysisStore();
const sensorStore = useSensorStore();
const assetStore = useAssetStore();
const customProfileStore = useCustomVibrationProfileStore(); // ++ Añadido

const expandedAssets = ref([]);

const toggleExpand = (assetId) => {
    const index = expandedAssets.value.indexOf(assetId);
    if (index > -1) {
        expandedAssets.value.splice(index, 1);
    } else {
        expandedAssets.value.push(assetId);
    }
};

const getStatusBadgeClass = (status) => {
    if (!status) return 'bg-gray-200 text-gray-700';
    const normalizedStatus = status.trim().split(' (')[0].toLowerCase();
    const statusStyles = { 'normal': 'bg-green-100 text-green-800', 'alerta': 'bg-yellow-100 text-yellow-800', 'precaucion': 'bg-orange-500 text-white', 'precaución': 'bg-orange-500 text-white', 'peligro': 'bg-red-500 text-white', 'crítico': 'bg-red-700 text-white font-bold', 'critico': 'bg-red-700 text-white font-bold', 'default': 'bg-gray-200 text-gray-700' };
    return statusStyles[normalizedStatus] || statusStyles.default;
};

const getStatusBorderClass = (status) => {
    if (!status) return 'border-gray-300';
    const normalizedStatus = status.trim().split(' (')[0].toLowerCase();
    const borderStyles = { 'normal': 'border-green-400', 'alerta': 'border-yellow-400', 'precaucion': 'border-orange-500', 'precaución': 'border-orange-500', 'peligro': 'border-red-500', 'crítico': 'border-red-700', 'critico': 'border-red-700', 'default': 'border-gray-300' };
    return borderStyles[normalizedStatus] || borderStyles.default;
};

const handlePageChange = (page) => {
  analysisStore.setCurrentPage(page);
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

// ++ INICIO DE LA MODIFICACIÓN: Funciones de ayuda para umbrales ++
const getSeverityClass = (severity) => ({'A': 'bg-green-100 text-green-800', 'B': 'bg-blue-100 text-blue-800','C': 'bg-yellow-100 text-yellow-800', 'D': 'bg-red-100 text-red-800',}[severity] || 'bg-gray-100');
const isDefined = (value) => value !== null && value !== undefined;
// ++ FIN DE LA MODIFICACIÓN ++

onMounted(async () => {
  // ++ MODIFICACIÓN: Cargar todos los datos necesarios en paralelo ++
  await Promise.all([
      analysisStore.fetchAnalysisResults(),
      sensorStore.fetchSensors(),
      assetStore.fetchAssets(),
      customProfileStore.fetchProfiles() // Cargar perfiles personalizados
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
.card { @apply bg-white shadow-md rounded-lg; }
.form-input { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow; }
.form-select { @apply block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow; }
.table-header { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
.table-cell { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-700; }
.table-cell-feedback { @apply px-6 py-8 text-center text-sm text-gray-500; }
.status-badge { @apply px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize; }
.axis-badge { @apply px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-md items-center; }
.detail-table-header { @apply px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider; }
.detail-table-cell { @apply px-4 py-3 whitespace-nowrap text-sm text-gray-700; }
</style>