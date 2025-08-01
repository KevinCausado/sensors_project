<template>
  <div>
    <PageHeader
      title="Gestión de Sensores Integrados"
      subtitle="Dispositivos físicos que agrupan múltiples sensores lógicos."
    />

    <div class="card">
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input v-model="searchQuery" type="text" class="form-input pl-9" placeholder="Buscar por código, marca, modelo..." />
          <svg class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-8 8a10 10 0 1 1 17.32 5.92l4.68 4.68a1 1 0 0 1-1.42 1.42l-4.68-4.68A10 10 0 0 1 2 10z"></path></svg>
        </div>
      </div>

      <!-- Tabla de Sensores Integrados -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-header">Dispositivo (Código)</th>
              <th class="table-header">Marca / Modelo</th>
              <th class="table-header">Sensores Lógicos</th>
              <th class="table-header">Activo Asignado</th>
              <th class="table-header w-12"><span class="sr-only">Expandir</span></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="sensorStore.isLoading">
              <td colspan="5" class="table-cell-feedback">Cargando dispositivos...</td>
            </tr>
            <tr v-else-if="!filteredIntegratedSensors || filteredIntegratedSensors.length === 0">
              <td colspan="5" class="table-cell-feedback">No se encontraron dispositivos.</td>
            </tr>
            
            <template v-else v-for="device in filteredIntegratedSensors" :key="device.code">
              <tr class="hover:bg-gray-50 cursor-pointer" @click="toggleExpand(device.code)">
                <td class="table-cell font-mono text-gray-900">{{ device.code }}</td>
                <td class="table-cell">
                  <div>
                    <span class="font-semibold">{{ device.brandName || 'N/A' }}</span>
                    <span class="text-gray-500"> / {{ device.modelName || 'N/A' }}</span>
                  </div>
                  <div class="text-xs text-gray-400">Firmware: {{ device.firmwareVersion || 'N/A' }}</div>
                </td>
                <td class="table-cell">
                  <span class="px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                    {{ device.logical_sensors.length }}
                  </span>
                </td>
                <td class="table-cell">{{ device.assetName || 'Sin Asignar' }}</td>
                <td class="table-cell text-center">
                    <button class="p-1 rounded-full hover:bg-gray-200">
                        <svg class="h-5 w-5 transition-transform" :class="{'rotate-180': expandedDevices.includes(device.code)}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                </td>
              </tr>
              <!-- Fila Desplegable con Sensores Lógicos -->
              <tr v-if="expandedDevices.includes(device.code)">
                 <td colspan="5" class="p-0 bg-gray-50">
                    <div class="p-4 border-l-4 border-blue-500">
                        <h4 class="font-semibold text-sm mb-3 text-gray-700">Sensores Lógicos en {{ device.code }}:</h4>
                        <table class="min-w-full divide-y divide-gray-100">
                            <thead class="bg-gray-100">
                               <tr>
                                   <th class="detail-table-header">Nombre del Sensor Lógico</th>
                                   <th class="detail-table-header">Tipo</th>
                                   <th class="detail-table-header">Estado</th>
                                   <th class="detail-table-header">Última Lectura</th>
                                   <th class="detail-table-header">Acciones</th>
                               </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                               <tr v-for="sensor in device.logical_sensors" :key="sensor.id">
                                   <td class="detail-table-cell font-medium">{{ sensor.name }}</td>
                                   <td class="detail-table-cell capitalize">{{ sensor.type || 'N/A' }}</td>
                                   <td class="detail-table-cell">
                                     <span class="status-badge" :class="getSensorStatusClass(sensor.status)">
                                       {{ translateSensorStatus(sensor.status) }}
                                     </span>
                                   </td>
                                   <td class="detail-table-cell">
                                      <div v-if="sensor.last_reading_timestamp">
                                        <span class="font-mono">{{ sensor.last_value }} {{ sensor.last_unit }}</span>
                                        <div class="text-xs text-gray-400">{{ formatDate(sensor.last_reading_timestamp) }}</div>
                                      </div>
                                      <div v-else class="text-xs text-gray-400 italic">Sin lecturas</div>
                                   </td>
                                   <td class="detail-table-cell">
                                     <NuxtLink :to="`/sensors/${sensor.id}`" class="text-primary-600 hover:underline text-sm">Ver Detalles</NuxtLink>
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useSensorStore } from '~/stores/sensors';
import PageHeader from '~/components/PageHeader.vue'; // Asegúrate que la ruta es correcta

