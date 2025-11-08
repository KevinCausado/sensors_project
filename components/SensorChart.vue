<template>
  <div class="sensor-chart">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-500">Cargando datos de la gráfica...</p>
    </div>
    <div v-else-if="error" class="text-center py-8 text-red-600">
      <p>Error al cargar los datos:</p>
      <p class="text-sm">{{ error }}</p>
    </div>
    <div v-else>
      <div class="flex flex-wrap gap-4 justify-between items-center mb-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="range in timeRanges"
            :key="range.value"
            @click="handlePredefinedRangeChange(range.value)"
            class="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200"
            :class="selectedRange === range.value ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'">
            {{ range.label }}
          </button>
        </div>
        <div class="flex items-center gap-2">
           <input type="datetime-local" v-model="customStartDate" @change="handleCustomRangeChange" class="p-1.5 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500">
           <span class="text-gray-500">-</span>
           <input type="datetime-local" v-model="customEndDate" @change="handleCustomRangeChange" class="p-1.5 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500">
        </div>
      </div>

      <ClientOnly>
        <div>
          <p v-if="props.sensors.length === 0" class="text-center text-gray-500 py-4">{{ initialEmptyMessage }}</p>
          <p v-else-if="series.length === 0 && !loading" class="text-center text-gray-500 py-4">{{ emptyDataMessage }}</p>
          <VueApexCharts
            v-else
            ref="chartRef"
            :options="chartOptions"
            :series="series"
            :height="height"
            :key="chartKey"
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
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { useSensorStore } from '@/stores/sensors';
import VueApexCharts from 'vue3-apexcharts';

const props = defineProps({
  sensors: { type: Array, required: true, default: () => [] },
  height: { type: [String, Number], default: 400 },
  initialEmptyMessage: { type: String, default: 'Selecciona uno o más sensores para ver la gráfica.' },
  emptyDataMessage: { type: String, default: 'No hay lecturas disponibles para los sensores y el rango de tiempo seleccionados.' }
});

const sensorStore = useSensorStore();
const loading = computed(() => sensorStore.isLoading);
const error = computed(() => sensorStore.error);

const selectedRange = ref('15m');
const customStartDate = ref('');
const customEndDate = ref('');
const chartRef = ref(null);
const chartKey = ref(0);

// Estados para controlar zoom
const isZoomed = ref(false);
const zoomTimeout = ref(null);
const currentZoom = ref(null);

