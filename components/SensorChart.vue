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
import { ref, computed, watch, onMounted } from 'vue';
import { useNuxtApp, useRoute } from '#app';
import VueApexCharts from 'vue3-apexcharts';

// Props
const props = defineProps({
  sensors: { // ARRAY DE OBJETOS SENSOR, AHORA CONTIENE TAMBIÉN LAS LECTURAS EN TIEMPO REAL
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
const { $supabase } = useNuxtApp();
const route = useRoute();
const loading = ref(true);
const error = ref(null);
const selectedRange = ref('day');

const timeRanges = [
  { value: 'day', label: '24h' },
  { value: 'week', label: '7 días' },
  { value: 'month', label: '30 días' }
];

const isDetailPage = computed(() => {
  return route.name === 'sensors-id';
});

// Almacenará los puntos de datos históricos reales del gráfico, organizados por sensorId
const historicalChartData = ref({});

// --- FUNCIÓN PARA CARGAR LECTURAS HISTÓRICAS REALES PARA MÚLTIPLES SENSORES ---
const fetchHistoricalReadings = async () => {
  if (props.sensors.length === 0) {
    historicalChartData.value = {};
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  let timeAgo;
  const now = new Date();

  // En la página de detalle, fuerza el rango a 'day' si no se han mostrado los controles
  if (isDetailPage.value && props.sensors.length === 1 && !props.showTimeRangeControls) {
    selectedRange.value = 'day';
  }

  switch (selectedRange.value) {
    case 'week':
      timeAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      timeAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default: // 'day'
      timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
  }

  try {
    const newHistoricalData = {};
    const promises = props.sensors.map(async (sensor) => {
      if (!sensor || !sensor.id) {
        console.warn('Sensor object is missing ID:', sensor);
        return { sensorId: null, data: [], error: { message: 'Sensor ID is missing' } };
      }

      const { data, error: fetchError } = await $supabase
        .from('SensorReadings')
        .select('value, timestamp')
        .eq('sensorId', sensor.id)
        .gte('timestamp', timeAgo.toISOString())
        .order('timestamp', { ascending: true });

      if (fetchError) {
        console.error(`Error fetching historical data for sensor ${sensor.name} (${sensor.id}):`, fetchError);
        return { sensorId: sensor.id, data: [], error: fetchError };
      } else {
        let mappedData = data.map(reading => ({
          x: new Date(reading.timestamp).getTime(),
          y: parseFloat(reading.value.toFixed(2))
        }));
        return { sensorId: sensor.id, data: mappedData, error: null };
      }
    });

    const results = await Promise.all(promises);

    results.forEach(result => {
      if (result.sensorId && !result.error) {
        newHistoricalData[result.sensorId] = result.data;
      }
    });

    historicalChartData.value = newHistoricalData;

    const allFailed = results.every(r => r.error);
    if (allFailed && props.sensors.length > 0) {
      error.value = 'No se pudo cargar la gráfica para ningún sensor. Verifique la conexión o los permisos.';
    } else if (Object.keys(newHistoricalData).length === 0 && props.sensors.length > 0) {
      error.value = null;
    } else {
      error.value = null;
    }

  } catch (err) {
    console.error('Error general en fetchHistoricalReadings:', err);
    error.value = 'Error inesperado al cargar datos de la gráfica.';
    historicalChartData.value = {};
  } finally {
    loading.value = false;
  }
};

// Observar cambios en 'selectedRange' o la SELECCIÓN de sensores (IDs)
// Solo disparamos la carga histórica cuando cambia el rango o los IDs de los sensores seleccionados.
watch([() => props.sensors.map(s => s.id), selectedRange], async ([newSensorIds, newRange], [oldSensorIds, oldRange]) => { // <-- ¡AQUÍ ESTÁ LA CORRECCIÓN!
  // Para evitar recargar si solo cambian los datos de Realtime dentro de un sensor,
  // chequeamos si los IDs de los sensores seleccionados han cambiado.
  const idsChanged = JSON.stringify(newSensorIds) !== JSON.stringify(oldSensorIds);
  if (idsChanged || newRange !== oldRange) { // <-- Y AQUÍ LA CORRECCIÓN DE LA CONDICIÓN
    await fetchHistoricalReadings();
  }
}, { immediate: true, deep: true });

// Chart options (ahora usa `computed` para ser reactivo)
const chartOptions = computed(() => ({
  chart: {
    type: 'line',
    animations: {
      enabled: true,
      easing: 'linear',
      dynamicAnimation: {
        speed: 1000
      }
    },
    toolbar: {
      show: true,
      tools: {
        download: true,
        selection: true,
        zoom: true,
        zoomIn: true,
        zoomOut: true,
        pan: true,
        reset: true
      }
    },
    locales: [{
      name: 'es',
      options: {
        months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        shortMonths: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        shortDays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
        toolbar: {
          download: 'Descargar CSV',
          selection: 'Selección',
          selectionZoom: 'Zoom de Selección',
          zoomIn: 'Acercar',
          zoomOut: 'Alejar',
          pan: 'Panorámica',
          reset: 'Resetear Zoom'
        }
      }
    }],
    defaultLocale: 'es'
  },
  stroke: {
    curve: 'smooth',
    width: 2
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
      format: 'dd MMM HH:mm'
    }
  },
  yaxis: {
    labels: {
      formatter: (value) => value !== undefined && value !== null ? value.toFixed(2) : ''
    }
  },
  tooltip: {
    x: {
      format: 'dd MMM yyyy HH:mm:ss' // Corregido el formato aquí también para evitar posibles errores
    },
    y: {
      formatter: function (val) {
        return val !== undefined && val !== null ? val.toFixed(2) : 'N/A';
      }
    }
  },
  legend: {
    position: 'top'
  },
  grid: {
    borderColor: '#f1f1f1'
  },
  theme: {
    palette: 'palette1'
  }
}));


// Chart series data: Ahora fusiona datos históricos con datos en tiempo real
const series = computed(() => {
   console.log('--- La propiedad computada `series` de SensorChart se está re-evaluando. ---', Date.now());
  const datasets = props.sensors.map(sensor => {
    // Obtener datos históricos para el sensor
    const historicalData = historicalChartData.value[sensor.id] || [];

    // Obtener datos en tiempo real (vienen en la prop `sensors` dentro del objeto `sensor.readings`)
    // Asegúrate de que `sensor.readings` esté en el formato {value, timestamp}
    const realtimeData = (sensor.readings || []).map(reading => ({
      x: new Date(reading.timestamp).getTime(),
      y: parseFloat(reading.value.toFixed(2))
    }));

    // Fusionar y ordenar los datos
    const combinedData = [...historicalData, ...realtimeData];

    // Eliminar duplicados y ordenar por timestamp
    const uniqueAndSortedData = Array.from(new Map(combinedData.map(item => [item.x, item])).values())
      .sort((a, b) => a.x - b.x);

    return {
      name: `${sensor.name} (${sensor.unit || ''})`,
      data: uniqueAndSortedData
    };
  });

  return datasets.filter(s => s.data.length > 0);
});

onMounted(() => {
  // El watch con 'immediate: true' ya maneja la carga inicial.
});
</script>

<style scoped>
/* Tus estilos si tienes alguno */
</style>