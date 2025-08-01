<template>
  <div>
    <PageHeader
      title="Dashboard"
      subtitle="Monitoreo y estadísticas del sistema" />

    <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4">
      <StatCard
        title="Total Sensores"
        :value="totalSensors"
        icon="sensor"
        color="primary"
        :trend="sensorTrend"
        :percentage="Number(Math.abs(totalSensorsPercentage).toFixed(1))" />

      <StatCard
        title="Alertas Activas"
        :value="activeAlerts"
        icon="alert"
        color="error"
        :trend="alertTrend"
        :percentage="Number(Math.abs(activeAlertsPercentage).toFixed(1))" />

      <StatCard
        title="Total Sensores Activos" :value="activeSensors"
        icon="sensor"
        color="success"
        :trend="activeSensorTrend"
        :percentage="Number(Math.abs(activeSensorsPercentage).toFixed(1))" />
     
      <StatCard
        title="Activos Operativos"
        :value="activeAssets"
        icon="asset"
        color="success"
        :trend="activeAssetTrend"
        :percentage="Number(Math.abs(activeAssetsPercentage).toFixed(1))" />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      
      <!-- Card: Dispositivos Recientes - MODIFICADA Y AHORA INTERACTIVA -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Dispositivos Recientes</h2>
          <button @click="expandedSection = expandedSection === 'sensors' ? null : 'sensors'" class="text-sm text-primary-600 hover:text-primary-500">
            {{ expandedSection === 'sensors' ? 'Ver menos' : 'Ver todo' }}
          </button>
        </div>
        <div class="space-y-1">
          <TransitionGroup name="fade">
            <!-- Bucle sobre dispositivos integrados -->
            <template v-for="device in displayedDevices" :key="device.code">
              <div 
                  @click="toggleExpandDevice(device.code)"
                  class="relative flex flex-col p-3 rounded-md border transition-all hover:shadow-sm cursor-pointer"
                  :class="[
                    getSensorItemBgClass(device.overallStatus),
                    expandedDevices.includes(device.code) ? 'rounded-b-none' : ''
                  ]">
                <div class="flex items-start">
                  <div :class="getSensorIconBgClass(device.overallStatus)" class="flex-shrink-0 rounded-full p-1.5">
                    <!-- Icono de dispositivo (SVG) -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                    </svg>
                  </div>

                  <div class="ml-3 flex-1">
                    <div class="flex items-center justify-between">
                      <h3 class="text-sm font-semibold text-gray-900 font-mono">{{ device.code }}</h3>
                      <div class="flex-shrink-0 ml-2 flex items-center gap-2">
                        <span :class="getSensorStatusClass(device.overallStatus)">
                          {{ getSensorStatusText(device.overallStatus) }}
                        </span>
                        <svg class="h-4 w-4 text-gray-400 transition-transform" :class="{'rotate-180': expandedDevices.includes(device.code)}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                    <div class="flex flex-wrap gap-1.5 mt-2">
                      <span class="badge badge-secondary">
                        {{ device.brandName }} / {{ device.modelName }}
                      </span>
                      <span v-if="device.assetName" class="badge badge-info">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v1H5V4zM5 7h10v9a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" /></svg>
                        {{ device.assetName }}
                      </span>
                       <span class="badge badge-description">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 16c1.255 0 2.443-.29 3.5-.804V4.804zM14.5 4c1.255 0 2.443.29 3.5.804v10a7.969 7.969 0 01-3.5-.804V4.804z" /></svg>
                        {{ device.logical_sensors.length }} sensores
                      </span>
                      <span v-if="device.latestTimestamp" class="badge badge-time">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>
                        {{ formatTimeAgo(device.latestTimestamp) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- SECCIÓN DESPLEGABLE CON SENSORES LÓGICOS -->
              <div v-if="expandedDevices.includes(device.code)" class="p-3 border-t border-gray-200 bg-white rounded-b-md">
                <h4 class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Sensores Lógicos</h4>
                <ul class="space-y-2">
                  <li v-for="sensor in device.logical_sensors" :key="sensor.id" class="flex items-center justify-between text-sm animate-fade-in py-1">
                    <div class="flex items-center truncate flex-1 min-w-0">
                        <span class="w-2 h-2 rounded-full mr-2 flex-shrink-0" :class="getSensorStatusDotClass(sensor.status)"></span>
                        <div class="truncate">
                            <span class="text-gray-800 font-medium truncate" :title="sensor.name">{{ sensor.name }}</span>
                            <span class="text-gray-500 ml-2 text-xs">({{ translateSensorType(sensor.type) }})</span>
                        </div>
                    </div>
                    <div class="flex items-center flex-shrink-0 ml-4">
                        <!-- Badges de Lectura -->
                        <div v-if="sensor.last_reading_timestamp">
                            <!-- Vista para Vibración -->
                            <div v-if="sensor.type === 'vibration'">
                                <div v-if="parseVibrationValue(sensor.last_value)" class="flex items-center gap-1">
                                    <span class="axis-badge bg-red-100 text-red-800"><b class="font-bold">X:</b> {{ parseVibrationValue(sensor.last_value).x }}</span>
                                    <span class="axis-badge bg-green-100 text-green-800"><b class="font-bold">Y:</b> {{ parseVibrationValue(sensor.last_value).y }}</span>
                                    <span class="axis-badge bg-blue-100 text-blue-800"><b class="font-bold">Z:</b> {{ parseVibrationValue(sensor.last_value).z }}</span>
                                </div>
                                <div v-else class="font-mono text-xs badge badge-secondary !py-0.5 !px-1.5">{{ sensor.last_value }} {{ sensor.last_unit }}</div>
                            </div>
                            <!-- Vista para otros -->
                            <div v-else-if="sensor.last_value !== null">
                                <span class="status-badge bg-blue-100 text-blue-800 font-mono text-xs">
                                    {{ sensor.last_value }} {{ sensor.last_unit }}
                                </span>
                            </div>
                        </div>
                        <div v-else class="text-xs text-gray-400 italic">Sin lecturas</div>
                        
                        <NuxtLink :to="`/sensors/${sensor.id}`" class="ml-2 text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100" title="Ver Detalles">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fill-rule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.03 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" /></svg>
                        </NuxtLink>
                    </div>
                  </li>
                </ul>
              </div>
            </template>
          </TransitionGroup>
          <p v-if="displayedDevices.length === 0 && !sensorStore.isLoading" class="text-center text-gray-500 py-4">No hay dispositivos disponibles.</p>
          <p v-if="sensorStore.isLoading" class="text-center text-gray-500 py-4">Cargando dispositivos...</p>
        </div>
      </div>

      <!-- Card: Activos Recientes - SIN CAMBIOS -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Activos Recientes</h2>
          <button
            @click="expandedSection = expandedSection === 'assets' ? null : 'assets'"
            class="text-sm text-primary-600 hover:text-primary-500">
            {{ expandedSection === 'assets' ? 'Ver menos' : 'Ver todo' }}
          </button>
        </div>
        <div class="mb-4">
          <div class="relative w-full">
            <input
              v-model="searchQuery"
              type="text"
              class="form-input pl-9"
              placeholder="Buscar activos..."
            />
            <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-8 8a10 10 0 1 1 17.32 5.92l4.68 4.68a1 1 0 0 1-1.42 1.42l-4.68-4.68A10 10 0 0 1 2 10z"/></svg>
          </div>
        </div>
        <div class="space-y-3"
              :class="{ 'max-h-80 overflow-y-auto pr-1': expandedSection === 'assets' }">
          <TransitionGroup name="fade">
            <NuxtLink v-for="asset in displayedAssets" :key="asset.id"
                  :to="`/asset-status/${asset.id}`"
                  class="relative flex flex-col p-3 rounded-md border transition-all hover:shadow-lg hover:cursor-pointer hover:bg-blue-100/50 hover:border-blue-300"
                  :class="getAssetItemBgClass(asset.is_active)"> 
              <div class="flex items-start">
                <div :class="getAssetIconBgClass(asset.is_active)" class="flex-shrink-0 rounded-full p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 11.25A1.25 1.25 0 0 1 8.25 10h7.5A1.25 1.25 0 0 1 17 11.25v.5A1.25 1.25 0 0 1 15.75 13h-7.5A1.25 1.25 0 0 1 7 11.75v-.5zM12 2a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V2.75A.75.75 0 0 1 12 2zM12 18a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V18.75A.75.75 0 0 1 12 18zM19.97 4.22a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0zM4.22 19.97a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0zM21.25 12a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75zM2.75 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H3.5a.75.75 0 0 1-.75-.75zM19.97 19.97a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0zM4.22 4.22a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0zM12 8.75A3.25 3.25 0 0 1 8.75 12h-1.5a.75.75 0 0 1 0-1.5h1.5A3.25 3.25 0 0 1 12 8.75z"/></svg>
                </div>
                <div class="ml-3 flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-gray-900 truncate">{{ asset.name }}</h3>
                    <div class="flex-shrink-0 ml-2">
                      <span :class="getAssetStatusClass(asset.is_active)">
                        {{ asset.is_active ? "Activo" : "Inactivo" }}
                      </span>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-if="asset.assetTypeName && asset.assetTypeName !== 'N/A'" class="badge badge-secondary">
                      Tipo: {{ asset.assetTypeName }}
                    </span>
                    <span v-if="asset.description" class="badge badge-description">
                      Descripción: {{ asset.description }}
                    </span>
                    <span v-if="getAssetDisplayLocation(asset) !== 'Información no disponible'" class="badge badge-location">
                      {{ getAssetDisplayLocation(asset) }}
                    </span>
                  </div>
                </div>
              </div>
            </NuxtLink>
          </TransitionGroup>
          <p v-if="displayedAssets.length === 0 && !assetStore.isLoading" class="text-center text-gray-500 py-4">No hay activos disponibles para esta organización.</p>
          <p v-if="assetStore.isLoading" class="text-center text-gray-500 py-4">Cargando activos...</p>
        </div>
      </div>

      <div class="card lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Alertas Recientes</h2>
          <button
            @click="expandedSection = expandedSection === 'alerts' ? null : 'alerts'"
            class="text-sm text-primary-600 hover:text-primary-500">
            {{ expandedSection === 'alerts' ? 'Ver menos' : 'Ver todo' }}
          </button>
        </div>

        <div :class="{ 'max-h-80 overflow-y-auto pr-1': expandedSection === 'alerts' }">
          <AlertList :alerts="displayedAlerts" :loading="loading" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'; 
import { useSensorStore } from '~/stores/sensors';
import { useAlertStore } from '~/stores/alerts';
import { useOrganizationStore } from '~/stores/organizations';
import { useAssetStore } from '~/stores/assets'; 
import { definePageMeta, useNuxtApp } from '#imports';
import PageHeader from '~/components/PageHeader.vue';
import StatCard from '~/components/StatCard.vue';
import AlertList from '~/components/AlertList.vue';

definePageMeta({
  permission: 'dashboard.ver',
});

// Stores
const sensorStore = useSensorStore();
const alertStore = useAlertStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore(); 
const { $supabase } = useNuxtApp();


// State
const loading = ref(false);
const expandedSection = ref(null);
const searchQuery = ref('');
const selectedSensorIds = ref([]); 
const expandedDevices = ref([]); // State for expanded devices

const previousTotalSensors = ref(0);
const previousTotalAssets = ref(0); 

const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Stats
const totalSensors = computed(() => sensorStore.filteredSensors.length);
const activeAlerts = computed(() => alertStore.alerts.filter(a => a.status === 'active' && (organizationStore.selectedOrganizationId === null || a.organization_id === organizationStore.selectedOrganizationId)).length);
const totalAlerts = computed(() => alertStore.alerts.filter(a => (organizationStore.selectedOrganizationId === null || a.organization_id === organizationStore.selectedOrganizationId)).length);
const activeSensors = computed(() => sensorStore.filteredSensors.filter(s => s.status === 'active').length);
const totalAssets = computed(() => assetStore.assets.filter(a => organizationStore.selectedOrganizationId === null || a.organization_id === organizationStore.selectedOrganizationId).length);
const activeAssets = computed(() => assetStore.assets.filter(a => a.is_active && (organizationStore.selectedOrganizationId === null || a.organization_id === organizationStore.selectedOrganizationId)).length);

// --- Percentages y Tendencias ---
const totalSensorsPercentage = computed(() => calculatePercentageChange(totalSensors.value, previousTotalSensors.value));
const totalAssetsPercentage = computed(() => calculatePercentageChange(totalAssets.value, previousTotalAssets.value));
const activeSensorsPercentage = computed(() => totalSensors.value === 0 ? 0 : (activeSensors.value / totalSensors.value) * 100);
const activeAlertsPercentage = computed(() => totalAlerts.value === 0 ? 0 : (activeAlerts.value / totalAlerts.value) * 100);
const activeAssetsPercentage = computed(() => totalAssets.value === 0 ? 0 : (activeAssets.value / totalAssets.value) * 100);

const sensorTrend = computed(() => totalSensorsPercentage.value > 0 ? 'up' : totalSensorsPercentage.value < 0 ? 'down' : 'stable');
const assetTrend = computed(() => totalAssetsPercentage.value > 0 ? 'up' : totalAssetsPercentage.value < 0 ? 'down' : 'stable');
const alertTrend = 'down'; 
const activeSensorTrend = 'up'; 
const activeAssetTrend = 'up'; 

// --- Propiedades Computadas para Listas ---

// Agrupa sensores lógicos en dispositivos, similar a pageSensorIndex
const displayedDevices = computed(() => {
    if (!sensorStore.filteredSensors || sensorStore.filteredSensors.length === 0) return [];

    const statusPriority = { 'error': 4, 'inactive': 3, 'maintenance': 2, 'active': 1 };

    const grouped = sensorStore.filteredSensors.reduce((acc, sensor) => {
        const key = sensor.code;
        if (!key) return acc;

        if (!acc[key]) {
            acc[key] = {
                code: key,
                brandName: sensor.brandName,
                modelName: sensor.modelName,
                assetName: sensor.assetName,
                overallStatus: 'active',
                latestTimestamp: null,
                logical_sensors: []
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

    const devices = Object.values(grouped);
    const communicatedDevices = devices.filter(d => d.latestTimestamp);
    communicatedDevices.sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));
    
    const limit = expandedSection.value === 'sensors' ? devices.length : 5;
    return communicatedDevices.slice(0, limit);
});

const filteredAssets = computed(() => {
  const selectedOrgId = organizationStore.selectedOrganizationId;
  let assets = assetStore.assets.filter(asset => 
    selectedOrgId === null || asset.organization_id === selectedOrgId
  ).sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  
  if (!searchQuery.value) return assets;
  
  const query = searchQuery.value.toLowerCase();
  return assets.filter(asset =>
    asset.name.toLowerCase().includes(query) ||
    (asset.description && asset.description.toLowerCase().includes(query)) ||
    (asset.location_description && asset.location_description.toLowerCase().includes(query))
  );
});

const displayedAssets = computed(() => {
  return expandedSection.value === 'assets' ? filteredAssets.value : filteredAssets.value.slice(0, 3);
});

const displayedAlerts = computed(() => {
  const alerts = alertStore.filteredAlerts; 
  return expandedSection.value === 'alerts' ? alerts : alerts.slice(0, 3);
});

// --- Métodos ---

const toggleExpandDevice = (code) => {
  const index = expandedDevices.value.indexOf(code);
  if (index > -1) {
    expandedDevices.value.splice(index, 1);
  } else {
    expandedDevices.value.push(code);
  }
};

const formatTimeAgo = (date) => {
  if (!date) return 'nunca';
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
};

const getAssetDisplayLocation = (asset) => {
  const parts = [asset.city, asset.state, asset.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Ubicación no disponible';
};

const parseVibrationValue = (value) => {
    if (typeof value !== 'string' || !value.includes(':')) return null;
    const parts = value.split(',').reduce((acc, part) => {
        const [axis, val] = part.split(':');
        if (axis && val) {
            acc[axis.trim().toLowerCase()] = val.trim();
        }
        return acc;
    }, {});
    return parts.x && parts.y && parts.z ? parts : null;
};

const translateSensorType = (type) => ({ 
    "temperature": "Temperatura", 
    "vibration": "Vibración",
    "humidity": "Humedad",
    "pressure": "Presión"
}[type] || type);

// --- Funciones de Estilo ---
const getSensorItemBgClass = (status) => 'bg-gray-50 border-gray-100';
const getAssetItemBgClass = (isActive) => 'bg-gray-50 border-gray-100';

const getSensorStatusClass = (status) => ({
  'active': 'badge bg-green-100 text-green-800', 'inactive': 'badge bg-gray-200 text-gray-800',
  'maintenance': 'badge bg-yellow-100 text-yellow-800', 'error': 'badge bg-red-100 text-red-800'
}[status] || 'badge bg-gray-100 text-gray-800');

const getSensorStatusText = (status) => ({
  'active': 'Activo', 'inactive': 'Inactivo', 'maintenance': 'Mantenimiento', 'error': 'Error'
}[status] || 'Desconocido');

const getAssetStatusClass = (isActive) => isActive ? 'badge bg-green-100 text-green-800' : 'badge bg-red-100 text-red-800';

const getSensorIconBgClass = (status) => ({
  'active': 'bg-green-100 text-green-700', 'inactive': 'bg-gray-200 text-gray-700',
  'maintenance': 'bg-yellow-100 text-yellow-700', 'error': 'bg-red-100 text-red-700'
}[status] || 'bg-gray-100 text-gray-700');

const getAssetIconBgClass = (isActive) => isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

const getSensorStatusDotClass = (status) => ({
  'active': 'bg-green-500', 'inactive': 'bg-gray-400',
  'maintenance': 'bg-yellow-500', 'error': 'bg-red-500'
}[status] || 'bg-gray-400');

// --- Ciclo de Vida ---
watch(() => organizationStore.selectedOrganizationId, async () => {
  await Promise.all([
      sensorStore.fetchSensors(),
      alertStore.fetchAlerts(),
      assetStore.fetchAssets() 
  ]);
}, { immediate: true }); 

onMounted(async () => {
    loading.value = true;
    try {
        await Promise.all([
            organizationStore.fetchOrganizations(),
            assetStore.initializeDataForForms(),
            sensorStore.fetchSensors(), 
            alertStore.fetchAlerts(), 
            assetStore.fetchAssets() 
        ]);

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: sensorsYesterday } = await $supabase.from('sensors').select('id', { count: 'exact' }).lt('created_at', twentyFourHoursAgo);
        previousTotalSensors.value = sensorsYesterday || 0;
        const { count: assetsYesterday } = await $supabase.from('assets_base').select('id', { count: 'exact' }).lt('created_at', twentyFourHoursAgo);
        previousTotalAssets.value = assetsYesterday || 0;
        
        alertStore.subscribeToAlertUpdates();
        sensorStore.subscribeToSensorUpdates();
    } catch (error) {
        console.error("[Dashboard] Error al cargar:", error);
    } finally {
        loading.value = false;
    }
});

onUnmounted(async () => {
  await sensorStore.unsubscribeFromSensorUpdates();      
  await alertStore.unsubscribeFromAlertUpdates();         
});
</script>

<style scoped>
/* Estilos para las transiciones */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Estilos para los badges */
.badge {
  @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium;
  white-space: nowrap;
}
.status-badge { @apply px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize; }
.axis-badge { @apply inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-semibold font-mono; }


/* Colores de fondo de los ITEMS */
.bg-gray-50 { background-color: #F9FAFB; }
.border-gray-100 { border-color: #F3F4F6; }

/* Colores de fondo y texto para BADGES y CÍRCULOS de ÍCONOS */
.bg-red-100 { background-color: #FEE2E2; }
.text-red-800 { color: #991B1B; }
.text-red-700 { color: #B91C1C; }
.bg-red-500 { background-color: #EF4444; }

.bg-yellow-100 { background-color: #FEF3C7; }
.text-yellow-800 { color: #92400E; }
.text-yellow-700 { color: #B45309; }
.bg-yellow-500 { background-color: #F59E0B; }

.bg-green-100 { background-color: #DCFCE7; }
.text-green-800 { color: #166534; }
.text-green-700 { color: #15803D; }
.bg-green-500 { background-color: #22C55E; }

.bg-gray-100 { background-color: #F3F4F6; }
.bg-gray-200 { background-color: #E5E7EB; }
.text-gray-800 { color: #1F2937; }
.text-gray-700 { color: #374151; }
.text-gray-600 { color: #4B5563; }
.bg-gray-400 { background-color: #9CA3AF; }

.bg-blue-100 { background-color: #DBEAFE; } 
.text-blue-700 { color: #1D4ED8; } 
.text-blue-800 { color: #1E40AF; }

.bg-sky-100 { background-color: #E0F2FE; } 
.text-sky-700 { color: #0369A1; } 

.bg-rose-100 { background-color: #FFE4E6; } 
.text-rose-700 { color: #BE185D; } 

/* Estilos para los badges genéricos definidos en el template */
.badge-secondary { @apply bg-gray-200 text-gray-700; }
.badge-info { @apply bg-blue-100 text-blue-700; }
.badge-time { @apply bg-gray-100 text-gray-600; }
.badge-location { @apply bg-sky-100 text-sky-700; }
.badge-description { @apply bg-rose-100 text-rose-700; }
</style>
