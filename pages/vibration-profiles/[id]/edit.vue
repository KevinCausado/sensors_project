<template>
  <div>
    <PageHeader
      title="Editar Perfil de Vibración"
      :subtitle="profileForm.measurement_point || 'Cargando...'"
    >
      <template #actions>
        <NuxtLink to="/vibration-profiles" class="btn btn-secondary">Volver</NuxtLink>
      </template>
    </PageHeader>

    <div v-if="loadingInitialData" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-500">Cargando datos del perfil...</p>
    </div>

    <div v-else-if="vibrationProfileStore.getVibrationProfilesError && !vibrationProfileStore.currentVibrationProfile" class="text-center py-8 text-error-600">
      <p>Error al cargar el perfil: {{ vibrationProfileStore.getVibrationProfilesError }}</p>
    </div>

    <div v-else-if="!profileId || !vibrationProfileStore.currentVibrationProfile" class="text-center py-8 text-gray-500">
      Perfil de vibración no encontrado para editar.
    </div>

    <div v-else class="card">
      <form @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <!-- Campo: Activo Asociado -->
          <div>
            <label for="asset" class="form-label">Activo Asociado <span class="text-error-500">*</span></label>
            <select
              id="asset"
              v-model="profileForm.asset_id"
              class="form-select"
              required
              :disabled="loading || vibrationProfileStore.isLoadingVibrationProfiles"
            >
              <option :value="null" disabled>Selecciona un activo</option>
              <option
                v-for="asset in vibrationProfileStore.getAvailableAssets"
                :key="asset.id"
                :value="asset.id"
              >
                {{ asset.name }}
              </option>
            </select>
            <p v-if="!profileForm.asset_id && formSubmitted" class="text-error-500 text-xs mt-1">El activo es obligatorio.</p>
            <p v-if="vibrationProfileStore.isLoadingVibrationProfiles && vibrationProfileStore.getAvailableAssets.length === 0" class="text-sm text-gray-500 mt-1">Cargando activos...</p>
            <p v-else-if="!vibrationProfileStore.isLoadingVibrationProfiles && vibrationProfileStore.getAvailableAssets.length === 0" class="text-sm text-gray-500 mt-1">No hay activos disponibles para tu organización. Crea uno primero.</p>
          </div>

          <!-- Campo: Punto de Medición -->
          <div>
            <label for="measurement-point" class="form-label">Punto de Medición <span class="text-error-500">*</span></label>
            <input
              id="measurement-point"
              v-model="profileForm.measurement_point"
              type="text"
              class="form-input"
              placeholder="Ej: Motor lado bomba, Rodamiento delantero"
              required
              :disabled="loading"
            />
            <p v-if="!profileForm.measurement_point && formSubmitted" class="text-error-500 text-xs mt-1">El punto de medición es obligatorio.</p>
          </div>

          <!-- Campo: Dirección -->
          <div>
            <label for="direction" class="form-label">Dirección <span class="text-error-500">*</span></label>
            <select
              id="direction"
              v-model="profileForm.direction"
              class="form-select"
              required
              :disabled="loading"
            >
              <option :value="null" disabled>Selecciona una dirección</option>
              <option value="axial">Axial</option>
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
            <p v-if="!profileForm.direction && formSubmitted" class="text-error-500 text-xs mt-1">La dirección es obligatoria.</p>
          </div>

          <!-- Campo: Rango de Vibración -->
          <div>
            <label for="vibration-range" class="form-label">Rango de Vibración</label>
            <select
              id="vibration-range"
              v-model="profileForm.vibration_range_id"
              class="form-select"
              :disabled="loading || vibrationProfileStore.isLoadingVibrationProfiles"
            >
              <option :value="null">Selecciona un rango (Opcional)</option>
              <option
                v-for="range in vibrationProfileStore.getVibrationRanges"
                :key="range.id"
                :value="range.id"
              >
                {{ range.name }} ({{ range.min_value }} - {{ range.max_value }} {{ range.unit }})
              </option>
            </select>
            <p v-if="vibrationProfileStore.isLoadingVibrationProfiles && vibrationProfileStore.getVibrationRanges.length === 0" class="text-sm text-gray-500 mt-1">Cargando rangos...</p>
            <p v-else-if="!vibrationProfileStore.isLoadingVibrationProfiles && vibrationProfileStore.getVibrationRanges.length === 0" class="text-sm text-gray-500 mt-1">No hay rangos de vibración disponibles. Crea uno primero.</p>
          </div>
        </div>

        <div class="mt-8">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Umbrales (Opcional)</h3>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <!-- Umbral Mínimo (Opcional) -->
            <div>
              <label for="threshold-min" class="form-label">Umbral Mínimo</label>
              <input
                id="threshold-min"
                v-model.number="profileForm.thresholds.min_value"
                type="number"
                step="0.01"
                class="form-input"
                placeholder="Ej: 0.5"
                :disabled="loading"
              />
            </div>
            <!-- Umbral Máximo (Opcional) -->
            <div>
              <label for="threshold-max" class="form-label">Umbral Máximo</label>
              <input
                id="threshold-max"
                v-model.number="profileForm.thresholds.max_value"
                type="number"
                step="0.01"
                class="form-input"
                placeholder="Ej: 10.0"
                :disabled="loading"
              />
            </div>
             <!-- Umbral Normal Mínimo (Opcional) -->
            <div>
              <label for="threshold-normal-min" class="form-label">Umbral Normal Mínimo</label>
              <input
                id="threshold-normal-min"
                v-model.number="profileForm.thresholds.normal_min"
                type="number"
                step="0.01"
                class="form-input"
                placeholder="Ej: 1.0"
                :disabled="loading"
              />
            </div>
            <!-- Umbral Normal Máximo (Opcional) -->
            <div>
              <label for="threshold-normal-max" class="form-label">Umbral Normal Máximo</label>
              <input
                id="threshold-normal-max"
                v-model.number="profileForm.thresholds.normal_max"
                type="number"
                step="0.01"
                class="form-input"
                placeholder="Ej: 5.0"
                :disabled="loading"
              />
            </div>
            <!-- Nivel de Alerta (Opcional) -->
            <div>
              <label for="alarm-level" class="form-label">Nivel de Alerta</label>
              <input
                id="alarm-level"
                v-model.number="profileForm.thresholds.alarm_level"
                type="number"
                step="0.01"
                class="form-input"
                placeholder="Ej: 7.0"
                :disabled="loading"
              />
            </div>
            <!-- Nivel Crítico (Opcional) -->
            <div>
              <label for="critical-level" class="form-label">Nivel Crítico</label>
              <input
                id="critical-level"
                v-model.number="profileForm.thresholds.critical_level"
                type="number"
                step="0.01"
                class="form-input"
                placeholder="Ej: 9.0"
                :disabled="loading"
              />
            </div>
          </div>
        </div>

        <div class="mt-8 flex justify-end">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            {{ loading ? 'Guardando...' : 'Actualizar Perfil de Vibración' }}
          </button>
        </div>

        <p v-if="vibrationProfileStore.getVibrationProfilesError" class="text-error-600 mt-4 text-center">
          Error: {{ vibrationProfileStore.getVibrationProfilesError }}
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useVibrationProfileStore } from '~/stores/vibrationProfiles';
import PageHeader from '~/components/PageHeader.vue';
import PermissionGuard from '~/components/PermissionGuard.vue';

