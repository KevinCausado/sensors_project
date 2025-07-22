<template>
  <div class="bg-gray-50 text-gray-800 min-h-screen p-4 sm:p-6 lg:p-8">
    <PageHeader
      title="Estado de Activos"
      subtitle="Seleccione un activo para ver su estado y monitoreo en tiempo real."
    />

    <div class="mt-8 p-6 bg-white border border-gray-200 rounded-xl shadow-md">
      <!-- Controles de Filtro -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label for="assetFilter" class="block text-sm font-medium text-gray-700 mb-1">Filtrar por Activo</label>
          <select id="assetFilter" v-model="selectedAssetFilter" class="form-select w-full">
            <option :value="null">Todos los activos</option>
            <option v-for="asset in assetStore.getAssets" :key="asset.id" :value="asset.id">
              {{ asset.name }}
            </option>
          </select>
        </div>
        <div>
          <label for="statusFilter" class="block text-sm font-medium text-gray-700 mb-1">Filtrar por Estado</label>
          <select id="statusFilter" v-model="statusFilter" class="form-select w-full">
            <option :value="null">Todos los estados</option>
            <option :value="true">Activo</option>
            <option :value="false">Inactivo</option>
          </select>
        </div>
      </div>

      <!-- Indicador de Carga -->
      <div v-if="assetStore.isLoading" class="flex items-center justify-center py-16">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        <p class="ml-4 text-gray-600">Cargando activos...</p>
      </div>
      
      <!-- Mensaje de Error -->
      <div v-else-if="assetStore.getError" class="text-center py-16 text-red-600">
        Error al cargar los activos: {{ assetStore.getError }}
      </div>
      
      <!-- Mensaje sin Resultados -->
      <div v-else-if="filteredAssets.length === 0" class="text-center py-16 text-gray-500">
        No se encontraron activos que coincidan con los filtros.
      </div>
      
      <!-- Lista de Activos -->
      <div v-else class="space-y-3">
        <div 
          v-for="asset in paginatedAssets" 
          :key="asset.id"
          class="futuristic-card group"
          @click="goToAssetDetails(asset.id)"
        >
          <!-- Icono y Nombre -->
          <div class="flex items-center gap-4 flex-grow">
            <div class="icon-container" :class="asset.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-800 text-base">{{ asset.name }}</h3>
              <p class="text-sm text-gray-500">{{ asset.assetTypeName }}</p>
            </div>
          </div>

          <!-- Info Adicional -->
          <div class="hidden md:block text-sm text-gray-500">
            <span class="font-medium text-gray-700">Código: </span>{{ asset.asset_code || 'N/A' }}
          </div>
          <div class="hidden lg:block text-sm text-gray-500">
            <span class="font-medium text-gray-700">Ubicación: </span>{{ getCombinedLocation(asset) }}
          </div>

          <!-- Estado y Flecha -->
          <div class="flex items-center gap-4">
            <span :class="['status-badge', getAssetStatusClass(asset.is_active)]">
              {{ translateAssetStatus(asset.is_active) }}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
          </div>
        </div>
      </div>
      
      <!-- SECCIÓN DE PAGINACIÓN QUE USA TU COMPONENTE -->
      <div class="mt-6 border-t border-gray-200" v-if="filteredAssets.length > 0">
        <Pagination
          :total-items="totalFilteredAssets"
          :current-page="currentPage"
          :items-per-page="itemsPerPage"
          @page-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAssetStore } from '~/stores/assets';
import { useOrganizationStore } from '~/stores/organizations';
import PageHeader from '~/components/PageHeader.vue';
import Pagination from '~/components/Pagination.vue'; 

// Inicialización de stores y router
const assetStore = useAssetStore();
const organizationStore = useOrganizationStore();
const router = useRouter();

// Estado para filtros y paginación
const selectedAssetFilter = ref(null);
const statusFilter = ref(null); 
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Carga inicial de datos
onMounted(() => { 
  assetStore.fetchAssets();
});

// Observar cambios en el ID de la organización seleccionada en el sidebar
watch(() => organizationStore.selectedOrganizationId, (newOrgId, oldOrgId) => {  
  if (newOrgId !== oldOrgId) {
    assetStore.fetchAssets();
    // Resetear filtros locales y paginación para evitar inconsistencias
    currentPage.value = 1;
    selectedAssetFilter.value = null;
    statusFilter.value = null;
  }
}, { immediate: false }); // `immediate: false` para evitar una doble carga al inicio.

// Lógica de filtrado
const filteredAssets = computed(() => {
  // La lista de `assetStore.getAssets` ya viene filtrada por organización desde el store.
  // Aquí solo aplicamos los filtros locales de la página.
  let assets = [...assetStore.getAssets];
  
  if (statusFilter.value !== null) {
    assets = assets.filter(asset => asset.is_active === statusFilter.value);
  }
  if (selectedAssetFilter.value !== null) {
    assets = assets.filter(asset => asset.id === selectedAssetFilter.value);
  }
  
  assets.sort((a, b) => (b.is_active - a.is_active));
  return assets;
});

// Lógica de paginación
const totalFilteredAssets = computed(() => filteredAssets.value.length);

const paginatedAssets = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredAssets.value.slice(start, end);
});

const handlePageChange = (page) => {
  currentPage.value = page;
};

// Observar cambios en filtros locales para resetear la paginación
watch([selectedAssetFilter, statusFilter], () => {
  currentPage.value = 1;
});

// Funciones de ayuda y navegación
const getCombinedLocation = (asset) => {
  return [asset.city, asset.state, asset.country].filter(Boolean).join(', ') || 'No especificada';
};

const getAssetStatusClass = (isActive) => {
  return isActive ? 'status-active' : 'status-inactive';
};

const translateAssetStatus = (isActive) => {
  return isActive ? 'Activo' : 'Inactivo';
};

const goToAssetDetails = (assetId) => {
  router.push(`/asset-status/${assetId}`);
};
</script>

<style scoped>
.futuristic-card {
  @apply flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg cursor-pointer transition-all duration-300 hover:bg-primary-50 hover:border-primary-300 hover:shadow-md;
}

.icon-container {
  @apply h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-full transition-colors;
}

.status-badge {
  @apply px-3 py-1 text-xs font-semibold rounded-full;
}
.status-active {
  @apply bg-green-100 text-green-800;
}
.status-inactive {
  @apply bg-red-100 text-red-800;
}

.form-select {
  @apply block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm;
}
</style>
