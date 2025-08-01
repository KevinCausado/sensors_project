<template>
  <div class="alert-list w-full">
    <!-- Estado de Carga -->
    <div v-if="loading" class="flex items-center justify-center py-10">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-4 text-gray-600">Cargando alertas...</p>
    </div>

    <!-- Estado Vacío -->
    <div v-else-if="enrichedAlerts.length === 0" class="text-center py-10 text-gray-500 bg-gray-50/70 rounded-lg">
      <Icon name="i-heroicons-check-circle" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">Todo en orden</h3>
      <p class="mt-1 text-sm text-gray-500">No hay alertas que requieran atención.</p>
    </div>

    <!-- Lista de Alertas con Diseño Mejorado -->
    <div v-else class="space-y-4">
      <TransitionGroup name="fade-list">
        <div v-for="alert in enrichedAlerts" :key="alert.id"
             class="relative p-4 rounded-xl border transition-all duration-300 ease-in-out hover:shadow-lg hover:border-primary-300"
             :class="getAlertBgClass(alert.priority)">

          <!-- Área de Estado/Acción (Esquina superior derecha) -->
          <div class="absolute top-4 right-4 z-10 text-right">
            <PermissionGuard moduleId="alerts" permission="resolve">
              <button v-if="alert.status === 'active'"
                      @click="handleResolveAlert(alert.id)"
                      class="px-2.5 py-1 text-xs font-semibold text-primary-700 bg-primary-100 rounded-md hover:bg-primary-200 hover:text-primary-800 transition-colors">
                Resolver
              </button>
              <span v-else class="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-md">
                <Icon name="i-heroicons-check-circle-solid" class="h-4 w-4 mr-1.5"/>
                Resuelta
              </span>
            </PermissionGuard>
            <p class="text-xs text-gray-500 mt-2">{{ formatTimeAgo(alert.alert_time) }}</p>
          </div>

          <div class="flex items-start">
            <!-- Icono a la Izquierda -->
            <div :class="getAlertIconClass(alert.priority)"
                 class="flex-shrink-0 rounded-full h-10 w-10 flex items-center justify-center mr-4 shadow-sm">
              <component :is="getAlertIcon(alert.type)" class="h-5 w-5" />
            </div>

            <!-- Área de Contenido Principal -->
            <div class="flex-1 min-w-0 pr-24">
              <!-- Título y Descripción (vienen del backend) -->
              <div>
                <p class="text-base font-semibold text-gray-900 truncate">{{ alert.title }}</p>
              </div>
              <p class="text-sm text-gray-700 mt-2 line-clamp-2">{{ alert.description }}</p>

              <!-- Metadata con Badges -->
              <div class="mt-4 pt-3 border-t border-gray-200/90 flex flex-wrap items-center gap-2">
                <span :class="getPriorityBadgeClass(alert.priority)" class="badge">
                  <Icon name="i-heroicons-shield-exclamation" class="h-4 w-4 mr-1.5" />
                  <span>{{ translatePriority(alert.priority) }}</span>
                </span>
                <NuxtLink v-if="alert.assetName && alert.assetName !== 'N/A' && alert.asset_id"
                            :to="`/asset-status/${alert.asset_id}`"
                            class="badge group bg-primary-600 text-white shadow hover:bg-primary-700 hover:scale-105 transform transition-all duration-200">
                    <Icon name="i-heroicons-cube-transparent" class="h-4 w-4 mr-1.5" />
                    <span class="font-medium">Activo:</span>
                    <span class="font-semibold ml-1 truncate">{{ alert.assetName }}</span>
                </NuxtLink>
                <span class="badge bg-gray-200 text-gray-800">
                  <Icon name="i-heroicons-signal" class="h-4 w-4 mr-1.5" />
                  <span class="font-medium">Sensor:</span>
                  <span class="font-semibold ml-1 truncate">{{ alert.sensorName || "Desconocido" }}</span>
                </span>
                <!-- BADGE DE DISPOSITIVO AGREGADO -->
                <span v-if="alert.deviceCode" class="badge bg-gray-200 text-gray-800">
                  <Icon name="i-heroicons-cpu-chip" class="h-4 w-4 mr-1.5" />
                  <span class="font-medium">Dispositivo:</span>
                  <span class="font-semibold ml-1 truncate" :title="`${alert.deviceCode} (${alert.deviceBrand} / ${alert.deviceModel})`">{{ alert.deviceCode }}</span>
                </span>
                <span class="badge bg-gray-200 text-gray-800">
                  <Icon name="i-heroicons-building-office-2" class="h-4 w-4 mr-1.5" />
                  <span class="font-medium">Organización:</span>
                  <span class="font-semibold ml-1 truncate">{{ alert.organizationName || "Desconocida" }}</span>
                </span>
              </div>

              <!-- Display de Perfil de Vibración -->
              <div v-if="alert.type === 'vibration' && alert.asset_id" class="mt-4 pt-3 border-t border-dashed border-gray-300">
                <div v-if="alert.isLoadingProfile" class="text-sm text-gray-500 italic px-2">Cargando perfil...</div>
                <div v-else-if="alert.vibrationProfileName && alert.triggeredRange" class="flex flex-wrap items-center gap-2">
                    <span class="badge bg-gray-200 text-gray-800">
                        <Icon name="i-heroicons-chart-bar" class="h-4 w-4 mr-1.5" />
                        Perfil: <strong class="ml-1">{{ alert.vibrationProfileName }}</strong>
                    </span>
                    <span class="badge" :class="getSeverityClass(alert.triggeredRange.severity)">
                        <Icon name="i-heroicons-exclamation-triangle" class="h-4 w-4 mr-1.5" />
                        {{ alert.triggeredRange.condition_name }} (Zona {{ alert.triggeredRange.severity }})
                    </span>
                    <span class="badge bg-blue-100 text-blue-800 font-mono">
                        Rango: {{ alert.triggeredRange.min_value }} - {{ alert.triggeredRange.max_value }}
                    </span>
                </div>
                <div v-else class="text-sm text-gray-500 italic px-2">Sin información de perfil.</div>
              </div>

            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { useAlertStore } from "~/stores/alerts";