definePageMeta({
  permission: 'vibration_profiles.manage',
});

const route = useRoute();
const router = useRouter();
const vibrationProfileStore = useVibrationProfileStore();

const loading = ref(false); // Para el estado de envío del formulario
const loadingInitialData = ref(true); // Para la carga inicial de datos
const formSubmitted = ref(false);

const profileId = route.params.id;

const profileForm = ref({
  asset_id: null,
  measurement_point: '',
  direction: null,
  vibration_range_id: null,
  thresholds: {
    min_value: null,
    max_value: null,
    normal_min: null,
    normal_max: null,
    alarm_level: null,
    critical_level: null,
  },
});

const loadProfileData = async () => {
  loadingInitialData.value = true;
  vibrationProfileStore.error = null; // Limpiar errores previos
  try {
    // Cargar activos y rangos primero para que los selectores estén listos
    await vibrationProfileStore.initializeDataForForms();
    
    // Luego, cargar el perfil específico
    const profile = await vibrationProfileStore.fetchVibrationProfile(profileId);
    if (profile) {
      profileForm.value = {
        asset_id: profile.asset_id,
        measurement_point: profile.measurement_point,
        direction: profile.direction,
        vibration_range_id: profile.vibration_range_id,
        // Asegúrate de copiar solo los umbrales que realmente existen
        thresholds: {
          min_value: profile.thresholds?.min_value ?? null,
          max_value: profile.thresholds?.max_value ?? null,
          normal_min: profile.thresholds?.normal_min ?? null,
          normal_max: profile.thresholds?.normal_max ?? null,
          alarm_level: profile.thresholds?.alarm_level ?? null,
          critical_level: profile.thresholds?.critical_level ?? null,
        },
      };
      console.log('[EditVibrationProfile] Formulario precargado con:', profileForm.value);
    } else {
      console.warn('[EditVibrationProfile] Perfil no encontrado para el ID:', profileId);
      // Podrías redirigir o mostrar un mensaje de error diferente aquí
    }
  } catch (e) {
    console.error('[EditVibrationProfile] Error al cargar el perfil para edición:', e);
  } finally {
    loadingInitialData.value = false;
  }
};

const handleSubmit = async () => {
  formSubmitted.value = true;
  
  // Validación básica del formulario
  if (!profileForm.value.asset_id || !profileForm.value.measurement_point || !profileForm.value.direction) {
    console.error('Formulario inválido: Faltan campos requeridos.');
    return;
  }

  loading.value = true;
  vibrationProfileStore.error = null;

  try {
    const updatedProfileData = {
      asset_id: profileForm.value.asset_id,
      measurement_point: profileForm.value.measurement_point,
      direction: profileForm.value.direction,
      vibration_range_id: profileForm.value.vibration_range_id,
      // Solo incluye los umbrales si tienen valores definidos
      thresholds: Object.fromEntries(
        Object.entries(profileForm.value.thresholds).filter(([_, v]) => v !== null && v !== '')
      ),
    };

    console.log(`[EditVibrationProfile] Actualizando perfil ${profileId} con datos:`, updatedProfileData);
    await vibrationProfileStore.updateVibrationProfile(profileId, updatedProfileData);
    router.push('/vibration-profiles'); // Redirige a la lista después de actualizar
  } catch (e) {
    console.error('[EditVibrationProfile] Error al actualizar perfil:', e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (profileId) {
    loadProfileData();
  }
});

// Watcher para reaccionar a cambios en el ID de la ruta (si se navega entre perfiles de edición)
watch(() => route.params.id, (newId) => {
  if (newId && newId !== profileId) { // Asegúrate de que el ID ha cambiado
    profileId = newId; // Actualiza el ID local
    loadProfileData();
  }
});
</script>

<style scoped>
/* Estilos de formulario y botones (copiados de otros módulos) */
.card {
  @apply bg-white shadow rounded-lg p-6;
}
.form-label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}
.form-input, .form-select {
  @apply mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
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
