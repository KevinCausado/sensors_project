<template>
  <div>
    <PageHeader
      title="Detalles del Perfil de Vibración"
      :subtitle="vibrationProfileStore.currentVibrationProfile?.measurement_point || 'Cargando...'"
    >
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/vibration-profiles" class="btn btn-secondary">Volver</NuxtLink>
          <PermissionGuard moduleId="vibration_profiles" permission="manage">
            
          </PermissionGuard>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-500">Cargando detalles del perfil...</p>
    </div>

    <div v-else-if="vibrationProfileStore.getVibrationProfilesError" class="text-center py-8 text-error-600">
      <p>Error al cargar el perfil: {{ vibrationProfileStore.getVibrationProfilesError }}</p>
    </div>

    <div v-else-if="!vibrationProfileStore.currentVibrationProfile" class="text-center py-8 text-gray-500">
      Perfil de vibración no encontrado. Verifique el ID o si existen datos.
    </div>

    <div v-else class="space-y-6">
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Información General</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p class="detail-label">Activo Asociado:</p>
            <p class="detail-value">{{ vibrationProfileStore.currentVibrationProfile.asset_name }}</p>
          </div>
          <div>
            <p class="detail-label">Punto de Medición:</p>
            <p class="detail-value">{{ vibrationProfileStore.currentVibrationProfile.measurement_point }}</p>
          </div>
          <div>
            <p class="detail-label">Dirección:</p>
            <p class="detail-value">{{ vibrationProfileStore.currentVibrationProfile.direction }}</p>
          </div>
          <div>
            <p class="detail-label">Rango de Vibración:</p>
            <p class="detail-value">
              {{ vibrationProfileStore.currentVibrationProfile.vibration_range_name || 'N/A' }}
              <span v-if="vibrationProfileStore.currentVibrationProfile.vibration_range_unit">
                ({{ vibrationProfileStore.currentVibrationProfile.vibration_range_unit }})
              </span>
            </p>
          </div>
          <div>
            <p class="detail-label">Creado En:</p>
            <p class="detail-value">{{ formatDate(vibrationProfileStore.currentVibrationProfile.created_at) }}</p>
          </div>
          <div>
            <p class="detail-label">Última Actualización:</p>
            <p class="detail-value">{{ formatDate(vibrationProfileStore.currentVibrationProfile.updated_at) }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Umbrales Definidos</h2>
        <div v-if="hasThresholds(vibrationProfileStore.currentVibrationProfile.thresholds)" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-if="vibrationProfileStore.currentVibrationProfile.thresholds.min_value !== null">
            <p class="detail-label">Umbral Mínimo:</p>
            <p class="detail-value">{{ vibrationProfileStore.currentVibrationProfile.thresholds.min_value }}</p>
          </div>
          <div v-if="vibrationProfileStore.currentVibrationProfile.thresholds.max_value !== null">
            <p class="detail-label">Umbral Máximo:</p>
            <p class="detail-value">{{ vibrationProfileStore.currentVibrationProfile.thresholds.max_value }}</p>
          </div>
          <div v-if="vibrationProfileStore.currentVibrationProfile.thresholds.normal_min !== null">
            <p class="detail-label">Umbral Normal Mínimo:</p>
            <p class="detail-value">{{ vibrationProfileStore.currentVibrationProfile.thresholds.normal_min }}</p>
          </div>
          <div v-if="vibrationProfileStore.currentVibrationProfile.thresholds.normal_max !== null">
            <p class="detail-label">Umbral Normal Máximo:</p>
            <p class="detail-value">{{ vibrationProfileStore.currentVibrationProfile.thresholds.normal_max }}</p>
          </div>
          <div v-if="vibrationProfileStore.currentVibrationProfile.thresholds.alarm_level !== null">
            <p class="detail-label">Nivel de Alerta:</p>
            <p class="detail-value">{{ vibrationProfileStore.currentVibrationProfile.thresholds.alarm_level }}</p>
          </div>
          <div v-if="vibrationProfileStore.currentVibrationProfile.thresholds.critical_level !== null">
            <p class="detail-label">Nivel Crítico:</p>
            <p class="detail-value">{{ vibrationProfileStore.currentVibrationProfile.thresholds.critical_level }}</p>
          </div>
        </div>
        <div v-else class="text-gray-500">
          <p>No se han definido umbrales para este perfil.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useVibrationProfileStore } from '~/stores/vibrationProfiles';
import PageHeader from '~/components/PageHeader.vue';
import PermissionGuard from '~/components/PermissionGuard.vue';

definePageMeta({
  permission: 'vibration_profiles.view',
});

const route = useRoute();
const vibrationProfileStore = useVibrationProfileStore();

const loading = ref(true);

const hasThresholds = (thresholds) => {
  if (!thresholds) return false;
  return Object.values(thresholds).some(value => value !== null);
};

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

const fetchProfileDetails = async (id) => {
  loading.value = true;
  await vibrationProfileStore.fetchVibrationProfile(id);
  loading.value = false;
};

// Carga inicial al montar el componente
onMounted(async () => {
  const profileId = route.params.id;
  if (profileId) {
    await fetchProfileDetails(profileId);
  }
});

// Watcher para reaccionar a cambios en el ID de la ruta (si se navega entre perfiles)
watch(() => route.params.id, async (newId) => {
  if (newId) {
    console.log(`[VibrationProfileDetails] ID de ruta cambió a: ${newId}. Recargando perfil.`);
    await fetchProfileDetails(newId);
  } else {
    vibrationProfileStore.currentVibrationProfile = null;
    loading.value = false;
  }
});
</script>

<style scoped>
.card {
  @apply bg-white shadow rounded-lg p-6;
}
.detail-label {
  @apply block text-sm font-medium text-gray-500;
}
.detail-value {
  @apply mt-0.5 text-sm text-gray-900 font-semibold;
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
</style>