import { useSensorStore } from '~/stores/sensors';
import PermissionGuard from "~/components/PermissionGuard.vue";
import { ExclamationTriangleIcon, ExclamationCircleIcon, InformationCircleIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  alerts: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
});

const alertStore = useAlertStore();
const sensorStore = useSensorStore();
const vibrationProfiles = ref({});
const loadingProfiles = ref({});

// --- Lógica de Enriquecimiento ---

const findTriggeredRange = (value, profile) => {
  if (!profile || !profile.ranges || value === null) return null;
  const sortedRanges = [...profile.ranges].sort((a, b) => a.max_value - b.max_value);
  for (const range of sortedRanges) {
    if (value >= range.min_value && value <= range.max_value) return range;
  }
  if (sortedRanges.length > 0 && value > sortedRanges[sortedRanges.length - 1].max_value) {
      return sortedRanges[sortedRanges.length - 1];
  }
  return null;
};

const enrichedAlerts = computed(() => {
  return props.alerts
    .map(alert => {
      const sensor = sensorStore.sensors.find(s => s.id === alert.sensor_id);
      const newAlertData = {
        ...alert,
        deviceCode: sensor ? sensor.code : null,
        deviceBrand: sensor ? sensor.brandName : 'N/A',
        deviceModel: sensor ? sensor.modelName : 'N/A',
        isLoadingProfile: loadingProfiles.value[alert.asset_id] || false,
        vibrationProfileName: null,
        triggeredRange: null,
      };

      if (alert.type === 'vibration' && alert.asset_id) {
        const profile = vibrationProfiles.value[alert.asset_id];
        if (profile) {
          newAlertData.vibrationProfileName = profile.name;
          newAlertData.triggeredRange = findTriggeredRange(alert.value_at_alert, profile);
        }
      }
      return newAlertData;
    });
});

