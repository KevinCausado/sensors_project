<template>
  <div class="sensor-chart">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-500">Cargando datos de la gráfica...</p>
    </div>
    <div v-else-if="error" class="text-center py-8 text-error-600">
      {{ error }}
    </div>
    <div v-else>
      <div class="flex justify-between items-center mb-4" v-if="showTimeRangeControls || props.sensors.length > 1">
        <div class="space-x-2">
          <button
            v-for="range in timeRanges"
            :key="range.value"
            @click="selectedRange = range.value"
            class="px-3 py-1 text-sm rounded-md"
            :class="selectedRange === range.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'">
            {{ range.label }}
          </button>
        </div>
      </div>

      <ClientOnly>
        <div>
          <p v-if="props.sensors.length === 0" class="text-center text-gray-500 py-4">{{ initialEmptyMessage }}</p>
          <p v-else-if="series.length === 0 && !loading" class="text-center text-gray-500 py-4">{{ emptyDataMessage }}</p>
          <VueApexCharts
            v-else
            :options="chartOptions"
            :series="series"
            :height="height"
          />
        </div>
        <template #fallback>
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p class="ml-3 text-gray-500">Cargando gráfica...</p>
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useNuxtApp } from '#app';
import VueApexCharts from 'vue3-apexcharts';

// Props
const props = defineProps({
  sensors: {
    type: Array,
    required: true,
    default: () => []
  },
  height: {
    type: [String, Number],
    default: 300
  },
  showTimeRangeControls: {
    type: Boolean,
    default: false
  },
  initialEmptyMessage: {
    type: String,
    default: 'Selecciona uno o más sensores para ver la gráfica.'
  },
  emptyDataMessage: {
    type: String,
    default: 'No hay lecturas disponibles para los sensores seleccionados en este rango de tiempo.'
  }
});

// State
const loading = ref(false); // La carga ahora se maneja en el store
const error = ref(null);
const selectedRange = ref('day'); // Este control puede permanecer para futuras funcionalidades

const timeRanges = [
  { value: 'day', label: '24h' },
  { value: 'week', label: '7 días' },
  { value: 'month', label: '30 días' }
];

/**
 * Parsea un valor a float de forma segura.
 */
function safeParseFloat(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

const chartOptions = computed(() => ({
  chart: {
    type: 'line',
    animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 500 }},
    toolbar: { show: true },
    locales: [{ name: 'es', options: { months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'], shortMonths: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], shortDays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], toolbar: { download: 'Descargar CSV', selection: 'Selección', selectionZoom: 'Zoom de Selección', zoomIn: 'Acercar', zoomOut: 'Alejar', pan: 'Panorámica', reset: 'Resetear Zoom' } } }],
    defaultLocale: 'es'
  },
  stroke: { curve: 'smooth', width: 2 },
  markers: { size: 0, hover: { size: 5 } },
  xaxis: { type: 'datetime', labels: { datetimeUTC: false, format: 'dd MMM HH:mm' } },
  yaxis: { labels: { formatter: (value) => value !== undefined && value !== null ? value.toFixed(2) : '' } },
  tooltip: { x: { format: 'dd MMM HH:mm:ss' }, y: { formatter: (val) => val !== undefined && val !== null ? val.toFixed(2) : 'N/A' } },
  legend: { position: 'top' },
  grid: { borderColor: '#f1f1f1' },
  theme: { palette: 'palette1' }
}));

// =================================================================================
// INICIO DE LA MODIFICACIÓN: Lógica de `series` simplificada y reactiva
// =================================================================================
const series = computed(() => {
  const allSeries = [];

  props.sensors.forEach(sensor => {
    if (!sensor || !sensor.id) return;

    // Los datos ahora vienen completos y listos desde el prop `readings`
    const dataToDisplay = sensor.readings || [];

    if (sensor.type === 'vibration') {
      if (dataToDisplay.length > 0) {
        const sortedData = [...dataToDisplay].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        allSeries.push({
          name: `${sensor.name} (X)`,
          data: sortedData.map(d => ({ x: new Date(d.timestamp).getTime(), y: safeParseFloat(d.x?.oavelocity ?? d.x) }))
        });
        allSeries.push({
          name: `${sensor.name} (Y)`,
          data: sortedData.map(d => ({ x: new Date(d.timestamp).getTime(), y: safeParseFloat(d.y?.oavelocity ?? d.y) }))
        });
        allSeries.push({
          name: `${sensor.name} (Z)`,
          data: sortedData.map(d => ({ x: new Date(d.timestamp).getTime(), y: safeParseFloat(d.z?.oavelocity ?? d.z) }))
        });
      }
    } else {
      // Lógica para sensores no-vibración
      if (dataToDisplay.length > 0) {
        const sortedData = [...dataToDisplay].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        allSeries.push({
          name: `${sensor.name} (${sensor.unit || ''})`,
          data: sortedData.map(d => ({ x: new Date(d.timestamp).getTime(), y: safeParseFloat(d.value) }))
        });
      }
    }
  });

  return allSeries.filter(s => s.data && s.data.some(point => point.y !== null));
});
// =================================================================================
// FIN DE LA MODIFICACIÓN
// =================================================================================
</script>

<style scoped>
/* Tus estilos si tienes alguno */
</style>
