<template>
  <div>
    <PageHeader
      title="Nuevo Perfil de Vibración"
      subtitle="Define un nuevo perfil de vibración y sus umbrales."
    >
      <template #actions>
        <NuxtLink to="/vibration-profiles" class="btn btn-secondary">Volver</NuxtLink>
      </template>
    </PageHeader>

    <!-- Indicador de carga inicial para toda la data del formulario -->
    <div v-if="loadingInitialData" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-500">Cargando datos necesarios para el formulario...</p>
    </div>

    <!-- Mensaje de error general si hay un problema al cargar los datos iniciales -->
    <div v-else-if="vibrationProfileStore.getVibrationProfilesError || organizationStore.error" class="text-center py-8 text-error-600">
      <p>Error al cargar datos: {{ vibrationProfileStore.getVibrationProfilesError || organizationStore.error }}</p>
      <p class="text-sm text-gray-500 mt-2">Por favor, intente de nuevo más tarde.</p>
    </div>

    <!-- Formulario se muestra solo si no hay carga inicial y no hay errores -->
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
              :disabled="loading || vibrationProfileStore.isLoadingVibrationProfiles || vibrationProfileStore.getAvailableAssets.length === 0"
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
            <!-- Mensajes de carga/no hay activos para este selector -->
            <p v-if="vibrationProfileStore.isLoadingVibrationProfiles" class="text-sm text-gray-500 mt-1">Cargando activos...</p>
            <p v-else-if="vibrationProfileStore.getAvailableAssets.length === 0" class="text-sm text-gray-500 mt-1">No hay activos disponibles para la organización seleccionada. Crea uno primero o cambia la organización.</p>
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
              :disabled="loading || vibrationProfileStore.isLoadingVibrationProfiles || vibrationProfileStore.getVibrationRanges.length === 0"
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
            <!-- Mensajes de carga/no hay rangos para este selector -->
            <p v-if="vibrationProfileStore.isLoadingVibrationProfiles" class="text-sm text-gray-500 mt-1">Cargando rangos...</p>
            <p v-else-if="vibrationProfileStore.getVibrationRanges.length === 0" class="text-sm text-gray-500 mt-1">No hay rangos de vibración disponibles. Crea uno primero.</p>
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
            {{ loading ? 'Guardando...' : 'Crear Perfil de Vibración' }}
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useVibrationProfileStore } from '~/stores/vibrationProfiles';
import { useOrganizationStore } from '~/stores/organizations';
import PageHeader from '~/components/PageHeader.vue';
import PermissionGuard from '~/components/PermissionGuard.vue';

definePageMeta({
  permission: 'vibration_profiles.create',
});

const router = useRouter();
const vibrationProfileStore = useVibrationProfileStore();
const organizationStore = useOrganizationStore();

const loading = ref(false); // Para el estado de envío del formulario
const loadingInitialData = ref(true); // Para la carga inicial de datos (activos y rangos)
const formSubmitted = ref(false); // Para mostrar errores de validación al enviar

const profileForm = ref({
  asset_id: null,
  measurement_point: '',
  direction: null,
  vibration_range_id: null, // Opcional
  thresholds: {
    min_value: null,
    max_value: null,
    normal_min: null,
    normal_max: null,
    alarm_level: null,
    critical_level: null,
  },
});

const handleSubmit = async () => {
  formSubmitted.value = true; // Marca el formulario como enviado para activar validaciones
  
  // Validación básica del formulario
  if (!profileForm.value.asset_id || !profileForm.value.measurement_point || !profileForm.value.direction) {
    // Si falta algún campo requerido, no envíes el formulario y muestra un error
    console.error('Formulario inválido: Faltan campos requeridos.');
    return;
  }

  loading.value = true;
  vibrationProfileStore.error = null; // Limpiar errores previos

  try {
    const newProfileData = {
      asset_id: profileForm.value.asset_id,
      measurement_point: profileForm.value.measurement_point,
      direction: profileForm.value.direction,
      vibration_range_id: profileForm.value.vibration_range_id,
      // Solo incluye los umbrales si tienen valores definidos
      thresholds: Object.fromEntries(
        Object.entries(profileForm.value.thresholds).filter(([_, v]) => v !== null && v !== '')
      ),
    };

    console.log('[NewVibrationProfile] Creando perfil con datos:', newProfileData);
    await vibrationProfileStore.createVibrationProfile(newProfileData);
    router.push('/vibration-profiles'); // Redirige a la lista después de crear
  } catch (e) {
    console.error('[NewVibrationProfile] Error al crear perfil:', e);
    // El error ya se establece en el store, aquí solo lo logueamos o lo mostramos con un toast
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  loadingInitialData.value = true; 
  vibrationProfileStore.error = null; // Limpiar errores del store al inicio

  try {
    // Primero cargar las organizaciones para asegurar que selectedOrganizationId esté disponible
    await organizationStore.fetchOrganizations();
    // Luego inicializar los datos del formulario (activos y rangos), que dependerán de la organización seleccionada
    await vibrationProfileStore.initializeDataForForms();
    
    // Opcional: si queremos preseleccionar el asset_id si la organización ya está seleccionada
    // y hay activos disponibles para esa organización
    if (organizationStore.selectedOrganizationId && vibrationProfileStore.getAvailableAssets.length > 0) {
      profileForm.value.asset_id = vibrationProfileStore.getAvailableAssets[0].id;
    }
  } catch (error) {
    console.error('[NewVibrationProfile] Error en la carga inicial de datos:', error);
    // Los errores ya se propagan al store, se mostrarán en el template
  } finally {
    loadingInitialData.value = false;
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