const fetchVibrationProfile = async (assetId) => {
  if (!assetId || vibrationProfiles.value[assetId] || loadingProfiles.value[assetId]) return;
  loadingProfiles.value[assetId] = true;
  try {
    await sensorStore.getVibrationProfileForAsset(assetId);
    vibrationProfiles.value[assetId] = sensorStore.getVibrationProfileFromCache(assetId);
  } catch (error) {
    console.error(`Error fetching vibration profile for asset ${assetId}:`, error);
  } finally {
    loadingProfiles.value[assetId] = false;
  }
};

watch(() => props.alerts, (newAlerts) => {
  if (!newAlerts) return;
  for (const alert of newAlerts) {
    if (alert.type === 'vibration' && alert.asset_id) {
      fetchVibrationProfile(alert.asset_id);
    }
  }
}, { immediate: true, deep: true });

// --- Funciones para Estilos ---

const getAlertColorClasses = (priority) => {
  const colorMap = {
    high:   { bg: 'bg-red-50/80', border: 'border-red-200/80', iconBg: 'bg-red-100', iconText: 'text-red-600' },
    medium: { bg: 'bg-amber-50/80', border: 'border-amber-200/80', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
    low:    { bg: 'bg-green-50/80', border: 'border-green-200/80', iconBg: 'bg-green-100', iconText: 'text-green-600' }
  };
  return colorMap[priority] || { bg: 'bg-white', border: 'border-gray-200', iconBg: 'bg-gray-100', iconText: 'text-gray-600' };
};

const getAlertBgClass = (priority) => {
    const colors = getAlertColorClasses(priority);
    return [colors.bg, colors.border];
};

const getAlertIconClass = (priority) => {
    const colors = getAlertColorClasses(priority);
    return [colors.iconBg, colors.iconText];
};

const getPriorityBadgeClass = (priority) => {
  const classes = {
    high: 'bg-red-200 text-red-800 font-semibold',
    medium: 'bg-amber-200 text-amber-800 font-semibold',
    low: 'bg-green-200 text-green-800 font-semibold',
  };
  return classes[priority] || 'bg-gray-200 text-gray-800 font-semibold';
};

const getSeverityClass = (severity) => {
    const classes = {
        'A': 'bg-green-100 text-green-800', 'B': 'bg-blue-100 text-blue-800',
        'C': 'bg-yellow-100 text-yellow-800', 'D': 'bg-red-100 text-red-800',
    };
    return classes[severity] || 'bg-gray-100 text-gray-700';
};

const getAlertIcon = (type) => ({
    vibration: ExclamationTriangleIcon,
    temperature: ExclamationTriangleIcon,
    status_change: ArrowPathIcon,
    data_issue: ExclamationCircleIcon,
    connectivity: ExclamationCircleIcon,
    battery: ExclamationCircleIcon,
}[type] || InformationCircleIcon);

const translatePriority = (priority) => ({
    high: "Prioridad: Alta", medium: "Prioridad: Media", low: "Prioridad: Baja",
}[priority] || "Prioridad: Desconocida");

// --- Acciones y Formato de Fecha ---

const handleResolveAlert = (alertId) => alertStore.resolveAlert(alertId);

const formatTimeAgo = (createdAt) => {
  if (!createdAt) return "Fecha desconocida";
  const seconds = Math.floor((new Date() - new Date(createdAt)) / 1000);
  const intervals = [ { l: "año", s: 31536000 }, { l: "mes", s: 2592000 }, { l: "día", s: 86400 }, { l: "hora", s: 3600 }, { l: "minuto", s: 60 }];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.s);
    if (count >= 1) return `hace ${count} ${i.l}${count > 1 ? (i.l === 'mes' ? 'es' : 's') : ''}`;
  }
  return "justo ahora";
};
</script>

<style scoped>
.badge { @apply inline-flex items-center px-2.5 py-1 rounded-md text-xs; }
.fade-list-enter-active, .fade-list-leave-active { transition: all 0.5s ease; }
.fade-list-enter-from, .fade-list-leave-to { opacity: 0; transform: scale(0.95) translateY(10px); }
</style>
