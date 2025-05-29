<template>
  <div>
    <PageHeader 
      title="Sensores" 
      subtitle="Gestionar sensores del sistema">
      <template #actions>
        <PermissionGuard moduleId="sensors" permission="crear">
          <NuxtLink 
            to="/sensors/new"
            class="btn btn-primary flex items-center">
            <PlusIcon class="h-5 w-5 mr-2" /> Nuevo Sensor
          </NuxtLink>
        </PermissionGuard>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4">
      <StatCard 
        title="Total Sensores" 
        :value="totalSensors" 
        icon="sensor" 
        color="primary" />
      
      <StatCard 
        title="Sensores Activos" 
        :value="activeSensors" 
        icon="sensor" 
        color="success" />
      
      <StatCard 
        title="En Mantenimiento" 
        :value="maintenanceSensors" 
        icon="sensor" 
        color="warning" />
      
      <StatCard 
        title="Inactivos" 
        :value="inactiveSensors" 
        icon="sensor" 
        color="error" />
    </div>

    <div class="card">
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            class="form-input pl-9"
            placeholder="Buscar sensores..."
          />
          <MagnifyingGlassIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /> </div>
        
        <div class="flex gap-2">
          <select v-model="filterType" class="form-input py-2 text-sm">
            <option value="">Todos los Tipos</option>
            <option value="temperature">Temperatura</option>
            <option value="humidity">Humedad</option>
            <option value="pressure">Presión</option>
            <option value="level">Nivel</option>
            <option value="power">Energía</option>
            <option value="air-quality">Calidad del Aire</option>
          </select>
          
          <select v-model="filterStatus" class="form-input py-2 text-sm">
            <option value="">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="error">Error</option>
          </select>
          
          
        </div>
      </div>

      <SensorTable 
        :sensors="filteredSensors"
        :loading="loading"
        @view="viewSensor"
        @edit="editSensor"
        @delete="showDeleteConfirm" 
        :canEdit="authStore.can('sensors.editar')"   :canDelete="authStore.can('sensors.eliminar')" />

      <div class="mt-4">
        <Pagination 
          :total-items="totalFilteredSensors" 
          :current-page="currentPage"
          @page-change="handlePageChange" />
      </div>
    </div>

    <ConfirmModal
      v-if="showDeleteModal"
      title="Eliminar Sensor"
      :message="`¿Estás seguro que deseas eliminar el sensor '${sensorToDelete?.name}'? Esta acción no se puede deshacer.`"
      @confirm="confirmDelete"
      @cancel="cancelDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useSensorStore } from "~/stores/sensors";
import { useOrganizationStore } from "~/stores/organizations";
import { useAuthStore } from "~/stores/auth";

import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/vue/24/outline";

definePageMeta({
  // middleware: ['auth'],
  permission: "sensors.ver",
});

const authStore = useAuthStore();
const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const router = useRouter();

// Estado
const searchQuery = ref("");
const filterType = ref("");
const filterStatus = ref("");
// ELIMINADO: const filterOrg = ref(''); // Se elimina esta variable local, el filtro se gestiona globalmente
const currentPage = ref(1);
const loading = ref(false);
const showDeleteModal = ref(false);
const sensorToDelete = ref(null);

// Computed
const sensors = computed(() => sensorStore.sensors);
const organizations = computed(() => organizationStore.organizations);

const filteredSensors = computed(() => {
  let result = [...sensors.value];
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((sensor) => sensor.name.toLowerCase().includes(query) || sensor.location.toLowerCase().includes(query));
  }
  if (filterType.value) {
    result = result.filter((sensor) => sensor.type === filterType.value);
  }
  if (filterStatus.value) {
    result = result.filter((sensor) => sensor.status === filterStatus.value);
  }
  // CAMBIO CLAVE: APLICAR FILTRO POR ORGANIZACIÓN USANDO EL STORE GLOBAL
  if (organizationStore.selectedOrganizationId) {
    // Solo si hay una organización seleccionada
    result = result.filter((sensor) => sensor.organizationId === organizationStore.selectedOrganizationId);
  }
  return result;
});

const totalFilteredSensors = computed(() => filteredSensors.value.length);
const totalSensors = computed(() => sensors.value.length);
const activeSensors = computed(() => sensors.value.filter((s) => s.status === "active").length);
const maintenanceSensors = computed(() => sensors.value.filter((s) => s.status === "maintenance").length);
const inactiveSensors = computed(() => sensors.value.filter((s) => s.status === "inactive").length);

// Métodos
const handlePageChange = (page) => {
  currentPage.value = page;
};

const viewSensor = (id) => {
  router.push(`/Sensors/${id}`);
};

const editSensor = (id) => {
  router.push(`/Sensors/${id}/edit`);
};

const showDeleteConfirm = (sensor) => {
  sensorToDelete.value = sensor;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  try {
    await sensorStore.deleteSensor(sensorToDelete.value.id);
    showDeleteModal.value = false;
    sensorToDelete.value = null;
  } catch (error) {
    console.error("Error al eliminar sensor:", error);
  }
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  sensorToDelete.value = null;
};

// Cargar datos
onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([sensorStore.fetchSensors(), organizationStore.fetchOrganizations()]);
  } finally {
    loading.value = false;
  }
});
</script>
