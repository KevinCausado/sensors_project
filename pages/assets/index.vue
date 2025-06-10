<template>
  <div>
    <PageHeader
      title="Gestión de Activos"
      subtitle="Administra, crea y elimina tus activos industriales."
    >
      <template #actions>
        <NuxtLink
          to="/assets/new"
          class="btn btn-primary flex items-center"
        >
          <!-- Icono de Plus -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 12 4z"/></svg>
          Nuevo Activo
        </NuxtLink>
      </template>
    </PageHeader>

    <div class="card">
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            class="form-input pl-9"
            placeholder="Buscar activos..."
          />
          <!-- Icono de Búsqueda -->
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 2a8.5 8.5 0 0 1 6.545 13.914l5.352 5.353a.75.75 0 1 1-1.06 1.06l-5.354-5.353A8.502 8.502 0 0 1 2 10.5C2 6.91 4.91 4 8.5 4a8.5 8.5 0 0 1 2 0zM10.5 3.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg>
        </div>

        <!-- Filtros de Estado, Tipo y Grupo ISO (Agrupados) -->
        <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <!-- Filtro por Estado -->
          <select
            v-model="statusFilter"
            class="form-select block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option :value="null">Todos los estados</option>
            <option :value="true">Activo</option>
            <option :value="false">Inactivo</option>
          </select>

          <!-- Filtro por Tipo de Activo -->
          <select
            v-model="typeFilter"
            class="form-select block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option :value="null">Todos los tipos</option>
            <option v-for="type in assetStore.getAssetTypes" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>

          <!-- Filtro por Grupo ISO -->
          <select
            v-model="isoGroupFilter"
            class="form-select block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option :value="null">Todos los grupos ISO</option>
            <option v-for="group in assetStore.getIsoGroups" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Mensaje de Paginación y Filtrado -->
      <div class="mb-4 text-sm text-gray-700">
        Mostrando {{ startIndex }} a {{ endIndex }} de {{ totalFilteredAssets }} activos.
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activo
              </th>
              <th scope="col" class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th scope="col" class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th scope="col" class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grupo ISO
              </th>
              <th scope="col" class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Perfil de Vibración <!-- NUEVA COLUMNA -->
              </th>
              <th scope="col" class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ubicación
              </th>
              <th scope="col" class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="assetStore.isLoading">
                <td colspan="8" class="px-6 py-4 text-center text-gray-500">Cargando activos...</td> <!-- COLSPAN AJUSTADO -->
            </tr>
            <tr v-else-if="assetStore.getError">
                <td colspan="8" class="px-6 py-4 text-center text-red-600">Error: {{ assetStore.getError }}</td> <!-- COLSPAN AJUSTADO -->
            </tr>
            <tr v-else-if="paginatedAssets.length === 0">
                <td colspan="8" class="px-6 py-4 text-center text-gray-500">No se encontraron activos.</td> <!-- COLSPAN AJUSTADO -->
            </tr>

            <tr v-else v-for="asset in paginatedAssets" :key="asset.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                    {{ getAssetInitials(asset.name) }}
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ asset.name }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ asset.asset_code }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ asset.assetTypeName }} <!-- Usar la propiedad enriquecida -->
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ asset.iso_group_name }} <!-- Usar la propiedad enriquecida -->
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"> <!-- NUEVA CELDA -->
                {{ asset.vibration_profile_name || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ getCombinedLocation(asset) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', getAssetStatusClass(asset.is_active)]"
                >
                  {{ translateAssetStatus(asset.is_active) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-1">
                  <ActionButton
                    icon="eye"
                    tooltip="Ver detalles"
                    color="primary"
                    @click="router.push(`/assets/${asset.id}`)"
                  />
                  <ActionButton
                    icon="pencil"
                    tooltip="Editar activo"
                    color="warning"
                    @click="router.push(`/assets/${asset.id}/edit`)"
                  />
                  <ActionButton
                    icon="trash"
                    tooltip="Eliminar activo"
                    color="error"
                    @click="showDeleteConfirm(asset.id, asset.name)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="mt-4">
        <Pagination 
          :total-items="totalFilteredAssets" 
          :items-per-page="itemsPerPage"
          :current-page="currentPage"
          @page-change="handlePageChange" />
      </div>

      <!-- Modal de confirmación de eliminación (Implementación básica si no tienes ConfirmModal) -->
      <!-- Se mantiene la implementación básica del modal asumiendo que no tienes el componente ConfirmModal centralizado -->
      <div v-if="showDeleteModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
            <div>
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.332 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-5">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Eliminar Activo
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    ¿Estás seguro de que quieres eliminar el activo "<span class="font-semibold">{{ assetToDeleteName }}</span>"? Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
            </div>
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button
                type="button"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm"
                @click="deleteConfirmed"
                :disabled="deleting"
              >
                {{ deleting ? 'Eliminando...' : 'Eliminar' }}
              </button>
              <button
                type="button"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                @click="cancelDelete"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineComponent, h } from 'vue';
import { useRouter } from 'vue-router';
import { useAssetStore } from '~/stores/assets';
import PageHeader from '~/components/PageHeader.vue';
import ActionButton from '~/components/ActionButton.vue';
import Pagination from '~/components/Pagination.vue'; 

// Iconos (placeholders o importaciones reales si usas una librería como Heroicons)
const PlusIcon = defineComponent({
  render: () => h('svg', { class: 'h-5 w-5', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    h('path', { d: 'M12 4a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 12 4z' })
  ])
});
const SearchIcon = defineComponent({
  render: () => h('svg', { class: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    h('path', { d: 'M10.5 2a8.5 8.5 0 0 1 6.545 13.914l5.352 5.353a.75.75 0 1 1-1.06 1.06l-5.354-5.353A8.502 8.502 0 0 1 2 10.5C2 6.91 4.91 4 8.5 4a8.5 8.5 0 0 1 2 0zM10.5 3.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z' })
  ])
});


definePageMeta({
  // middleware: ['auth'] // Uncomment if you have auth middleware
});

const assetStore = useAssetStore();
const router = useRouter();

const searchQuery = ref('');
const statusFilter = ref(null); 
const typeFilter = ref(null); 
const isoGroupFilter = ref(null); 

const showDeleteModal = ref(false);
const assetToDeleteId = ref(null);
const assetToDeleteName = ref('');
const deleting = ref(false);

// --- ESTADO DE PAGINACIÓN ---
const currentPage = ref(1);
const itemsPerPage = ref(10); 

watch(() => assetStore.isLoading, (newValue) => {
  console.log(`[AssetsListPage] assetStore.isLoading ha cambiado a: ${newValue}`);
});
watch(() => assetStore.getError, (newValue) => {
  if (newValue) {
    console.error(`[AssetsListPage] assetStore.getError:`, newValue);
  }
});
watch(() => assetStore.getAssets, (newValue) => {
  console.log(`[AssetsListPage] assetStore.getAssets ha cambiado. Cantidad de activos: ${newValue.length}`, newValue);
  currentPage.value = 1;
});

// Función para concatenar la ubicación
const getCombinedLocation = (asset) => {
  const parts = [];
  if (asset.city) parts.push(asset.city);
  if (asset.state) parts.push(asset.state);
  if (asset.country) parts.push(asset.country);
  return parts.join(', ');
};

const getAssetInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const getAssetStatusClass = (isActive) => {
  return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

const translateAssetStatus = (isActive) => {
  return isActive ? 'Activo' : 'Inactivo';
};

// --- PROPIEDADES COMPUTADAS PARA PAGINACIÓN Y FILTRADO ---
const filteredAndSortedAssets = computed(() => {
  let result = [...assetStore.getAssets];

  // Aplicar filtro de búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(asset =>
      asset.name.toLowerCase().includes(query) ||
      (asset.asset_code && asset.asset_code.toLowerCase().includes(query)) ||
      (asset.city && asset.city.toLowerCase().includes(query)) ||
      (asset.state && asset.state.toLowerCase().includes(query)) ||
      (asset.country && asset.country.toLowerCase().includes(query)) ||
      (asset.assetTypeName && asset.assetTypeName.toLowerCase().includes(query)) || // Ahora usa assetTypeName
      (asset.iso_group_name && asset.iso_group_name.toLowerCase().includes(query)) ||
      (asset.vibration_profile_name && asset.vibration_profile_name.toLowerCase().includes(query)) // NUEVO: Buscar por nombre de perfil de vibración
    );
  }

  // Aplicar filtro de estado
  if (statusFilter.value !== null) {
    result = result.filter(asset => asset.is_active === statusFilter.value);
  }

  // Aplicar filtro de tipo de activo
  if (typeFilter.value !== null) {
    result = result.filter(asset => asset.asset_type_id === typeFilter.value);
  }

  // Aplicar filtro de grupo ISO
  if (isoGroupFilter.value !== null) {
    result = result.filter(asset => asset.iso_group_id === isoGroupFilter.value);
  }

  return result;
});

const totalFilteredAssets = computed(() => filteredAndSortedAssets.value.length);

const paginatedAssets = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  return filteredAndSortedAssets.value.slice(startIndex, endIndex);
});

