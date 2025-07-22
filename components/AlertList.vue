<template>
  <div class="alert-list w-full">
    <div v-if="loading" class="flex items-center justify-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      <p class="ml-2 text-gray-500">Cargando alertas...</p>
    </div>

    <div v-else-if="alerts.length === 0" class="text-center py-6 text-gray-500">
      <p>No se encontraron alertas.</p>
      <p class="text-sm mt-1">¡Todo en orden aquí!</p>
    </div>

    <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1">
      <TransitionGroup name="fade">
        <div v-for="alert in alerts" :key="alert.id" 
             class="relative flex flex-col p-3 rounded-md border 
                    transition-all hover:shadow-sm" 
             :class="getAlertBgClass(alert.priority)">
          
          <!-- Botón de Acción/Estado (Arriba a la derecha) -->
          <PermissionGuard moduleId="alerts" permission="resolve">
            <div class="absolute top-3 right-3 z-10">
              <button v-if="alert.status === 'active'" 
                      @click="handleResolveAlert(alert.id)" 
                      class="text-xs text-primary-600 hover:text-primary-500 font-semibold transition-colors duration-200">
                Resolver
              </button>
              <span v-else class="text-xs text-success-600 font-semibold flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.535-1.28-1.28a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.135-.082l3.75-5.25Z" clip-rule="evenodd" /></svg>
                Resuelta
              </span>
            </div>
          </PermissionGuard>

          <div class="flex items-start mb-2 pr-16 sm:pr-24"> 
            <div :class="getAlertIconClass(alert.priority)" 
                 class="flex-shrink-0 rounded-full p-2 
                        flex items-center justify-center shadow-sm">
              <component :is="getAlertIcon(alert.type)" class="h-5 w-5" />
            </div>

            <div class="ml-3 flex-1 min-w-0">
              <p class="text-base font-semibold text-gray-900 truncate">{{ alert.title }}</p>
              <!-- DESCRIPCIÓN: Letra más pequeña (text-xs) -->
              <p class="text-xs text-gray-600 mt-1 line-clamp-2">{{ alert.description }}</p>
            </div>
          </div>

          <!-- Detalles adicionales y badges -->
          <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div class="flex flex-wrap gap-1">
              <span class="badge" :class="getAlertBadgeClass(alert.priority)">
                {{ translatePriority(alert.priority) }}
              </span>
              <span class="badge badge-secondary">
                Sensor: {{ alert.sensorName || "Desconocido" }}
              </span>
              <span class="badge badge-secondary">
                Organización: {{ alert.organizationName || "Desconocida" }}
              </span>         
              <NuxtLink 
                v-if="alert.assetName && alert.assetName !== 'N/A' && alert.asset_id" 
                :to="`/asset-status/${alert.asset_id}`"
                class="badge bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white border border-transparent transition-colors duration-200 flex items-center group cursor-pointer">
                Activo: {{ alert.assetName }}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </NuxtLink>
            </div>
            <span class="text-gray-500 flex-shrink-0">Generada {{ formatTimeAgo(alert.alert_time) }}</span>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { defineComponent, h } from "vue"; 
import { useAlertStore } from "~/stores/alerts";
import { useNuxtApp } from "#app"; 
import PermissionGuard from "~/components/PermissionGuard.vue"; 
import { ExclamationTriangleIcon, ExclamationCircleIcon, InformationCircleIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';


// Para los íconos, usaré los de Heroicons directamente si estás usando la librería.
const getAlertIcon = (type) => {
  switch (type) {
    case "threshold":
      return ExclamationTriangleIcon; 
    case "status_change":
      return ArrowPathIcon; 
    case "data_issue":
      return ExclamationTriangleIcon; 
    case "error":
      return ExclamationCircleIcon; 
    default:
      return InformationCircleIcon; 
  }
};

// Props del componente
const props = defineProps({
  alerts: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const alertStore = useAlertStore();
const { $supabase } = useNuxtApp(); 

// --- Funciones Auxiliares para la UI ---

const getAlertIconClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700"; 
    case "medium":
      return "bg-yellow-100 text-yellow-700"; 
    case "low":
      return "bg-green-100 text-green-700"; 
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getAlertBgClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-red-50 border-red-200"; 
    case "medium":
      return "bg-yellow-50 border-yellow-200"; 
    case "low":
      return "bg-green-50 border-green-200"; 
    default:
      return "bg-white border-gray-200";
  }
};

const getAlertBadgeClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-red-200 text-red-800 font-semibold"; 
    case "medium":
      return "bg-yellow-200 text-yellow-800 font-semibold"; 
    case "low":
      return "bg-green-200 text-green-800 font-semibold"; 
    default:
      return "bg-gray-200 text-gray-800 font-semibold";
  }
};

const translatePriority = (priority) => {
  switch (priority) {
    case "high":
      return "Prioridad: Alta";
    case "medium":
      return "Prioridad: Media"; 
    case "low":
      return "Prioridad: Baja";
    default:
      return "Prioridad: Desconocida"; 
  }
};

/**
 * Formats a date to a "time ago" string.
 * @param {string} createdAt - The creation date of the alert (ISO string).
 * @returns {string} The formatted string.
 */
const formatTimeAgo = (createdAt) => {
  if (!createdAt) return "Fecha desconocida";
  const date = new Date(createdAt);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = [
    { label: "segundo", seconds: 1 },
    { label: "minuto", seconds: 60 },
    { label: "hora", seconds: 3600 },
    { label: "día", seconds: 86400 },
    { label: "semana", seconds: 604800 },
    { label: "mes", seconds: 2592000 }, 
    { label: "año", seconds: 31536000 }, 
  ];

  for (let i = intervals.length - 1; i >= 0; i--) {
    const interval = intervals[i];
    if (seconds >= interval.seconds) {
      const value = Math.floor(seconds / interval.seconds);
      if (interval.label === "segundo" && value < 5) return "hace un instante";
      return `hace ${value} ${interval.label}${value > 1 ? (interval.label === "mes" ? "es" : "s") : ""}`;
    }
  }
  return "justo ahora"; 
};

// --- Manejadores de Acciones ---

/**
 * Llama a la acción de la store para resolver una alerta.
 * @param {string} alertId - El ID de la alerta a resolver.
 */
const handleResolveAlert = async (alertId) => {
  await alertStore.resolveAlert(alertId);
};
</script>

<style scoped>
/* Estilos para la transición de entrada/salida de elementos */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Estilos de badges personalizados (si no se cubren completamente con Tailwind) */
.badge {
  @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium;
  white-space: nowrap; /* Evita que los badges se dividan en varias líneas */
}

.badge-secondary {
  @apply bg-gray-100 text-gray-700;
}
</style>