const sensorStore = useSensorStore();

const searchQuery = ref('');
const expandedDevices = ref([]);

// La magia de la agrupación ocurre aquí
const integratedSensors = computed(() => {
  if (!sensorStore.sensors || sensorStore.sensors.length === 0) {
    return [];
  }

  // Usamos reduce para agrupar los sensores lógicos por su 'code'
  const grouped = sensorStore.sensors.reduce((acc, sensor) => {
    const key = sensor.code; // La clave de agrupación es el código del dispositivo físico
    if (!key) return acc; // Ignorar sensores sin código

    if (!acc[key]) {
      // Si es la primera vez que vemos este 'code', creamos el grupo
      acc[key] = {
        code: key,
        brandName: sensor.brandName,
        modelName: sensor.modelName,
        firmwareVersion: sensor.firmwareVersion,
        assetName: sensor.assetName, // Asumimos que todos los sensores lógicos de un dispositivo están en el mismo activo
        logical_sensors: [] // Inicializamos el array de sensores lógicos
      };
    }

    // Añadimos el sensor lógico actual a su grupo
    acc[key].logical_sensors.push(sensor);

    return acc;
  }, {});

  // Convertimos el objeto de grupos a un array para usarlo en el v-for
  return Object.values(grouped);
});

const filteredIntegratedSensors = computed(() => {
    if (!searchQuery.value) {
        return integratedSensors.value;
    }
    const query = searchQuery.value.toLowerCase();
    return integratedSensors.value.filter(device => 
        device.code.toLowerCase().includes(query) ||
        (device.brandName && device.brandName.toLowerCase().includes(query)) ||
        (device.modelName && device.modelName.toLowerCase().includes(query)) ||
        (device.assetName && device.assetName.toLowerCase().includes(query))
    );
});


const toggleExpand = (deviceCode) => {
  const index = expandedDevices.value.indexOf(deviceCode);
  if (index > -1) {
    expandedDevices.value.splice(index, 1);
  } else {
    expandedDevices.value.push(deviceCode);
  }
};

const getSensorStatusClass = (status) => ({ "active": "bg-green-100 text-green-800", "maintenance": "bg-yellow-100 text-yellow-800", "inactive": "bg-red-100 text-red-800", "error": "bg-red-100 text-red-800" }[status] || "bg-gray-100 text-gray-800");
const translateSensorStatus = (status) => ({ "active": "Activo", "maintenance": "Mantenimiento", "inactive": "Inactivo", "error": "Error" }[status] || status);
const formatDate = (date) => date ? new Date(date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';

onMounted(async () => {
  // La tienda ya debería tener un fetch para sensores, lo reutilizamos.
  if (sensorStore.sensors.length === 0) {
    await sensorStore.fetchSensors();
  }
  // También es buena idea cargar la jerarquía si no está ya cargada
  if (sensorStore.brands.length === 0) {
      await sensorStore.fetchSensorHierarchy();
  }
});
</script>

<style scoped>
.card { @apply bg-white shadow-md rounded-lg p-6; }
.form-input { @apply block w-full py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow; }
.table-header { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
.table-cell { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-700; }
.table-cell-feedback { @apply px-6 py-8 text-center text-sm text-gray-500; }
.status-badge { @apply px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize; }
.detail-table-header { @apply px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider bg-gray-100; }
.detail-table-cell { @apply px-4 py-3 whitespace-nowrap text-sm text-gray-700; }
</style>
