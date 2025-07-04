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

    <!-- Sección de Tarjetas de Estadísticas -->
    <!-- <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4 max-w-7xl mx-auto" v-if="!loading && asset">
      <StatCard title="Sensores del Activo" :value="totalSensorsForAsset" icon="sensor" color="primary" />
      <StatCard title="Sensores Activos" :value="activeSensorsForAsset" icon="sensor" color="success" />
      <StatCard title="En Mantenimiento" :value="maintenanceSensorsForAsset" icon="sensor" color="warning" />
      <StatCard title="Alertas Activas" :value="activeAlertsForCurrentAsset" icon="alert" color="error" />
    </div> -->

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-600">Cargando activo...</p>
    </div>

    <div v-else-if="!asset" class="text-center py-8 text-gray-500">
      Activo no encontrado. Verifique el ID o si existen datos.
    </div>

    <!-- Contenedor principal para todas las tarjetas de detalle -->
    <div v-else class="max-w-7xl mx-auto space-y-6">

      <!-- Información General del Activo -->
      <div class="card p-6">
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

      <!-- Configuración Técnica -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4 border-b pb-2 mt-6">Configuración Técnica</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500">Organización</p>
            <p class="form-input-static">{{ asset.organization_name || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tipo de Activo</p>
            <p class="form-input-static">{{ asset.assetTypeName || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tipo de Rigidez</p>
            <p class="form-input-static">{{ asset.rigidity_type_name || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tipo de Cimentación</p>
            <p class="form-input-static">{{ asset.foundation_type_name || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tipo de Acoplamiento</p>
            <p class="form-input-static">{{ asset.coupling_type_name || 'N/A' }}</p>
          </div>
          <!-- INICIO DE LA CORRECCIÓN -->
          <div>
            <p class="text-sm font-medium text-gray-500">Perfil de Vibración</p>
            <div class="form-input-static flex items-center gap-2">
                <span>{{ asset.profileDisplayName || 'N/A' }}</span>
                <span v-if="asset.profileDisplayName && asset.profileDisplayName !== 'N/A'" 
                      class="text-xs font-semibold px-2 py-0.5 rounded-full" 
                      :class="asset.isCustomProfile ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'">
                    {{ asset.isCustomProfile ? 'Personalizado' : 'Estándar ISO' }}
                </span>
            </div>
          </div>
           <!-- FIN DE LA CORRECCIÓN -->
        </div>
      </div>

      <!-- Parámetros Operativos -->
      <div class="card p-6">
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
          <!-- <div>
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
          </div> -->
          <div>
            <p class="text-sm font-medium text-gray-500">Estado</p>
            <span :class="['badge', getAssetStatusClass(asset.is_active)]">
              {{ translateAssetStatus(asset.is_active) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Fechas -->
      <div class="card p-6">
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
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAssetStore } from '~/stores/assets';
import { useOrganizationStore } from '~/stores/organizations';
import { useSensorStore } from '~/stores/sensors';
import { useAlertStore } from '~/stores/alerts';
import PageHeader from '~/components/PageHeader.vue';
import StatCard from '~/components/StatCard.vue';

definePageMeta({
  // middleware: ['auth'] 
});

const route = useRoute();
const router = useRouter();
const assetStore = useAssetStore();
const organizationStore = useOrganizationStore();
const sensorStore = useSensorStore();
const alertStore = useAlertStore();

const loading = ref(true);
const asset = ref(null);

const combinedLocation = computed(() => {
  if (!asset.value) return '';
  const parts = [];
  if (asset.value.city) parts.push(asset.value.city);
  if (asset.value.state) parts.push(asset.value.state);
  if (asset.value.country) parts.push(asset.value.country);
  return parts.join(', ');
});

const sensorsForCurrentAsset = computed(() => {
  if (!asset.value || !sensorStore.sensors) return [];
  return sensorStore.sensors.filter(sensor => sensor.assetId === asset.value.id);
});

const totalSensorsForAsset = computed(() => sensorsForCurrentAsset.value.length);
const activeSensorsForAsset = computed(() => sensorsForCurrentAsset.value.filter(s => s.status === 'active').length);
const maintenanceSensorsForAsset = computed(() => sensorsForCurrentAsset.value.filter(s => s.status === 'maintenance').length);

const alertsForCurrentAsset = computed(() => {
    if (!asset.value || !alertStore.alerts) return [];
    return alertStore.alerts.filter(alert => alert.asset_id === asset.value.id);
});

const activeAlertsForCurrentAsset = computed(() => alertsForCurrentAsset.value.filter(alert => alert.status !== 'resolved').length);

const loadAsset = async () => {
  const assetId = route.params.id;
  if (assetId === 'new') {
    router.replace('/assets/new');
    return;
  }
  loading.value = true;
  try {
    await Promise.all([
      assetStore.initializeDataForForms(),
      organizationStore.fetchOrganizations(),
    ]);
    const fetchedAsset = await assetStore.fetchAssetById(assetId);
    if (fetchedAsset) {
      asset.value = fetchedAsset;
      await sensorStore.fetchSensors();
      await alertStore.fetchAlerts();
    } else {
      router.push('/assets');
    }
  } catch (e) {
    console.error('Error al cargar el activo:', e);
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
  const d = new Date(date);
  return d.toLocaleDateString("es-ES") + " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};

onMounted(async () => {
  await loadAsset();
});
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.form-input-static {
  @apply mt-1 text-sm text-gray-900;
}
.btn-secondary {
    @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
}
</style>