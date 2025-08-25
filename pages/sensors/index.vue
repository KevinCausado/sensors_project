<template>
  <div>
    <PageHeader title="Gestión de Dispositivos" subtitle="Dispositivos físicos que agrupan múltiples sensores lógicos.">
      <template #actions>
        <PermissionGuard moduleId="sensors" permission="create">
          <NuxtLink to="/sensors/new" class="btn btn-primary flex items-center">
            <PlusIcon class="h-5 w-5 mr-2" />
            Añadir Sensor Lógico
          </NuxtLink>
        </PermissionGuard>
      </template>
    </PageHeader>

    <!-- Tarjetas de estadísticas -->
    <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4">
      <StatCard title="Total Sensores Lógicos" :value="totalSensors" icon="sensor" color="primary" />
      <StatCard title="Sensores Activos" :value="activeSensors" icon="sensor" color="success" />
      <StatCard title="En Mantenimiento" :value="maintenanceSensors" icon="sensor" color="warning" />
      <StatCard title="Inactivos / Error" :value="inactiveOrErrorSensors" icon="sensor" color="error" />
    </div>

    <div class="card">
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input v-model="searchQuery" type="text" class="form-input pl-9" placeholder="Buscar por sensor..." />
          <SearchIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      <!-- Tabla principal de Sensores Integrados -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr class="bg-gray-50">
              <th class="th-cell">Dispositivo (Código)</th>
              <th class="th-cell">Marca / Modelo</th>
              <th class="th-cell">Organización</th>
              <th class="th-cell">Activo Asignado</th>
              <th class="th-cell">Estado General</th>
              <th class="th-cell">Última Actualización</th>   
              <th class="th-cell"></th>           
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="sensorStore.isLoading"><td colspan="7" class="table-cell-feedback">Cargando dispositivos...</td></tr>
            <tr v-else-if="!paginatedIntegratedSensors || paginatedIntegratedSensors.length === 0"><td colspan="7" class="table-cell-feedback">No se encontraron dispositivos.</td></tr>
            
            <template v-else v-for="device in paginatedIntegratedSensors" :key="device.code">
              <tr class="hover:bg-gray-50">
                <td @click="toggleExpand(device.code)" class="td-cell font-mono text-gray-900 cursor-pointer">{{ device.code }}</td>
                <td @click="toggleExpand(device.code)" class="td-cell cursor-pointer">
                  <div>
                    <span class="font-semibold">{{ device.brandName || 'N/A' }}</span>
                    <span class="text-gray-500"> / {{ device.modelName || 'N/A' }}</span>
                  </div>
                  <div class="text-xs text-gray-400">Firmware: {{ device.firmwareVersion || 'N/A' }}</div>
                </td>
                <td @click="toggleExpand(device.code)" class="td-cell cursor-pointer">{{ device.organizationName || 'N/A' }}</td>
                <td @click="toggleExpand(device.code)" class="td-cell cursor-pointer">{{ device.assetName || 'Sin Asignar' }}</td>
                <td @click="toggleExpand(device.code)" class="td-cell cursor-pointer">
                   <span class="status-badge" :class="getDeviceStatusClass(device.overallStatus)">
                      {{ translateSensorStatus(device.overallStatus) }}
                   </span>
                </td>
                 <td @click="toggleExpand(device.code)" class="td-cell cursor-pointer">{{ formatDate(device.latestTimestamp) }}</td>
                <td class="td-cell text-center">
                    <div class="flex items-center justify-end space-x-1">
                        <button @click="toggleExpand(device.code)" class="p-1 rounded-full hover:bg-gray-200" title="Expandir/Contraer">
                            <ChevronDownIcon class="h-5 w-5 transition-transform" :class="{'rotate-180': expandedDevices.includes(device.code)}" />
                        </button>
                    </div>
                </td>
              </tr>
              <!-- Fila Desplegable con Sensores Lógicos y acciones -->
              <tr v-if="expandedDevices.includes(device.code)">
                 <td colspan="7" class="p-0 bg-gray-50">
                    <div class="p-4 border-l-4" :class="getDeviceStatusBorderClass(device.overallStatus)">
                        <div class="flex justify-between items-center mb-3">
                            <h4 class="font-semibold text-sm text-gray-700">Sensores Lógicos en {{ device.code }}:</h4>
                            <PermissionGuard moduleId="sensors" permission="delete">
                                <button @click="showDeleteDeviceConfirm(device)" class="btn btn-danger-outline btn-sm flex items-center">
                                    <TrashIcon class="h-4 w-4 mr-1" />
                                    Eliminar Dispositivo Completo
                                </button>
                            </PermissionGuard>
                        </div>
                        <table class="min-w-full divide-y divide-gray-100">
                            <thead>
                               <tr class="bg-gray-100">
                                   <th class="detail-table-header">Nombre del Sensor Lógico</th>
                                   <th class="detail-table-header">Tipo</th>
                                   <th class="detail-table-header">Estado</th>
                                   <th class="detail-table-header">Última Lectura</th>                                   
                               </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                               <tr v-for="sensor in device.logical_sensors" :key="sensor.id">
                                   <td class="detail-table-cell font-medium">{{ sensor.name }}</td>
                                   <td class="detail-table-cell">{{ translateSensorType(sensor.type) || 'N/A' }}</td>
                                   <td class="detail-table-cell">
                                     <span class="status-badge" :class="getSensorStatusClass(sensor.status)">
                                       {{ translateSensorStatus(sensor.status) }}
                                     </span>
                                   </td>
                                   <td class="detail-table-cell">
                                      <div v-if="sensor.last_reading_timestamp">
                                        <!-- Vista para Vibración -->
                                        <div v-if="sensor.type === 'vibration'">
                                           <div v-if="parseVibrationValue(sensor.last_value)" class="flex items-center gap-1 sm:gap-2">
                                                <span class="axis-badge bg-red-100 text-red-800"><b class="font-bold">X:</b> {{ parseVibrationValue(sensor.last_value).x }}</span>
                                                <span class="axis-badge bg-green-100 text-green-800"><b class="font-bold">Y:</b> {{ parseVibrationValue(sensor.last_value).y }}</span>
                                                <span class="axis-badge bg-blue-100 text-blue-800"><b class="font-bold">Z:</b> {{ parseVibrationValue(sensor.last_value).z }}</span>
                                           {{ sensor.last_unit }}
                                              </div> 
                                            <div v-else class="font-mono text-sm">{{ sensor.last_value }} {{ sensor.last_unit }}</div>
                                        </div>
                                        <!-- Vista para Temperatura y otros -->
                                        <div v-else-if="sensor.last_value !== null">
                                            <span class="status-badge bg-blue-100 text-blue-800 font-mono">
                                                {{ sensor.last_value }} {{ sensor.last_unit }}
                                            </span>
                                        </div>
                                        <div v-if="['vibration', 'temperature'].includes(sensor.type)" class="text-xs text-gray-500 italic" title="Factor de multiplicación aplicado a la lectura cruda">
                                          Factor: <b>x{{ getCorrectionFactor(sensor) }}</b>
                                        </div>
                                        <div class="text-xs text-gray-500 mt-1">{{ formatDate(sensor.last_reading_timestamp) }}</div>
                                      </div>
                                      <div v-else class="text-xs text-gray-400 italic">Sin lecturas</div>
                                   </td>
                                   <td class="detail-table-cell text-right">
                                     <div class="flex items-center justify-end space-x-1">
                                        <button @click="viewSensor(sensor.id)" class="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100" title="Ver Detalles"><EyeIcon class="h-5 w-5" /></button>
                                        <PermissionGuard moduleId="sensors" permission="manage">
                                            <button @click="editSensor(sensor.id)" class="text-primary-600 hover:text-primary-900 p-1 rounded-full hover:bg-primary-100" title="Editar Sensor"><PencilIcon class="h-5 w-5" /></button>
                                        </PermissionGuard>
                                        <PermissionGuard moduleId="sensors" permission="delete">
                                            <button @click="showDeleteConfirm(sensor)" class="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100" title="Eliminar Sensor Lógico"><TrashIcon class="h-5 w-5" /></button>
                                        </PermissionGuard>
                                    </div>
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

       <div class="mt-4">
        <Pagination :total-items="totalFilteredDevices" :current-page="currentPage" :items-per-page="itemsPerPage" @page-change="handlePageChange" />
      </div>
    </div>

    <!-- Modal para eliminar un SENSOR LÓGICO individual -->
    <ConfirmModal v-if="showDeleteModal" title="Eliminar Sensor Lógico" :message="`¿Estás seguro que deseas eliminar el sensor '${sensorToDelete?.name}'? Esta acción no se puede deshacer.`" @confirm="confirmDelete" @cancel="cancelDelete" />
    
    <!-- Modal para eliminar un DISPOSITIVO INTEGRADO completo -->
    <ConfirmModal v-if="showDeleteDeviceModal" title="Eliminar Dispositivo Integrado" :message="`¿Estás seguro que deseas eliminar el dispositivo '${deviceToDelete?.code}' y TODOS sus ${deviceToDelete?.logical_sensors.length} sensores lógicos? Esta acción es irreversible.`" @confirm="confirmDeleteDevice" @cancel="cancelDeleteDevice" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, defineComponent, h } from "vue";
