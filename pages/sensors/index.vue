<template>
  <div>
    <PageHeader title="Sensores" subtitle="Gestionar sensores del sistema">
      <template #actions>
        <PermissionGuard moduleId="sensors" permission="create">
          <NuxtLink to="/sensors/new" class="btn btn-primary flex items-center">
            <PlusIcon class="h-5 w-5 mr-2" />
            Nuevo Sensor
          </NuxtLink>
        </PermissionGuard>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4">
      <StatCard title="Total Sensores" :value="totalSensors" icon="sensor" color="primary" />
      <StatCard title="Sensores Activos" :value="activeSensors" icon="sensor" color="success" />
      <StatCard title="En Mantenimiento" :value="maintenanceSensors" icon="sensor" color="warning" />
      <StatCard title="Inactivos" :value="inactiveSensors" icon="sensor" color="error" />
    </div>

    <div class="card">
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input v-model="searchQuery" type="text" class="form-input pl-9" placeholder="Buscar sensores..." />
           <SearchIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
        <div class="flex gap-2">
          <select v-model="filterStatus" class="form-select">
            <option value="">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="th-cell">Nombre</th>
              <th scope="col" class="th-cell">Código</th>
              <th scope="col" class="th-cell">Marca</th>
              <th scope="col" class="th-cell">Modelo</th>
              <th scope="col" class="th-cell">Activo Asignado</th>
              <th scope="col" class="th-cell">Estado</th>
              <th scope="col" class="relative px-6 py-3"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="sensorStore.isLoading"><td colspan="7" class="py-8 text-center text-gray-500">Cargando sensores...</td></tr>
            <tr v-else-if="sensorStore.error"><td colspan="7" class="py-8 text-center text-red-600">Error: {{ sensorStore.error }}</td></tr>
            <tr v-else-if="paginatedSensors.length === 0"><td colspan="7" class="py-8 text-center text-gray-500">No se encontraron sensores.</td></tr>
            <tr v-else v-for="sensor in paginatedSensors" :key="sensor.id">
              <td class="td-cell font-medium text-gray-900">{{ sensor.name }}</td>
              <td class="td-cell">{{ sensor.code || "N/A" }}</td>
              <td class="td-cell">{{ sensor.brand || "N/A" }}</td>
              <td class="td-cell">{{ sensor.model || "N/A" }}</td>
              <td class="td-cell">{{ sensor.assetName || "N/A" }}</td>
              <td class="td-cell">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" :class="getSensorStatusClass(sensor.status)">
                  {{ translateSensorStatus(sensor.status) }}
                </span>
              </td>
              <td class="td-cell text-right">
                <div class="flex items-center justify-end space-x-1">
                    <button @click="viewSensor(sensor.id)" class="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100" title="Ver Detalles"><EyeIcon class="h-5 w-5" /></button>
                    <PermissionGuard moduleId="sensors" permission="manage">
                        <button @click="editSensor(sensor.id)" class="text-primary-600 hover:text-primary-900 p-1 rounded-full hover:bg-primary-100" title="Editar Sensor"><PencilIcon class="h-5 w-5" /></button>
                    </PermissionGuard>
                    <PermissionGuard moduleId="sensors" permission="delete">
                        <button @click="showDeleteConfirm(sensor)" class="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100" title="Eliminar Sensor"><TrashIcon class="h-5 w-5" /></button>
                    </PermissionGuard>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4">
        <Pagination :total-items="totalFilteredSensors" :current-page="currentPage" :items-per-page="itemsPerPage" @page-change="handlePageChange" />
      </div>
    </div>

    <ConfirmModal v-if="showDeleteModal" title="Eliminar Sensor" :message="`¿Estás seguro que deseas eliminar el sensor '${sensorToDelete?.name}'?`" @confirm="confirmDelete" @cancel="cancelDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useSensorStore } from "~/stores/sensors";
import { useOrganizationStore } from "~/stores/organizations";
import { useAssetStore } from "~/stores/assets";
import { useRouter } from "vue-router";
import {EyeIcon, PencilIcon, TrashIcon } from "@heroicons/vue/24/outline";
import PageHeader from "@/components/PageHeader.vue";
import StatCard from "@/components/StatCard.vue";
import Pagination from "@/components/Pagination.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
import PermissionGuard from "@/components/PermissionGuard.vue";


// Iconos (placeholders)
const PlusIcon = defineComponent({
  render: () => h('svg', { class: 'h-5 w-5', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    h('path', { d: 'M12 4a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 12 4z' })
  ])
});
const SearchIcon = defineComponent({
  render: () => h('svg', { class: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    h('path', { d: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-8 8a10 10 0 1 1 17.32 5.92l4.68 4.68a1 1 0 0 1-1.42 1.42l-4.68-4.68A10 10 0 0 1 2 10z' })
  ])
});

definePageMeta({
  permission: "sensors.view",
});

const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore();
const router = useRouter();

const searchQuery = ref("");
const filterStatus = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(10);
const showDeleteModal = ref(false);
const sensorToDelete = ref(null);

const selectedOrganizationIdFromStore = computed(() => organizationStore.selectedOrganizationId);

const filteredSensors = computed(() => {
  let result = [...sensorStore.sensors]; 
  if (selectedOrganizationIdFromStore.value) {
    result = result.filter((sensor) => sensor.organizationId === selectedOrganizationIdFromStore.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((s) =>
        s.name.toLowerCase().includes(query) ||
        (s.code && s.code.toLowerCase().includes(query)) ||
        (s.brand && s.brand.toLowerCase().includes(query)) ||
        (s.model && s.model.toLowerCase().includes(query)) ||
        (s.assetName && s.assetName.toLowerCase().includes(query))
    );
  }
  if (filterStatus.value) {
    result = result.filter((sensor) => sensor.status === filterStatus.value);
  }
  return result;
});

const paginatedSensors = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredSensors.value.slice(start, end);
});

const totalFilteredSensors = computed(() => filteredSensors.value.length);
const totalSensors = computed(() => sensorStore.sensors.length); 
const activeSensors = computed(() => filteredSensors.value.filter((s) => s.status === "active").length);
const maintenanceSensors = computed(() => filteredSensors.value.filter((s) => s.status === "maintenance").length);
const inactiveSensors = computed(() => filteredSensors.value.filter((s) => s.status === "inactive").length);

const handlePageChange = (page) => { currentPage.value = page; };
const viewSensor = (id) => { router.push(`/sensors/${id}`); };
const editSensor = (id) => { router.push(`/sensors/${id}/edit`); };

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

const getSensorStatusClass = (status) => ({ "active": "bg-green-100 text-green-800", "maintenance": "bg-yellow-100 text-yellow-800", "inactive": "bg-red-100 text-red-800" }[status] || "bg-gray-100 text-gray-800");
const translateSensorStatus = (status) => ({ "active": "Activo", "maintenance": "Mantenimiento", "inactive": "Inactivo" }[status] || status);

onMounted(async () => {
  await Promise.all([
    organizationStore.fetchOrganizations(),
    assetStore.fetchAssets(),
    sensorStore.fetchSensors()
  ]);
});

watch(selectedOrganizationIdFromStore, () => { currentPage.value = 1; });
</script>

<style scoped>
.card { @apply bg-white shadow rounded-lg p-6; }
.form-input { @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm; }
.btn { @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm; }
.btn-primary { @apply bg-primary-600 text-white hover:bg-primary-700; }
.th-cell { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
.td-cell { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-500; }


.form-select {
  @apply block w-full sm:w-44 pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
}
</style>