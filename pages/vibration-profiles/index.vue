<template>
  <div>
    <PageHeader
      title="Perfiles de Vibración"
      subtitle="Gestiona los perfiles de vibración y sus umbrales para tus activos."
    >
      <template #actions>
        <PermissionGuard moduleId="vibration_profiles" permission="crear">
          <NuxtLink
            to="/vibration-profiles/new"
            class="btn btn-primary flex items-center"
          >
            <!-- Icono de Plus -->
            <PlusIcon class="h-5 w-5 mr-2" />
            Nuevo Perfil
          </NuxtLink>
        </PermissionGuard>
      </template>
    </PageHeader>

    <div class="card">
      <!-- Contenedor principal de filtros: flex para control de alineación -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">

        <!-- Barra de búsqueda a la izquierda -->
        <div class="relative w-full sm:w-64">
          <input
            v-model="vibrationProfileStore.searchQuery" 
            type="text"
            class="form-input pl-9"
            placeholder="Buscar perfiles..."
          />
          <!-- Icono de Búsqueda -->
          <SearchIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <!-- Contenedor de los nuevos filtros, alineado a la derecha y con espaciado -->
        <div class="flex flex-col sm:flex-row gap-4 w-full sm:w-auto ml-0 sm:ml-auto">
          <!-- Selector: Filtrar por Rango de Vibración -->
          <div class="w-full sm:w-64">
            <label for="vibration-range-filter" class="sr-only">Filtrar por Rango de Vibración</label>
            <select
              id="vibration-range-filter"
              v-model="selectedVibrationRangeId"
              class="form-select"
              :disabled="loading || vibrationProfileStore.isLoading"
            >
              <option :value="null">Todos los Rangos</option>
              <option
                v-for="range in vibrationProfileStore.getVibrationRanges"
                :key="range.id"
                :value="range.id"
              >
                {{ range.name }}
              </option>
            </select>
          </div>

          <!-- Selector: Filtrar por Dirección -->
          <div class="w-full sm:w-64">
            <label for="direction-filter" class="sr-only">Filtrar por Dirección</label>
            <select
              id="direction-filter"
              v-model="selectedDirection"
              class="form-select"
              :disabled="loading || vibrationProfileStore.isLoading"
            >
              <option :value="null">Todas las Direcciones</option>
              <option
                v-for="direction in availableDirections"
                :key="direction"
                :value="direction"
              >
                {{ direction }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Punto de Medición
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dirección
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rango de Vibración
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Umbrales
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creado En
              </th>
              <th class="relative px-6 py-3 bg-gray-50">
                <span class="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading || vibrationProfileStore.isLoadingVibrationProfiles">
                <td colspan="7" class="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    <div class="flex items-center justify-center py-4">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                        <p class="ml-2">Cargando perfiles de vibración...</p>
                    </div>
                </td>
            </tr>
            <tr v-else-if="vibrationProfileStore.getVibrationProfilesError">
                <td colspan="7" class="px-6 py-4 whitespace-nowrap text-center text-error-600">
                    Error: {{ vibrationProfileStore.getVibrationProfilesError }}
                </td>
            </tr>
            <tr v-else-if="paginatedProfiles.length === 0">
                <td colspan="7" class="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    No se encontraron perfiles de vibración.
                </td>
            </tr>
            <template v-else>
              <tr v-for="profile in paginatedProfiles" :key="profile.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {{ profile.measurement_point }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {{ profile.direction }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {{ profile.vibration_range_name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <div class="flex flex-wrap gap-1">
                    <span v-if="profile.thresholds.min_value !== null" class="badge badge-threshold">Min: {{ profile.thresholds.min_value }}</span>
                    <span v-if="profile.thresholds.max_value !== null" class="badge badge-threshold">Max: {{ profile.thresholds.max_value }}</span>
                    <span v-if="profile.thresholds.normal_min !== null" class="badge badge-threshold-normal">Normal Min: {{ profile.thresholds.normal_min }}</span>
                    <span v-if="profile.thresholds.normal_max !== null" class="badge badge-threshold-normal">Normal Max: {{ profile.thresholds.normal_max }}</span>
                    <span v-if="profile.thresholds.alarm_level !== null" class="badge badge-threshold-alarm">Alerta: {{ profile.thresholds.alarm_level }}</span>
                    <span v-if="profile.thresholds.critical_level !== null" class="badge badge-threshold-critical">Crítico: {{ profile.thresholds.critical_level }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(profile.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end space-x-2">
                    <PermissionGuard moduleId="vibration_profiles" permission="view">
                      <ActionButton
                        icon="eye"
                        tooltip="Ver detalles"
                        color="primary"
                        @click="router.push(`/vibration-profiles/${profile.id}`)"
                      />
                    </PermissionGuard>
                    <PermissionGuard moduleId="vibration_profiles" permission="manage">
                      <ActionButton
                        icon="pencil"
                        tooltip="Editar perfil"
                        color="warning"
                        @click="router.push(`/vibration-profiles/${profile.id}/edit`)"
                      />
                    </PermissionGuard>
                    <PermissionGuard moduleId="vibration_profiles" permission="delete">
                      <ActionButton
                        icon="trash"
                        tooltip="Eliminar perfil"
                        color="error"
                        @click="showDeleteConfirm(profile.id, profile.measurement_point)"
                      />
                    </PermissionGuard>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="mt-4">
        <Pagination
          :total-items="totalFilteredProfiles"
          :current-page="currentPage"
          :items-per-page="itemsPerPage"
          @page-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Modal de confirmación de eliminación -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Eliminar Perfil de Vibración"
      :message="`¿Estás seguro de que quieres eliminar el perfil de vibración para el punto de medición '${profileToDeleteName}'? Esta acción no se puede deshacer.`"
      @confirm="deleteConfirmed"
      @cancel="cancelDelete"
      :is-loading="deleting"
      :error-message="vibrationProfileStore.getVibrationProfilesError"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineComponent, h } from 'vue';
import { useRouter } from 'vue-router';
import { useVibrationProfileStore } from '~/stores/vibrationProfiles';
import PageHeader from '~/components/PageHeader.vue';
import ActionButton from '~/components/ActionButton.vue';
import Pagination from '~/components/Pagination.vue';
import ConfirmModal from '~/components/ConfirmModal.vue';
import PermissionGuard from '~/components/PermissionGuard.vue';
// Importa el icono de la lupa de Heroicons
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";


// Iconos (placeholders o importaciones reales si usas una librería como Heroicons)
// Se mantiene defineComponent y h para PlusIcon, pero se usará MagnifyingGlassIcon directamente
const PlusIcon = defineComponent({
  render: () => h('svg', { class: 'h-5 w-5', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    h('path', { d: 'M12 4a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 12 4z' })
  ])
});
// REMOVED: SearchIcon defineComponent as we are importing from heroicons

definePageMeta({
  permission: 'vibration_profiles.view',
});

const vibrationProfileStore = useVibrationProfileStore();
const router = useRouter();

// REMOVED: const searchQuery = ref(''); // No longer needed, as it's managed by the store
const currentPage = ref(1);
const itemsPerPage = ref(10); // Puedes ajustar esto
const loading = ref(false); // Para el estado de carga general de la página

// Nuevos refs para los filtros
const selectedVibrationRangeId = ref(null);
const selectedDirection = ref(null);

const showDeleteModal = ref(false);
const profileToDeleteId = ref(null);
const profileToDeleteName = ref('');
const deleting = ref(false); // Para el estado de eliminación en el modal

// Propiedad computada para obtener direcciones únicas disponibles para el filtro
const availableDirections = computed(() => {
  const directions = new Set();
  vibrationProfileStore.vibrationProfiles.forEach(profile => {
    if (profile.direction) {
      directions.add(profile.direction);
    }
  });
  return Array.from(directions).sort();
});


// Propiedades computadas para filtrado y paginación
const filteredProfiles = computed(() => {
  // Use the filteredVibrationProfiles getter from the store, which now includes the search logic
  let result = vibrationProfileStore.filteredVibrationProfiles;

  // Apply filter by vibration range
  if (selectedVibrationRangeId.value) {
    result = result.filter(
      (profile) => profile.vibration_range_id === selectedVibrationRangeId.value
    );
  }

  // Apply filter by direction
  if (selectedDirection.value) {
    result = result.filter(
      (profile) => profile.direction === selectedDirection.value
    );
  }

  console.log(`[VibrationProfilesList] Perfiles filtrados: ${result.length}`);
  return result;
});

const totalFilteredProfiles = computed(() => filteredProfiles.value.length);
const totalPages = computed(() =>
  Math.ceil(totalFilteredProfiles.value / itemsPerPage.value)
);

const paginatedProfiles = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  console.log(`[VibrationProfilesList] Paginated profiles: ${start}-${end} of ${totalFilteredProfiles.value}`);
  return filteredProfiles.value.slice(start, end);
});

