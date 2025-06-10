<template>
  <div>
    <PageHeader
      title="Dashboard"
      subtitle="Monitorear y estadísticas del sistema" />

    <div class="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-4">
      <StatCard
        title="Total Sensores"
        :value="totalSensors"
        icon="sensor"
        color="primary"
        :trend="sensorTrend"
        :percentage="Math.abs(totalSensorsPercentage).toFixed(1)" />

      <StatCard
        title="Alertas Activas"
        :value="activeAlerts"
        icon="alert"
        color="error"
        :trend="alertTrend"
        :percentage="Math.abs(activeAlertsPercentage).toFixed(1)" />

      <StatCard
        title="Total Sensores Activos" :value="activeSensors"
        icon="sensor"
        color="success"
        :trend="activeSensorTrend"
        :percentage="Math.abs(activeSensorsPercentage).toFixed(1)" />
     
      <StatCard
        title="Activos Operativos"
        :value="activeAssets"
        icon="asset"
        color="success"
        :trend="activeAssetTrend"
        :percentage="Math.abs(activeAssetsPercentage).toFixed(1)" />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      
      <!-- Card: Sensores Recientes - DISEÑO AJUSTADO (todos los datos en badges, fondo diferente) -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Sensores Recientes</h2>
          <button
            @click="expandedSection = expandedSection === 'sensors' ? null : 'sensors'"
            class="text-sm text-primary-600 hover:text-primary-500">
            {{ expandedSection === 'sensors' ? 'Ver menos' : 'Ver todo' }}
          </button>
        </div>
        <div class="space-y-3"
              :class="{ 'max-h-80 overflow-y-auto pr-1': expandedSection === 'sensors' }">
          <TransitionGroup name="fade">
            <div v-for="sensor in displayedSensors" :key="sensor.id"
                  class="relative flex flex-col p-3 rounded-md border transition-all hover:shadow-sm"
                  :class="getSensorItemBgClass(sensor.status)"> <!-- Fondo dinámico -->
              <div class="flex items-start">
                <div :class="getSensorIconBgClass(sensor.status)" class="flex-shrink-0 rounded-full p-1">
                  <!-- Icono de sensor (SVG genérico) -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V2.75A.75.75 0 0 1 12 2zM12 21a.75.75 0 0 1-.75-.75v-1.5a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-.75.75zM4.22 5.03a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0zM18.78 19.97a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0l-1.06-1.06a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 0zM21.25 12a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75zM2.75 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H3.5a.75.75 0 0 1-.75-.75zM19.97 4.22a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0zM5.03 18.78a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0zM12 6a6 6 0 1 1 0 12A6 6 0 0 1 12 6zM12 7.5a4.5 4.5 0 1 0 0 9A4.5 4.5 0 0 0 12 7.5z"/></svg>
                </div>

                <div class="ml-3 flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-gray-900">{{ sensor.name }}</h3>
                    <div class="flex-shrink-0 ml-2">
                      <span :class="getSensorStatusClass(sensor.status)">
                        {{ getSensorStatusText(sensor.status) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-if="sensor.assetName" class="badge badge-secondary">
                      Activo: {{ sensor.assetName }}
                    </span>
                    <span v-if="sensor.value && sensor.unit" class="badge badge-info">
                      Valor: {{ sensor.value }} {{ sensor.unit }}
                    </span>
                    <span v-if="sensor.location_description" class="badge badge-location">
                      Ubicación: {{ sensor.location_description }}
                    </span>
                    <span class="badge badge-time">
                      Hace: {{ formatTimeAgo(sensor.lastReading) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
          <p v-if="displayedSensors.length === 0 && !sensorStore.isLoading" class="text-center text-gray-500 py-4">No hay sensores disponibles para esta organización.</p>
          <p v-if="sensorStore.isLoading" class="text-center text-gray-500 py-4">Cargando sensores...</p>
        </div>
      </div>

      <!-- Card: Activos Recientes - DISEÑO AJUSTADO (todos los datos en badges, fondo diferente) -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Activos Recientes</h2>
          <button
            @click="expandedSection = expandedSection === 'assets' ? null : 'assets'"
            class="text-sm text-primary-600 hover:text-primary-500">
            {{ expandedSection === 'assets' ? 'Ver menos' : 'Ver todo' }}
          </button>
        </div>
        <div class="space-y-3"
              :class="{ 'max-h-80 overflow-y-auto pr-1': expandedSection === 'assets' }">
          <TransitionGroup name="fade">
            <div v-for="asset in displayedAssets" :key="asset.id"
                  class="relative flex flex-col p-3 rounded-md border transition-all hover:shadow-sm"
                  :class="getAssetItemBgClass(asset.is_active)"> <!-- Fondo dinámico -->
              <div class="flex items-start">
                <div :class="getAssetIconBgClass(asset.is_active)" class="flex-shrink-0 rounded-full p-1">
                  <!-- Icono de activo (SVG genérico) -->
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
            </div>
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

      <div class="card lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Monitoreo en Tiempo Real</h2>
          <button
            @click="expandedSection = expandedSection === 'chart' ? null : 'chart'"
            class="text-sm text-primary-600 hover:text-primary-500">
            {{ expandedSection === 'chart' ? 'Ver menos' : 'Ver todo' }}
          </button>
        </div>

        <div class="mb-4 flex flex-wrap gap-2">
          <label v-for="sensor in availableSensorsForSelection"
                  :key="sensor.id"
                  class="inline-flex items-center">
            <input type="checkbox"
                    v-model="selectedSensorIds"
                    :value="sensor.id"
                    class="form-checkbox h-4 w-4 text-primary-600 rounded border-gray-300" />
            <span class="ml-2 text-sm text-gray-700">{{ sensor.name }}</span>
            <span v-if="sensor.assetName" class="ml-1 text-xs text-gray-500">({{ sensor.assetName }})</span>
          </label>
          <p v-if="availableSensorsForSelection.length === 0 && !sensorStore.isLoading" class="text-sm text-gray-500">No hay sensores activos para monitorear en esta organización.</p>
           <p v-if="sensorStore.isLoading" class="text-sm text-gray-500">Cargando sensores para seleccionar...</p>
        </div>

        <SensorChart
          :sensors="realtimeSelectedSensorsForChart"
          :height="expandedSection === 'chart' ? 600 : 300"
          :show-time-range-controls="true"
        />
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
import SensorChart from '~/components/SensorChart.vue';

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
const selectedSensorIds = ref([]); 

const previousTotalSensors = ref(0);
const previousTotalAssets = ref(0); 

const calculatePercentageChange = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

// Stats (valores actuales)
const totalSensors = computed(() => {
    const count = sensorStore.filteredSensors.length;
    console.log(`[Dashboard Computed] totalSensors: ${count} (depende de filteredSensors)`);
    return count;
});

const activeAlerts = computed(() => {
  const selectedOrgId = organizationStore.selectedOrganizationId;
  const filtered = alertStore.alerts.filter(alert => 
    (alert.status === 'new' || alert.status === 'acknowledged') && 
    (selectedOrgId === null || alert.organizationId === selectedOrgId) 
  );
  const count = filtered.length;
  console.log(`[Dashboard Computed] activeAlerts: ${count} (filtrado por org: ${selectedOrgId})`);
  return count;
}); 

const totalAlerts = computed(() => {
  const selectedOrgId = organizationStore.selectedOrganizationId;
  const filtered = alertStore.alerts.filter(alert => 
    selectedOrgId === null || alert.organizationId === selectedOrgId 
  );
  return filtered.length;
}); 

const activeSensors = computed(() => {
    const count = sensorStore.filteredSensors.filter(s => s.status === 'active').length;
    console.log(`[Dashboard Computed] activeSensors: ${count} (depende de filteredSensors)`);
    return count;
});

const totalAssets = computed(() => {
  const selectedOrgId = organizationStore.selectedOrganizationId;
  const filteredAssets = assetStore.assets.filter(asset => 
    selectedOrgId === null || asset.organization_id === selectedOrgId
  );
  return filteredAssets.length;
});

const activeAssets = computed(() => {
  const selectedOrgId = organizationStore.selectedOrganizationId;
  const filteredAssets = assetStore.assets.filter(asset => 
    (selectedOrgId === null || asset.organization_id === selectedOrgId) &&
    asset.is_active === true
  );
  return filteredAssets.length;
});


// --- Porcentajes calculados ---
const totalSensorsPercentage = computed(() =>
  calculatePercentageChange(totalSensors.value, previousTotalSensors.value)
);

const totalAssetsPercentage = computed(() =>
  calculatePercentageChange(totalAssets.value, previousTotalAssets.value)
);

const activeSensorsPercentage = computed(() => {
  if (totalSensors.value === 0) return 0;
  return (activeSensors.value / totalSensors.value) * 100;
});

const activeAlertsPercentage = computed(() => {
  if (totalAlerts.value === 0) return 0;
  return (activeAlerts.value / totalAlerts.value) * 100;
});

const activeAssetsPercentage = computed(() => {
  if (totalAssets.value === 0) return 0;
  return (activeAssets.value / totalAssets.value) * 100;
});

// --- Tendencias ---
const sensorTrend = computed(() => totalSensorsPercentage.value > 0 ? 'up' : totalSensorsPercentage.value < 0 ? 'down' : 'stable');
const assetTrend = computed(() => totalAssetsPercentage.value > 0 ? 'up' : totalAssetsPercentage.value < 0 ? 'down' : 'stable');
const alertTrend = 'down'; 
const activeSensorTrend = 'up'; 
const activeAssetTrend = 'up'; 

// Propiedades computadas para la visualización de listas
const displayedSensors = computed(() => {
  const sensors = sensorStore.recentSensors; 
  console.log('[Dashboard Computed] displayedSensors (Sensores Recientes) evaluado. Cantidad:', sensors.length, 'Primeros 3 IDs:', sensors.slice(0,3).map(s => s.id));
  return expandedSection.value === 'sensors' ? sensors : sensors.slice(0, 3);
});

// Propiedad computada para Activos Recientes
const displayedAssets = computed(() => {
  const selectedOrgId = organizationStore.selectedOrganizationId;
  const assets = assetStore.assets.filter(asset => 
    selectedOrgId === null || asset.organization_id === selectedOrgId
  ).sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0);
      const dateB = new Date(b.updated_at || b.created_at || 0);
      return dateB - dateA; 
  });
  console.log('[Dashboard Computed] displayedAssets (Activos Recientes) evaluado. Cantidad:', assets.length, 'Primeros 3 IDs:', assets.slice(0,3).map(a => a.id));
  return expandedSection.value === 'assets' ? assets : assets.slice(0, 3);
});


const displayedAlerts = computed(() => {
  const alerts = alertStore.filteredAlerts; 
  console.log('[Dashboard Computed] displayedAlerts (Alertas Recientes) evaluado. Cantidad:', alerts.length, 'Primeras 3 IDs:', alerts.slice(0,3).map(a => a.id));
  return expandedSection.value === 'alerts' ? alerts : alerts.slice(0, 3);
});

const availableSensorsForSelection = computed(() => {
  const sensors = sensorStore.filteredSensors
    .filter(s => s.status === 'active' && s.last_communication) 
    .sort((a, b) => {
      const dateA = a.lastReading ? new Date(a.lastReading) : (a.createdAt ? new Date(a.createdAt) : new Date(0));
      const dateB = b.lastReading ? new Date(b.lastReading) : (b.createdAt ? new Date(b.createdAt) : new Date(0));
      return dateB - dateA;
    });
    console.log('[Dashboard Computed] availableSensorsForSelection (para Gráfica) evaluado. Cantidad:', sensors.length, 'IDs de sensores disponibles:', sensors.map(s => s.id));
    return sensors;
});

const realtimeSelectedSensorsForChart = computed(() => {
  const currentFilteredSensorIds = availableSensorsForSelection.value.map(s => s.id);
  const selected = selectedSensorIds.value
    .filter(id => currentFilteredSensorIds.includes(id)) 
    .map(id => {
      const sensorDetails = sensorStore.sensors.find(s => s.id === id); 
      const readings = sensorStore.allSensorRecentReadings[id] || [];
      return sensorDetails ? {
        ...sensorDetails,
        readings: readings,
      } : null;
    }).filter(Boolean);
    console.log('[Dashboard Computed] realtimeSelectedSensorsForChart evaluado. Cantidad:', selected.length, 'IDs seleccionados para gráfica:', selectedSensorIds.value, 'IDs de sensores filtrados actualmente:', currentFilteredSensorIds);
    return selected;
});

// Métodos para formatear la fecha
const formatTimeAgo = (date) => {
  if (!date) return '';
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) {
    return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hora${hours === 1 ? '' : 's'}`;
  }

  const days = Math.floor(hours / 24);
  return `${days} día${days === 1 ? '' : 's'}`;
};

// FUNCIÓN ACTUALIZADA: Formatea la ubicación y la descripción de un activo
const getAssetDisplayLocation = (asset) => {
  const parts = [];
  if (asset.location_description) { 
    parts.push(`Ubicación: ${asset.location_description}`);
  }
  
  const geoParts = [];
  if (asset.city) geoParts.push(asset.city);
  if (asset.state) geoParts.push(asset.state);
  if (asset.country) geoParts.push(asset.country);

  if (geoParts.length > 0) {
    parts.push(`Ubicación Geográfica: ${geoParts.join(', ')}`);
  }
  
  if (parts.length === 0) {
    return 'Información no disponible';
  } else {
    return parts.join(' | '); 
  }
};

// --- Funciones para clases de estilo y texto de Sensores/Activos ---

// Clases para el fondo del ITEM completo para Sensores (cambiado a gris suave)
const getSensorItemBgClass = (status) => {
  // Se usa un color fijo de fondo para los ítems de sensores
  return 'bg-gray-50 border-gray-100'; 
};

// Clases para el fondo del ITEM completo para Activos (cambiado a gris suave)
const getAssetItemBgClass = (isActive) => {
  // Se usa un color fijo de fondo para los ítems de activos
  return 'bg-gray-50 border-gray-100';
};


// Clases para el TEXTO y FONDO del BADGE (igual que los badges de alerta)
const getSensorStatusClass = (status) => {
  switch (status) {
    case 'active': return 'badge bg-green-100 text-green-800';
    case 'inactive': return 'badge bg-red-100 text-red-800';
    case 'maintenance': return 'badge bg-yellow-100 text-yellow-800';
    default: return 'badge bg-gray-100 text-gray-700';
  }
};

const getSensorStatusText = (status) => {
  switch (status) {
    case 'active': return 'Activo';
    case 'inactive': return 'Inactivo';
    case 'maintenance': return 'Mantenimiento';
    default: return 'Desconocido';
  }
};

const getAssetStatusClass = (isActive) => {
  return isActive ? 'badge bg-green-100 text-green-800' : 'badge bg-red-100 text-red-800';
};

// Clases para el FONDO y TEXTO del CÍRCULO del ICONO (similar a los iconos de alerta)
const getSensorIconBgClass = (status) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'inactive': return 'bg-red-100 text-red-700';
    case 'maintenance': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getAssetIconBgClass = (isActive) => {
  return isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
};

// Nuevas clases de badges específicos para el contenido
const getBadgeSecondaryClass = () => 'badge bg-gray-200 text-gray-700'; 
const getBadgeInfoClass = () => 'badge bg-blue-100 text-blue-700';     
const getBadgeTimeClass = () => 'badge bg-gray-100 text-gray-600';     
const getBadgeLocationClass = () => 'badge bg-sky-100 text-sky-700'; // CAMBIADO: indigo a sky para menos chillon
const getBadgeDescriptionClass = () => 'badge bg-rose-100 text-rose-700'; // CAMBIADO: purple a rose para menos chillon


// --- Watchers y Ciclo de Vida ---

watch(selectedSensorIds, (newIds, oldIds) => {
  console.log('[Dashboard Watcher] selectedSensorIds ha cambiado. Nuevos IDs:', newIds, 'Antiguos IDs:', oldIds);
  if (oldIds && oldIds.length > 0 && newIds.length === 0) { 
     sensorStore.unsubscribeFromAllDashboardReadings();
     console.log('[Dashboard Watcher] selectedSensorIds vacíos, desuscrito de todos los gráficos explícitamente.');
  } else if (newIds && newIds.length > 0) { 
    sensorStore.subscribeToDashboardReadings(newIds);
    console.log(`[Dashboard Watcher] Llamando a subscribeToDashboardReadings con: ${newIds.length} IDs.`);
  } else {
    console.log('[Dashboard Watcher] selectedSensorIds sin cambios significativos para suscripción/desuscripción.');
  }
}, { immediate: false }); 


watch(() => organizationStore.selectedOrganizationId, async (newOrgId, oldOrgId) => {
  console.groupCollapsed(`[Dashboard Watcher] organizationStore.selectedOrganizationId ha cambiado de ${oldOrgId} a ${newOrgId}.`);
  console.log('  - Paso 1: Desuscribiendo y limpiando selección previa de sensores para gráfica.');
  await sensorStore.unsubscribeFromAllDashboardReadings(); 
  selectedSensorIds.value = []; 
  sensorStore.allSensorRecentReadings = {}; 

  // ESENCIAL: Asegurar que los datos de referencia y organizaciones se carguen primero
  // Esto es vital para el mapeo en fetchAssets y fetchSensors
  await assetStore.initializeDataForForms(); // Cargar tipos de activo, etc.
  await organizationStore.fetchOrganizations(); // Cargar la lista de organizaciones


  await Promise.all([
      sensorStore.fetchSensors(),
      alertStore.fetchAlerts(),
      assetStore.fetchAssets() 
  ]);

  console.log('  - Paso 2: Esperando nextTick para la reactividad de las computadas.');
  await nextTick(); 
  
  console.log('  - Paso 3: availableSensorsForSelection DESPUÉS de nextTick. Cantidad:', availableSensorsForSelection.value.length, 'IDs:', availableSensorsForSelection.value.map(s => s.id));
  
  if (availableSensorsForSelection.value.length > 0) {
      const newSelectedIds = availableSensorsForSelection.value.map(s => s.id);
      selectedSensorIds.value = newSelectedIds; 
      console.log('  - Paso 4: Sensores re-seleccionados para la nueva organización:', organizationStore.selectedOrganizationId);
  } else {
      console.log('  - Paso 4: No hay sensores activos para la nueva organización. selectedSensorIds permanecerán vacíos.');
  }
  console.groupEnd();
}, { immediate: true }); 


onMounted(async () => {
    loading.value = true;
    console.groupCollapsed('[Dashboard onMounted] Iniciando carga de datos...');
    try {
        // ESENCIAL: Cargar datos de referencia y organizaciones PRIMERO
        await assetStore.initializeDataForForms(); // Cargar tipos de activo, etc.
        await organizationStore.fetchOrganizations(); // Cargar la lista de organizaciones

        await Promise.all([
            sensorStore.fetchSensors(), 
            alertStore.fetchAlerts(), 
            assetStore.fetchAssets() 
        ]);

        console.log('[Dashboard onMounted] DESPUÉS DE PROMISE.ALL - Estados de Stores:');
        console.log(`  - organizationStore.selectedOrganizationId: ${organizationStore.selectedOrganizationId}`);
        console.log(`  - sensorStore.sensors.length (TODOS los sensores en el store): ${sensorStore.sensors.length}`);
        console.log(`  - alertStore.alerts.length (TODAS las alertas en el store): ${alertStore.alerts.length}`);
        console.log(`  - organizationStore.organizations.length: ${organizationStore.organizations.length}`);
        console.log(`  - assetStore.assets.length: ${assetStore.assets.length}`);
        console.log(`  - sensorStore.filteredSensors.length (SENSORES YA FILTRADOS al cargar): ${sensorStore.filteredSensors.length}`);

        if (selectedSensorIds.value.length === 0 && availableSensorsForSelection.value.length > 0) {
            console.log('[Dashboard onMounted] Auto-seleccionando sensores con lecturas para la gráfica en la carga inicial.');
            selectedSensorIds.value = availableSensorsForSelection.value.map(s => s.id);
        } else if (availableSensorsForSelection.value.length === 0) {
             console.log('[Dashboard onMounted] No hay sensores activos disponibles con lecturas para seleccionar en la carga inicial.');
        }


        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const { count: totalSensorsTwentyFourHoursAgo, error: errSensorsYesterday } = await $supabase
            .from('sensors') 
            .select('id', { count: 'exact' })
            .lt('created_at', twentyFourHoursAgo.toISOString()); 
        if (errSensorsYesterday) console.error("Error al obtener el total de sensores hace 24h:", errSensorsYesterday);
        previousTotalSensors.value = totalSensorsTwentyFourHoursAgo || 0;

        const { count: totalAssetsTwentyFourHoursAgo, error: errAssetsYesterday } = await $supabase
            .from('assets_base') 
            .select('id', { count: 'exact' })
            .lt('created_at', twentyFourHoursAgo.toISOString()); 
        if (errAssetsYesterday) console.error("Error al obtener el total de activos hace 24h:", errAssetsYesterday);
        previousTotalAssets.value = totalAssetsTwentyFourHoursAgo || 0;
        
        console.log('[Dashboard.vue - onMounted] Preparando para iniciar suscripciones Realtime GENERALES...');

        alertStore.subscribeToAlertUpdates();
        console.log('--- alertStore.subscribeToAlertUpdates() ha sido llamada ---');

        sensorStore.subscribeToSensorUpdates();
        console.log('--- sensorStore.subscribeToSensorUpdates() ha sido llamada ---');
        
        sensorStore.subscribeToDashboardRecentReadings();
        console.log('--- sensorStore.subscribeToDashboardRecentReadings() ha sido llamada ---');

    } catch (error) {
        console.error("[Dashboard] Error al cargar el dashboard:", error);
    } finally {
        loading.value = false;
        console.groupEnd();
    }
});

onUnmounted(async () => {
  console.log('[Dashboard.vue - onUnmounted] Desuscribiendo de los canales de Realtime...');
  await sensorStore.unsubscribeFromAllDashboardReadings(); 
  await sensorStore.unsubscribeFromSensorUpdates();      
  await sensorStore.unsubscribeFromDashboardRecentReadings(); 
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

/* Estilos para los badges */
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  white-space: nowrap; /* Evita que los badges se dividan en varias líneas */
}

/* Colores de fondo de los ITEMS */
/* Para Sensores y Activos, un gris muy suave para diferenciarse un poco más del blanco */
.bg-gray-50 { background-color: #F9FAFB; }
.border-gray-100 { border-color: #F3F4F6; }


/* Colores de fondo de BADGE y FONDO de CÍRCULO de ÍCONO (igual que AlertList.vue) */
.bg-red-100 { background-color: #FEE2E2; }
.bg-yellow-100 { background-color: #FEF3C7; }
.bg-green-100 { background-color: #DCFCE7; }
.bg-gray-100 { background-color: #F3F4F6; }
.bg-blue-100 { background-color: #DBEAFE; } 
.bg-gray-200 { background-color: #E5E7EB; } 

/* Colores NUEVOS y más suaves para Ubicación y Descripción */
.bg-sky-100 { background-color: #E0F2FE; } /* Un azul más claro que el índigo */
.bg-rose-100 { background-color: #FFE4E6; } /* Un rosa suave */


/* Colores de TEXTO para CÍRCULO de ÍCONO (copiados de AlertList.vue) */
.text-red-700 { color: #B91C1C; }
.text-yellow-700 { color: #B45309; }
.text-green-700 { color: #15803D; }
.text-gray-700 { color: #374151; }


/* Colores de TEXTO para BADGE (copiados de AlertList.vue) */
.text-red-800 { color: #991B1B; }
.text-yellow-800 { color: #92400E; }
.text-green-800 { color: #14532D; }
.text-blue-700 { color: #1D4ED8; } 
.text-gray-600 { color: #4B5563; } 

/* Colores NUEVOS y más suaves para Ubicación y Descripción */
.text-sky-700 { color: #0369A1; } /* Texto oscuro para el azul cielo */
.text-rose-700 { color: #BE185D; } /* Texto oscuro para el rosa */


/* Estilos para los badges genéricos definidos en el template */
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
  @apply bg-sky-100 text-sky-700; /* Actualizado */
}
.badge-description {
  @apply bg-rose-100 text-rose-700; /* Actualizado */
}

</style>