// --- PROPIEDADES COMPUTADAS PARA EL MENSAJE "MOSTRANDO X a Y de Z" ---
const startIndex = computed(() => {
  if (totalFilteredAssets.value === 0) return 0;
  return (currentPage.value - 1) * itemsPerPage.value + 1;
});

const endIndex = computed(() => {
  const end = currentPage.value * itemsPerPage.value;
  return Math.min(end, totalFilteredAssets.value);
});


// --- MÉTODOS DE PAGINACIÓN ---
const handlePageChange = (page) => {
  currentPage.value = page;
};

const showDeleteConfirm = (id, name) => {
  assetToDeleteId.value = id;
  assetToDeleteName.value = name;
  showDeleteModal.value = true;
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  assetToDeleteId.value = null;
  assetToDeleteName.value = '';
};

const deleteConfirmed = async () => {
  deleting.value = true;
  try {
    console.log(`[AssetsListPage] Confirmando eliminación de activo con ID: ${assetToDeleteId.value}`);
    await assetStore.deleteAsset(assetToDeleteId.value);
  } catch (e) {
    console.error('[AssetsListPage] Error al eliminar activo:', e);
  } finally {
    deleting.value = false;
    cancelDelete();
    console.log('[AssetsListPage] Proceso de eliminación finalizado.');
  }
};

onMounted(async () => {
  console.log('[AssetsListPage] Componente AssetsList onMounted. Iniciando carga de datos...');
  // Cargar todos los datos de referencia necesarios para los filtros y selectores
  await assetStore.initializeDataForForms(); 
  // Luego, cargar los activos principales
  await assetStore.fetchAssets(); 
  console.log('[AssetsListPage] Carga de datos iniciales completada.');
});
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.badge-success {
  @apply bg-green-100 text-green-800;
}
.badge-danger {
  @apply bg-red-100 text-red-800;
}

/* Aplica un estilo uniforme a los selects para que se vean compactos */
.form-select {
  @apply block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm;
}
</style>
