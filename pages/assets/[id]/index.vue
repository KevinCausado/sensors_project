<template>
  <div>
    <PageHeader
      :title="`Detalles del Activo: ${asset?.name || 'Cargando...'}`"
      :subtitle="`ID: ${asset?.id || 'N/A'}`"
    >
      <template #actions>
        <div class="flex gap-2">
        
          <NuxtLink
            to="/assets"
            class="btn btn-secondary"
          >
            Volver
          </NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div class="max-w-3xl mx-auto">
      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p class="ml-3 text-gray-600">Cargando activo...</p>
      </div>

      <div v-else-if="!asset" class="text-center py-8 text-gray-500">
        Activo no encontrado. Verifique el ID o si existen datos.
      </div>

      <div v-else class="card p-6 space-y-6">
        <div>
          <h3 class="text-lg font-semibold mb-4 border-b pb-2">Información General</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-500">Nombre del Activo</p>
              <p class="form-input-static">{{ asset.name }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Código del Activo</p>
              <p class="form-input-static">{{ asset.asset_code || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Número de Serie</p>
              <p class="form-input-static">{{ asset.serial_number || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Modelo</p>
              <p class="form-input-static">{{ asset.model_number || 'N/A' }}</p>
            </div>
             <div class="md:col-span-2">
              <p class="text-sm font-medium text-gray-500">Ubicación Geográfica</p>
              <p class="form-input-static">{{ combinedLocation || 'N/A' }}</p>
            </div>
            <div class="md:col-span-2">
              <p class="text-sm font-medium text-gray-500">Descripción</p>
              <p class="form-input-static">{{ asset.description || 'N/A' }}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-4 border-b pb-2 mt-6">Configuración Técnica</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-500">Organización</p>
              <p class="form-input-static">{{ asset.organizations?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Tipo de Activo</p>
              <p class="form-input-static">{{ asset.asset_types?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Grupo ISO</p>
              <p class="form-input-static">{{ asset.iso_groups?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Tipo de Rigidez</p>
              <p class="form-input-static">{{ asset.rigidity_types?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Tipo de Cimentación</p>
              <p class="form-input-static">{{ asset.foundation_types?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Tipo de Acoplamiento</p>
              <p class="form-input-static">{{ asset.coupling_types?.name || 'N/A' }}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-4 border-b pb-2 mt-6">Parámetros Operativos</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-500">Potencia (kW)</p>
              <p class="form-input-static">{{ asset.power_kw ?? 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Velocidad (RPM)</p>
              <p class="form-input-static">{{ asset.speed_rpm ?? 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Velocidad Crítica (RPM)</p>
              <p class="form-input-static">{{ asset.critical_speed_rpm ?? 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Temperatura Operativa (°C)</p>
              <p class="form-input-static">{{ asset.operating_temp_c ?? 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Dirección IP</p>
              <p class="form-input-static">{{ asset.ip_address || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Versión de Firmware</p>
              <p class="form-input-static">{{ asset.firmware_version || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Estado</p>
              <span :class="['badge', getAssetStatusClass(asset.is_active)]">
                {{ translateAssetStatus(asset.is_active) }}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-4 border-b pb-2 mt-6">Fechas</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-500">Fecha de Fabricación</p>
              <p class="form-input-static">{{ formatDate(asset.manufacture_date) }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Fecha de Instalación</p>
              <p class="form-input-static">{{ formatDate(asset.installation_date) }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Última Fecha de Mantenimiento</p>
              <p class="form-input-static">{{ formatDate(asset.last_maintenance_date) }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Próxima Fecha de Mantenimiento</p>
              <p class="form-input-static">{{ formatDate(asset.next_maintenance_date) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAssetStore } from '~/stores/assets';
import { useOrganizationStore } from '~/stores/organizations'; // Assuming you need this for organization name
import PageHeader from '~/components/PageHeader.vue';

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const router = useRouter();
const assetStore = useAssetStore();
const organizationStore = useOrganizationStore(); // Initialize organization store

const loading = ref(true);
const asset = ref(null);

// Computed property for combined location
const combinedLocation = computed(() => {
  if (!asset.value) return '';
  const parts = [];
  if (asset.value.city) parts.push(asset.value.city);
  if (asset.value.state) parts.push(asset.value.state);
  if (asset.value.country) parts.push(asset.value.country);
  return parts.join(', ');
});

const loadAsset = async () => {
  const assetId = route.params.id;

  if (assetId === 'new') {
    router.replace('/assets/new');
    return;
  }

  loading.value = true;
  try {
    // Make sure to fetch related data for dropdowns/display names
    // This is crucial if your asset object only contains IDs and not the full objects
    await Promise.all([
      assetStore.initializeDataForForms(), // This fetches asset_types, iso_groups etc.
      organizationStore.fetchOrganizations() // Fetch organizations for display name
    ]);

    const fetchedAsset = await assetStore.fetchAssetById(assetId);
    if (fetchedAsset) {
      asset.value = fetchedAsset;
    } else {
      console.warn('Asset not found for ID:', assetId);
      router.push('/assets');
    }
  } catch (e) {
    console.error('Error cargando el activo:', e);
    router.push('/assets');
  } finally {
    loading.value = false;
  }
};

const getAssetStatusClass = (isActive) => {
  return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

const translateAssetStatus = (isActive) => {
  return isActive ? 'Activo' : 'Inactivo';
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  // Ensure date is a valid Date object before formatting
  const d = new Date(date);
  return d.toLocaleDateString('es-ES');
};

onMounted(async () => {
  await loadAsset();
});
</script>

<style scoped>
/* Las clases de badge permanecen como estaban, no es necesario incluirlas en la respuesta final a menos que haya cambios */
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.badge-success {
  @apply bg-green-100 text-green-800;
}
.badge-danger {
  @apply bg-red-100 text-red-800;
}
.form-input-static { /* Estilo para texto estático en vista de detalles */
  @apply mt-1 text-sm text-gray-900;
}
</style>