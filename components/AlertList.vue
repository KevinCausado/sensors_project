<template>
  <div class="alert-list">
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
        <div v-for="alert in alerts" :key="alert.id" class="p-3 rounded-md border border-gray-100 transition-all hover:shadow-sm" :class="getAlertBgClass(alert.priority)">
          <div class="flex items-start">
            <div :class="getAlertIconClass(alert.priority)" class="flex-shrink-0 rounded-full p-1">
              <component :is="getAlertIcon(alert.type)" class="h-4 w-4" />
            </div>

            <div class="ml-3 flex-1">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900">{{ alert.title }}</p>
                <span class="text-xs text-gray-500">{{ formatTimeAgo(alert.alert_time) }}</span>
              </div>

              <p class="text-xs text-gray-600 mt-1">{{ alert.description }}</p>

              <div class="mt-2 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" :class="getAlertBadgeClass(alert.priority)">
                    {{ translatePriority(alert.priority) }}
                  </span>
                  <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {{ alert.sensorName || "Sensor Desconocido" }}
                  </span>
                  <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {{ alert.organizationName || "Organización Desconocida" }}
                  </span>
                </div>

                <PermissionGuard moduleId="alerts" permission="resolve">
                  <button v-if="alert.status === 'active'" @click="handleResolveAlert(alert.id)" class="text-xs text-primary-600 hover:text-primary-500 font-semibold transition-colors duration-200">Resolver</button>
                  <span v-else class="text-xs text-success-600 font-semibold">Resuelta</span>
                </PermissionGuard>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { defineComponent, h } from "vue"; // Asegúrate de importar 'h'
import { useAlertStore } from "~/stores/alerts";
import { useNuxtApp } from "#app"; // Necesario para acceder a $supabase

// Iconos - Asegúrate de que las clases 'i-heroicons-...' estén configuradas con tu librería de iconos (ej. UnoCSS, Font Awesome)
const createHeroicon = (iconName) =>
  defineComponent({
    render: () => h("div", { class: `i-heroicons-${iconName} inline-block` }),
  });

const WarningIcon = createHeroicon("exclamation-triangle");
const ErrorIcon = createHeroicon("exclamation-circle");
const InfoIcon = createHeroicon("information-circle");
const StatusChangeIcon = createHeroicon("arrow-path"); // Para alertas de tipo 'status_change'
const DataIssueIcon = createHeroicon("exclamation-triangle"); // Para alertas de tipo 'data_issue'

// Props del componente
const props = defineProps({
  alerts: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const alertStore = useAlertStore();
const { $supabase } = useNuxtApp(); // Obtenemos la instancia de Supabase

// --- Funciones Auxiliares para la UI ---

const getAlertIcon = (type) => {
  switch (type) {
    case "threshold":
      return WarningIcon;
    case "status_change":
      return StatusChangeIcon;
    case "data_issue":
      return DataIssueIcon;
    case "error":
      return ErrorIcon;
    default:
      return InfoIcon;
  }
};

const getAlertIconClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-error-100 text-error-700"; // Rojo para Alta
    case "medium":
      return "bg-warning-100 text-warning-700"; // Naranja/Amarillo para Media
    case "low":
      return "bg-success-100 text-success-700"; // Verde para Baja (como lo tenías)
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getAlertBgClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-error-50"; // Rojo claro
    case "medium":
      return "bg-warning-50"; // Naranja/Amarillo claro
    case "low":
      return "bg-success-50"; // Verde claro
    default:
      return "bg-white";
  }
};

const getAlertBadgeClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-error-100 text-error-800"; // Texto más oscuro en rojo
    case "medium":
      return "bg-warning-100 text-warning-800"; // Texto más oscuro en naranja/amarillo
    case "low":
      return "bg-success-100 text-success-800"; // Texto más oscuro en verde
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const translatePriority = (priority) => {
  switch (priority) {
    case "high":
      return "Alta";
    case "medium":
      return "Media"; // Corregido: faltaba un 'return'
    case "low":
      return "Baja";
    default:
      return "Desconocida"; // Mejor manejar un caso por defecto
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
    { label: "mes", seconds: 2592000 }, // Aprox. 30 días
    { label: "año", seconds: 31536000 }, // Aprox. 365 días
  ];

  for (let i = intervals.length - 1; i >= 0; i--) {
    const interval = intervals[i];
    if (seconds >= interval.seconds) {
      const value = Math.floor(seconds / interval.seconds);
      // Caso especial para "hace un instante"
      if (interval.label === "segundo" && value < 5) return "hace un instante";
      return `hace ${value} ${interval.label}${value > 1 ? (interval.label === "mes" ? "es" : "s") : ""}`;
    }
  }
  return "justo ahora"; // Para eventos muy recientes, menos de un segundo
};

// --- Manejadores de Acciones ---

/**
 * Llama a la acción de la store para resolver una alerta.
 * @param {string} alertId - El ID de la alerta a resolver.
 * @param {string} sensorId - El ID del sensor asociado a la alerta.
 */
const handleResolveAlert = async (alertId) => {
  // Eliminado sensorId ya que no se usa aquí.
  // La lógica para actualizar la alerta y el sensor se manejará en la store
  await alertStore.resolveAlert(alertId);
};
</script>

---

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
</style>