import { useSensorStore } from "~/stores/sensors";
import { useOrganizationStore } from "~/stores/organizations";
import { useAssetStore } from "~/stores/assets";
import { useRouter } from "vue-router";
import { EyeIcon, PencilIcon, TrashIcon, ChevronDownIcon } from "@heroicons/vue/24/outline";
import PageHeader from "@/components/PageHeader.vue";
import StatCard from "@/components/StatCard.vue";
import Pagination from "@/components/Pagination.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
import PermissionGuard from "@/components/PermissionGuard.vue";

// Iconos (placeholders)
const PlusIcon = defineComponent({ render: () => h('svg', { class: 'h-5 w-5', viewBox: '0 0 24 24', fill: 'currentColor' }, [ h('path', { d: 'M12 4a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 12 4z' }) ]) });
const SearchIcon = defineComponent({ render: () => h('svg', { class: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'currentColor' }, [ h('path', { d: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-8 8a10 10 0 1 1 17.32 5.92l4.68 4.68a1 1 0 0 1-1.42 1.42l-4.68-4.68A10 10 0 0 1 2 10z' }) ]) });

definePageMeta({
  permission: "sensors.view",
});

const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore();
const router = useRouter();

// Estado de la UI
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(10);
const expandedDevices = ref([]);

// Estado para modales de eliminación
const showDeleteModal = ref(false);
const sensorToDelete = ref(null);
const showDeleteDeviceModal = ref(false);
const deviceToDelete = ref(null);

// --- PROPIEDADES COMPUTADAS ---

const selectedOrganizationIdFromStore = computed(() => organizationStore.selectedOrganizationId);

// Lógica principal para agrupar sensores lógicos en dispositivos integrados
const integratedSensors = computed(() => {
  if (!sensorStore.sensors || sensorStore.sensors.length === 0) return [];
  
  const statusPriority = { 'error': 4, 'inactive': 3, 'maintenance': 2, 'active': 1 };

  const grouped = sensorStore.sensors.reduce((acc, sensor) => {
    const key = sensor.code;
    if (!key) return acc;

    if (!acc[key]) {
      const org = organizationStore.organizations.find(o => o.id === sensor.organizationId);
      acc[key] = {
        code: key,
        brandName: sensor.brandName,
        modelName: sensor.modelName,
        firmwareVersion: sensor.firmwareVersion,
        assetName: sensor.assetName,
        organizationName: org ? org.name : 'N/A',
        logical_sensors: [],
        overallStatus: 'active',
        latestTimestamp: null
      };
    }
    acc[key].logical_sensors.push(sensor);
    
    if ((statusPriority[sensor.status] || 0) > (statusPriority[acc[key].overallStatus] || 0)) {
        acc[key].overallStatus = sensor.status;
    }

    const sensorTimestamp = sensor.last_reading_timestamp ? new Date(sensor.last_reading_timestamp) : null;
    if (sensorTimestamp && (!acc[key].latestTimestamp || sensorTimestamp > acc[key].latestTimestamp)) {
        acc[key].latestTimestamp = sensorTimestamp;
    }

    return acc;
  }, {});

  return Object.values(grouped);
});

// Lógica para filtrar y paginar la vista de dispositivos integrados
const filteredIntegratedSensors = computed(() => {
    let result = integratedSensors.value;
    if (selectedOrganizationIdFromStore.value) {
        result = result.filter(device => 
            device.logical_sensors.some(s => s.organizationId === selectedOrganizationIdFromStore.value)
        );
    }
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(device => 
            device.code.toLowerCase().includes(query) ||
            (device.brandName && device.brandName.toLowerCase().includes(query)) ||
            (device.modelName && device.modelName.toLowerCase().includes(query)) ||
            (device.assetName && device.assetName.toLowerCase().includes(query))
        );
    }
    return result;
});

const totalFilteredDevices = computed(() => filteredIntegratedSensors.value.length);

const paginatedIntegratedSensors = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredIntegratedSensors.value.slice(start, end);
});

// Computadas para las tarjetas de estadísticas (basadas en sensores lógicos)
const sensorsForStats = computed(() => {
    if (!selectedOrganizationIdFromStore.value) return sensorStore.sensors;
    return sensorStore.sensors.filter(s => s.organizationId === selectedOrganizationIdFromStore.value);
});
const totalSensors = computed(() => sensorsForStats.value.length); 
const activeSensors = computed(() => sensorsForStats.value.filter((s) => s.status === "active").length);
const maintenanceSensors = computed(() => sensorsForStats.value.filter((s) => s.status === "maintenance").length);
const inactiveOrErrorSensors = computed(() => sensorsForStats.value.filter((s) => s.status === "inactive" || s.status === "error").length);

// --- MÉTODOS ---

const handlePageChange = (page) => { currentPage.value = page; };
const viewSensor = (id) => { router.push(`/sensors/${id}`); };
const editSensor = (id) => { router.push(`/sensors/${id}/edit`); };
const toggleExpand = (deviceCode) => {
  const index = expandedDevices.value.indexOf(deviceCode);
  if (index > -1) expandedDevices.value.splice(index, 1);
  else expandedDevices.value.push(deviceCode);
};

// Métodos para eliminar un SENSOR LÓGICO
const showDeleteConfirm = (sensor) => {
  sensorToDelete.value = sensor;
  showDeleteModal.value = true;
};
const confirmDelete = async () => {
  await sensorStore.deleteSensor(sensorToDelete.value.id);
  showDeleteModal.value = false;
  sensorToDelete.value = null;
};
const cancelDelete = () => {
  showDeleteModal.value = false;
  sensorToDelete.value = null;
};

// Métodos para eliminar un DISPOSITIVO INTEGRADO
const showDeleteDeviceConfirm = (device) => {
    deviceToDelete.value = device;
    showDeleteDeviceModal.value = true;
};
const confirmDeleteDevice = async () => {
    await sensorStore.deleteDeviceByCode(deviceToDelete.value.code);
    showDeleteDeviceModal.value = false;
    deviceToDelete.value = null;
};
const cancelDeleteDevice = () => {
    showDeleteDeviceModal.value = false;
    deviceToDelete.value = null;
};

// Funciones de ayuda para clases y traducciones
const getSensorStatusClass = (status) => ({ "active": "bg-green-100 text-green-800", "maintenance": "bg-yellow-100 text-yellow-800", "inactive": "bg-gray-100 text-gray-800", "error": "bg-red-100 text-red-800" }[status] || "bg-gray-100 text-gray-800");
const getDeviceStatusClass = getSensorStatusClass; // Reutilizamos la misma lógica de colores
const getDeviceStatusBorderClass = (status) => ({ "active": "border-green-400", "maintenance": "border-yellow-400", "inactive": "border-gray-400", "error": "border-red-500" }[status] || "border-gray-300");
const translateSensorStatus = (status) => ({ "active": "Activo", "maintenance": "Mantenimiento", "inactive": "Inactivo", "error": "Error" }[status] || status);
const translateSensorType = (type) => ({ "temperature": "Temperatura", "vibration": "Vibración" }[type] || type);

const getCorrectionFactor = (sensor) => {
  if (sensor.firmwareStructure && sensor.firmwareStructure[sensor.type]) {
    return sensor.firmwareStructure[sensor.type].correctionFactor ?? 1;
  }
  return 1;
};


const parseVibrationValue = (value) => {
    if (typeof value !== 'string' || !value.includes(':')) return null;
    // Reemplaza comas por espacios y luego divide por cualquier cantidad de espacios
    const parts = value.replace(/,/g, ' ').split(/\s+/).reduce((acc, part) => {
        if (part.includes(':')) {
            const [axis, val] = part.split(':');
            if (axis && val) {
                acc[axis.trim().toLowerCase()] = val.trim();
            }
        }
        return acc;
    }, {});
    // Devuelve el objeto solo si los tres ejes están presentes
    return parts.x && parts.y && parts.z ? parts : null;
};
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};


// --- HOOKS DE CICLO DE VIDA ---
onMounted(async () => {
  await Promise.all([
    organizationStore.fetchOrganizations(),
    assetStore.fetchAssets(),
    sensorStore.fetchSensors(),
    sensorStore.fetchSensorHierarchy()
  ]);
  // Activar la suscripción a tiempo real
  sensorStore.subscribeToSensorUpdates();
});

onUnmounted(() => {
  // Limpiar la suscripción al salir de la página
  sensorStore.unsubscribeFromSensorUpdates();
});


watch(selectedOrganizationIdFromStore, () => { currentPage.value = 1; });
</script>

<style scoped>
.card { @apply bg-white shadow rounded-lg p-6; }
.form-input { @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm; }
.btn { @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm; }
.btn-primary { @apply bg-primary-600 text-white hover:bg-primary-700; }
.btn-danger-outline { @apply bg-white text-red-600 border border-red-300 hover:bg-red-50; }
.btn-sm { @apply px-2.5 py-1.5 text-xs; }
.th-cell { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
.td-cell { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-500; }
.table-cell-feedback { @apply px-6 py-8 text-center text-sm text-gray-500; }
.status-badge { @apply px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize; }
.axis-badge { @apply px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-md items-center font-mono; }
.detail-table-header { @apply px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider; }
.detail-table-cell { @apply px-4 py-3 whitespace-nowrap text-sm text-gray-700; }
</style>
