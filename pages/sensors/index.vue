<template>
  <div>
    <PageHeader title="Sensores" subtitle="Gestionar sensores del sistema">
      <template #actions>
        <PermissionGuard moduleId="sensors" permission="crear">
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
          <MagnifyingGlassIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <div class="flex gap-2">
          <select v-model="filterStatus" class="form-input py-2 text-sm">
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
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organización</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción de Ubicación</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación Geográfica</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Com.</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batería</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Señal</th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="sensorStore.isLoading || organizationStore.isLoading" class="text-center">
              <td colspan="11" class="py-8 text-gray-500">Cargando sensores...</td>
            </tr>
            <tr v-else-if="sensorStore.error || organizationStore.error" class="text-center">
              <td colspan="11" class="py-8 text-error-600">Error: {{ sensorStore.error || organizationStore.error }}</td>
            </tr>
            <tr v-else-if="paginatedSensors.length === 0" class="text-center">
              <td colspan="11" class="py-8 text-gray-500">No se encontraron sensores.</td>
            </tr>
            <tr v-else v-for="sensor in paginatedSensors" :key="sensor.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ sensor.name }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ sensor.serial_number || "N/A" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ sensor.model || "N/A" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ sensor.organizationName || "Desconocida" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ sensor.location_description || "N/A" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ getGeographicLocation(sensor) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" :class="getSensorStatusClass(sensor.status)">
                  {{ translateSensorStatus(sensor.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ sensor.last_communication || "N/A" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ sensor.battery_level ? `${sensor.battery_level}%` : "N/A" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ sensor.signal_strength ? `${sensor.signal_strength} dBm` : "N/A" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end">
                <button @click="viewSensor(sensor.id)" class="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition-colors duration-200" title="Ver">
                  <EyeIcon class="h-5 w-5" />
                </button>
                <PermissionGuard moduleId="sensors" permission="editar">
                  <button @click="editSensor(sensor.id)" class="text-primary-600 hover:text-primary-900 p-1 rounded-full hover:bg-primary-100 transition-colors duration-200 ml-2" title="Editar">
                    <PencilIcon class="h-5 w-5" />
                  </button>
                </PermissionGuard>
                <PermissionGuard moduleId="sensors" permission="eliminar">
                  <button @click="showDeleteConfirm(sensor)" class="text-error-600 hover:text-error-900 p-1 rounded-full hover:bg-error-100 transition-colors duration-200 ml-2" title="Eliminar">
                    <TrashIcon class="h-5 w-5" />
                  </button>
                </PermissionGuard>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4">
        <Pagination :total-items="totalFilteredSensors" :current-page="currentPage" :items-per-page="itemsPerPage" @page-change="handlePageChange" />
      </div>
    </div>

    <ConfirmModal v-if="showDeleteModal" title="Eliminar Usuario" :message="`¿Estás seguro que deseas eliminar al sensor '${sensorToDelete?.name}'? Esta acción no se puede deshacer.`" @confirm="confirmDelete" @cancel="cancelDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue"; // Add watch if you want to react immediately to organizationStore.selectedOrganizationId changes
import { useSensorStore } from "~/stores/sensors";
import { useOrganizationStore } from "~/stores/organizations";
import { useAuthStore } from "~/stores/auth"; // Although not used directly for this feature, keep if needed elsewhere.
import { useRouter } from "vue-router";

import { PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, TrashIcon } from "@heroicons/vue/24/outline";

// Componentes
import PageHeader from "@/components/PageHeader.vue";
import StatCard from "@/components/StatCard.vue";
import Pagination from "@/components/Pagination.vue";

import PermissionGuard from "@/components/PermissionGuard.vue";

definePageMeta({
  permission: "sensors.ver",
});

// Stores
const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore(); // Make sure this is initialized
const router = useRouter();

// Estado local para los filtros
const searchQuery = ref("");
const filterStatus = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(10);
const showDeleteModal = ref(false);
const sensorToDelete = ref(null);

// No longer needed, as we'll use organizationStore.selectedOrganizationId
// const selectedOrganizationIdLocal = ref(null);

// --- Computed Properties ---

// Directamente desde el store de organizaciones
const organizations = computed(() => organizationStore.organizations);
// Directamente desde el store de sensores
const sensors = computed(() => sensorStore.sensors);
// Obtener el ID de la organización seleccionada globalmente desde el store
const selectedOrganizationIdFromStore = computed(() => organizationStore.selectedOrganizationId);

const sensorsWithOrgName = computed(() => {
  return sensors.value.map((sensor) => {
    let organizationName = "Desconocida";
    if (sensor.organizationId) {
      const org = organizations.value.find((o) => o.id === sensor.organizationId);
      if (org) {
        organizationName = org.name;
      }
    }
    return {
      ...sensor,
      organizationName: organizationName,
    };
  });
});

const filteredSensors = computed(() => {
  let result = [...sensorsWithOrgName.value];

  // APLICA EL FILTRO DE ORGANIZACIÓN USANDO EL ID DEL STORE GLOBAL
  if (selectedOrganizationIdFromStore.value) {
    result = result.filter((sensor) => sensor.organizationId === selectedOrganizationIdFromStore.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (sensor) =>
        sensor.name.toLowerCase().includes(query) ||
        (sensor.serial_number && sensor.serial_number.toLowerCase().includes(query)) ||
        (sensor.model && sensor.model.toLowerCase().includes(query)) ||
        (sensor.location_description && sensor.location_description.toLowerCase().includes(query)) ||
        (sensor.country && sensor.country.toLowerCase().includes(query)) ||
        (sensor.state && sensor.state.toLowerCase().includes(query)) ||
        (sensor.city && sensor.city.toLowerCase().includes(query)) ||
        (sensor.organizationName && sensor.organizationName.toLowerCase().includes(query))
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

// --- Métodos ---
const handlePageChange = (page) => {
  currentPage.value = page;
};

const viewSensor = (id) => {
  router.push(`/sensors/${id}`);
};

const editSensor = (id) => {
  router.push(`/sensors/${id}/edit`);
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
    // After deletion, it's good practice to re-fetch if you don't have real-time updates
    // or if the real-time update logic doesn't cover deletions from this specific action.
    // However, given your store structure, Pinia reactivity should handle it if your deleteSensor action
    // modifies the `sensorStore.sensors` array directly.
  } catch (error) {
    console.error("Error al eliminar sensor:", error);
  }
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  sensorToDelete.value = null;
};

const getSensorStatusClass = (status) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "maintenance":
      return "bg-yellow-100 text-yellow-800";
    case "inactive":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const translateSensorStatus = (status) => {
  switch (status) {
    case "active":
      return "Activo";
    case "maintenance":
      return "Mantenimiento";
    case "inactive":
      return "Inactivo";
    default:
      return status;
  }
};

const getGeographicLocation = (sensor) => {
  const parts = [];
  if (sensor.city) parts.push(sensor.city);
  if (sensor.state) parts.push(sensor.state);
  if (sensor.country) parts.push(sensor.country);
  return parts.length > 0 ? parts.join(", ") : "N/A";
};

// --- Lifecycle Hook ---
onMounted(async () => {
  await Promise.all([sensorStore.fetchSensors(), organizationStore.fetchOrganizations()]);
  // No need to set selectedOrganizationIdLocal here as it's handled by the store and sidebar
});

// Watch for changes in the globally selected organization ID
// This ensures that if the user changes the organization via the sidebar,
// the sensor list will reactively update.
watch(selectedOrganizationIdFromStore, (newOrgId, oldOrgId) => {
  if (newOrgId !== oldOrgId) {
    // Reset current page when organization filter changes
    currentPage.value = 1;
    // No need to re-fetch sensors here if your sensorStore.sensors already contains all sensors
    // and the filtering is done client-side via computed properties.
    // If sensorStore.fetchSensors() *itself* fetches based on selectedOrganizationId,
    // then you might want to call it here:
    // sensorStore.fetchSensors(newOrgId); // Assuming fetchSensors can take an organizationId parameter
  }
});
</script>

<style scoped>
/* Tus estilos aquí */
</style>