const timeRanges = [
  { value: '15m', label: '15m' },
  { value: '2h', label: '2h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

let debounceTimer;
let updateQueue = [];
let isProcessingQueue = false;

function debounce(func, delay) {
  return function(...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Cola de actualizaciones para aplicar después del zoom
const queueUpdate = (newData) => {
  updateQueue.push(newData);
  if (!isZoomed.value) {
    processQueue();
  }
};

const processQueue = async () => {
  if (isProcessingQueue || updateQueue.length === 0) return;
  
  isProcessingQueue = true;
  const latestUpdate = updateQueue[updateQueue.length - 1];
  updateQueue = [];
  
  await nextTick();
  
  if (chartRef.value && chartRef.value.chart && currentZoom.value) {
    try {
      chartRef.value.chart.updateSeries(latestUpdate);
      // Restaurar zoom
      setTimeout(() => {
        if (chartRef.value && chartRef.value.chart && currentZoom.value) {
          chartRef.value.chart.zoomX(currentZoom.value.min, currentZoom.value.max);
        }
      }, 50);
    } catch (e) {
      console.warn('Error actualizando chart:', e);
    }
  }
  
  isProcessingQueue = false;
};

const fetchDataAndSubscribe = debounce(async (startTime, endTime) => {
  const ids = props.sensors.map(s => s.id);
  if (ids.length > 0 && startTime && endTime) {
    await sensorStore.fetchAndSubscribeChartReadings(ids, startTime.toISOString(), endTime.toISOString());
  } else {
    sensorStore.chartReadings = {};
  }
}, 400);

const handlePredefinedRangeChange = (rangeValue) => {
  selectedRange.value = rangeValue;
  customStartDate.value = '';
  customEndDate.value = '';
  
  // Reset zoom state
  isZoomed.value = false;
  currentZoom.value = null;
  chartKey.value++;
  
  const now = new Date();
  let startTime = new Date();
  const value = parseInt(rangeValue.slice(0, -1));
  const unit = rangeValue.slice(-1);
  switch (unit) {
    case 'm': startTime.setMinutes(now.getMinutes() - value); break;
    case 'h': startTime.setHours(now.getHours() - value); break;
    case 'd': startTime.setDate(now.getDate() - value); break;
  }
  fetchDataAndSubscribe(startTime, now);
};

const handleCustomRangeChange = () => {
  if (customStartDate.value && customEndDate.value) {
    selectedRange.value = 'custom';
    isZoomed.value = false;
    currentZoom.value = null;
    chartKey.value++;
    
    const start = new Date(customStartDate.value);
    const end = new Date(customEndDate.value);
    if (start < end) fetchDataAndSubscribe(start, end);
  }
};

const sensorIds = computed(() => props.sensors.map(s => s.id).sort().join(','));

watch(sensorIds, () => {
  if (props.sensors.length > 0) {
    if (selectedRange.value === 'custom') handleCustomRangeChange();
    else handlePredefinedRangeChange(selectedRange.value);
  }
}, { immediate: true });

onUnmounted(() => {
  sensorStore.unsubscribeFromChartReadings();
  if (zoomTimeout.value) {
    clearTimeout(zoomTimeout.value);
  }
});

const chartOptions = computed(() => ({
  chart: {
    type: 'area', 
    animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } },
    toolbar: { show: true },
    locales: [{ name: 'es', options: { months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'], shortMonths: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], shortDays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], toolbar: { download: 'Descargar', selection: 'Selección', selectionZoom: 'Zoom', zoomIn: 'Acercar', zoomOut: 'Alejar', pan: 'Mover', reset: 'Resetear' } } }],
    defaultLocale: 'es',
    foreColor: '#373d3f',
    events: {
      zoomed: function(chartContext, { xaxis }) {
        isZoomed.value = true;
        currentZoom.value = { min: xaxis.min, max: xaxis.max };
        
        // Reset timeout para volver a normal después de inactividad
        if (zoomTimeout.value) clearTimeout(zoomTimeout.value);
        zoomTimeout.value = setTimeout(() => {
          isZoomed.value = false;
          currentZoom.value = null;
          processQueue();
        }, 30000); // 30 segundos sin actividad
      },
      
      beforeResetZoom: function() {
        isZoomed.value = false;
        currentZoom.value = null;
        if (zoomTimeout.value) clearTimeout(zoomTimeout.value);
        processQueue();
        return true;
      }
    }
  },
  colors: ['#00B1FF', '#FF0080', '#00A74F', '#FFD100', '#D100FF', '#FF6633', '#1F77B4', '#AEC7E8'],
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.7,
      opacityTo: 0.1,
      stops: [0, 100, 100, 100]
    }
  },
  markers: {
    size: 0,
    hover: {
      size: 5
    }
  },
  xaxis: {
    type: 'datetime',
    labels: {
        datetimeUTC: false,
        datetimeFormatter: {
            year: 'yyyy',
            month: "MMM 'yy",
            day: 'dd MMM',
            hour: 'HH:mm',
            minute: 'HH:mm:ss',
        },
    },
    crosshairs: {
      show: true,
      width: 1,
      position: 'back',
      stroke: {
        color: '#b6b6b6',
        width: 1,
        dashArray: 0,
      },
    },
    tooltip: {
      enabled: true,
    }
  },
  yaxis: {
    labels: { formatter: (value) => value?.toFixed(2) ?? '' },
    crosshairs: {
      show: true,
      position: 'back',
      stroke: {
        color: '#b6b6b6',
        width: 1,
        dashArray: 3,
      },
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    x: { format: 'dd MMM yyyy, HH:mm:ss' },
    y: { formatter: (val) => val?.toFixed(3) ?? 'N/A' }
  },
  legend: { position: 'top', horizontalAlign: 'left' },
  dataLabels: {
    enabled: false
  },
}));

const series = computed(() => {
  const allSeries = [];

  props.sensors.forEach(sensor => {
    if (!sensor?.id) return;
    
    const dataToDisplay = sensorStore.getReadingsBySensorId(sensor.id);
    if (!dataToDisplay || dataToDisplay.length === 0) return;

    const sortedData = [...dataToDisplay].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const isVibrationData = sortedData.some(d => d.x != null || d.y != null || d.z != null);

    if (sensor.type === 'vibration' || isVibrationData) {
        ['x', 'y', 'z'].forEach(axis => {
            const axisData = sortedData
              .map(d => ({ x: new Date(d.timestamp).getTime(), y: d[axis] }))
              .filter(p => p.y != null);

            if (axisData.length > 0) {
              allSeries.push({
                  name: `${sensor.name} (${axis.toUpperCase()})`,
                  data: axisData
              });
            }
        });
    } else {
        const valueData = sortedData
          .map(d => ({ x: new Date(d.timestamp).getTime(), y: d.value }))
          .filter(p => p.y != null);

        if (valueData.length > 0) {
          allSeries.push({
              name: `${sensor.name} (${sensor.unit || ''})`,
              data: valueData
          });
        }
    }
  });

  // Si hay zoom activo, encolar la actualización
  if (isZoomed.value) {
    queueUpdate(allSeries);
    return series.value; // Devolver datos anteriores
  }

  return allSeries;
});
</script>

<style scoped>
.sensor-chart {
  background-color: #ffffff;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
</style>