// Métodos
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const handlePageChange = (page) => {
  if (page > 0 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const showDeleteConfirm = (id, measurementPoint) => {
  profileToDeleteId.value = id;
  profileToDeleteName.value = measurementPoint;
  showDeleteModal.value = true;
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  profileToDeleteId.value = null;
  profileToDeleteName.value = '';
  vibrationProfileStore.error = null; // Clear error on cancel
};

const deleteConfirmed = async () => {
  deleting.value = true;
  vibrationProfileStore.error = null; // Clear previous store errors
  try {
    console.log(`[VibrationProfilesList] Confirming profile deletion with ID: ${profileToDeleteId.value}`);
    await vibrationProfileStore.deleteVibrationProfile(profileToDeleteId.value);
  } catch (e) {
    console.error('[VibrationProfilesList] Error deleting profile:', e);
  } finally {
    deleting.value = false;
    if (!vibrationProfileStore.getVibrationProfilesError) {
      cancelDelete();
    }
    console.log('[VibrationProfilesList] Deletion process finished.');
  }
};

// Initial data load when component is mounted
onMounted(async () => {
  loading.value = true;
  try {
    // Ensure vibration ranges and profiles are loaded
    await vibrationProfileStore.initializeDataForForms(); // Loads vibration_ranges
    await vibrationProfileStore.fetchVibrationProfiles(); // Loads actual profiles
  } catch (error) {
    console.error('[VibrationProfilesList] Error loading initial data:', error);
  } finally {
    loading.value = false;
  }
});

// Watch for changes in search query, and other filters to reset pagination
watch([
  () => vibrationProfileStore.searchQuery, // Watch the store's searchQuery
  selectedVibrationRangeId,
  selectedDirection
], () => {
  currentPage.value = 1; // Reset pagination to first page on filter/search change
});
</script>

<style scoped>
/* Estilos para badges de umbrales */
.badge-threshold {
  @apply bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium;
}
.badge-threshold-normal {
  @apply bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium;
}
.badge-threshold-alarm {
  @apply bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium;
}
.badge-threshold-critical {
  @apply bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium;
}

/* Base de estilos de los badges genéricos */
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  white-space: nowrap; /* Prevents badges from splitting into multiple lines */
}
.badge-secondary {
  @apply bg-gray-200 text-gray-700;
}
.badge-info {
  @apply bg-blue-100 text-blue-700;
}
.badge-time {
  @apply bg-gray-100 text-gray-600;
}
.badge-location {
  @apply bg-sky-100 text-sky-700;
}
.badge-description {
  @apply bg-rose-100 text-rose-700;
}

/* Table and card styles (copied from organizationsPage.vue) */
.card {
  @apply bg-white shadow rounded-lg p-6;
}
.form-input {
  @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
}
.form-select {
  @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2;
}
.btn {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors;
}
.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700;
}
.btn-secondary {
  @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
}
.btn-error {
  @apply bg-error-600 text-white hover:bg-error-700;
}
.btn-sm {
  @apply px-3 py-1.5 text-xs;
}
</style>
