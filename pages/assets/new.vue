<template>
  <div>
    <PageHeader title="Crear Nuevo Activo" subtitle="Registra un nuevo activo industrial en el sistema.">
      <template #actions><NuxtLink to="/assets" class="btn btn-secondary">Volver</NuxtLink></template>
    </PageHeader>

    <div class="max-w-3xl mx-auto">
      <div v-if="loadingInitialData" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p class="ml-3 text-gray-600">Cargando datos...</p>
      </div>
      <div v-else class="card">
        <form @submit.prevent="createAsset" class="space-y-6">
          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Información General</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Nombre del Activo</label>
              <input v-model="form.name" type="text" required class="form-input" />
            </div>
            <div>
              <label class="form-label">Código del Activo</label>
              <input v-model="form.asset_code" type="text" required class="form-input" />
            </div>
            <div>
              <label class="form-label">Número de Serie</label>
              <input v-model="form.serial_number" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Modelo</label>
              <input v-model="form.model_number" type="text" class="form-input" />
            </div>
          </div>

          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-8">Ubicación Geográfica</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label class="form-label">País</label>
              <input v-model="form.country" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Estado</label>
              <input v-model="form.state" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Ciudad</label>
              <input v-model="form.city" type="text" class="form-input" />
            </div>
          </div>

          <div class="sm:col-span-2">
            <label class="form-label">Descripción</label>
            <textarea v-model="form.description" rows="3" class="form-input"></textarea>
          </div>

          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-8">Perfil de Vibración</h2>
          <div class="p-4 bg-gray-50 rounded-lg">
            <label for="profile-type" class="form-label">Modo de Clasificación</label>
            <select id="profile-type" v-model="form.custom_vibration_profile_id" class="form-input">
              <option :value="null">Estándar ISO 10816 (Automático)</option>
              <option v-for="profile in customProfileStore.profiles" :key="profile.id" :value="profile.id">Personalizado: {{ profile.name }} (Rigidez {{ profile.rigidity_name }})</option>
            </select>
          </div>

          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-8">Configuración Técnica</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Organización</label>
              <select v-model="form.organization_id" required class="form-input">
                <option :value="null" disabled>Selecciona</option>
                <option v-for="org in organizationStore.organizations" :key="org.id" :value="org.id">{{ org.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Potencia (kW)</label>
              <input v-model.number="form.power_kw" type="number" step="0.01" class="form-input" required placeholder="Ej: 75.5" />
              <p class="form-hint" v-if="powerSuggestion">{{ powerSuggestion }}</p>
            </div>
            <div>
              <label class="form-label">Altura de Eje (mm)</label>
              <input v-model.number="form.shaft_height_mm" type="number" class="form-input" required placeholder="Ej: 150" />
              <p class="form-hint" v-if="heightSuggestion">{{ heightSuggestion }}</p>
            </div>
            <div>
              <label class="form-label">Tipo de Activo</label>
              <select v-model="form.asset_type_id" class="form-input" required :disabled="isAssetTypeLocked">
                <option :value="null" disabled>{{ isAssetTypeLocked ? "Motor (Automático)" : "Selecciona" }}</option>
                <option v-for="type in availableAssetTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Tipo de Cimentación</label>
              <select v-model="form.foundation_type_id" class="form-input" required :disabled="availableFoundationTypes.length === 0">
                <option :value="null" disabled>Selecciona</option>
                <option v-for="type in availableFoundationTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
              </select>
              <p v-if="foundationSuggestion" class="form-hint">{{ foundationSuggestion }}</p>
            </div>
            <div>
              <label class="form-label">Tipo de Acoplamiento</label>
              <select v-model="form.coupling_type_id" class="form-input" required :disabled="availableCouplingTypes.length === 0">
                <option :value="null" disabled>Selecciona</option>
                <option v-for="type in availableCouplingTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
              </select>
              <p v-if="couplingSuggestion" class="form-hint">{{ couplingSuggestion }}</p>
            </div>
            <div v-if="isIsoModeActive" class="sm:col-span-2">
              <label class="form-label">Grupo ISO</label>
              <div class="mt-1">
                <p class="form-input bg-gray-100 h-10 flex items-center px-3">{{ suggestedIsoGroupName }}</p>
                <p class="text-xs text-gray-500 mt-1 h-4">{{ classificationHint }}</p>
              </div>
            </div>
          </div>

          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-8">Parámetros Operativos</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Velocidad (RPM)</label>
              <input v-model.number="form.speed_rpm" type="number" step="1" class="form-input" />
            </div>
            <!-- <div>
              <label class="form-label">Velocidad Crítica (RPM)</label>
              <input v-model.number="form.critical_speed_rpm" type="number" step="1" class="form-input" />
            </div> -->
            <div>
              <label class="form-label">Temperatura Operativa (°C)</label>
              <input v-model.number="form.operating_temp_c" type="number" step="0.1" class="form-input" />
            </div>
            <!-- <div>
              <label class="form-label">Dirección IP</label>
              <input v-model="form.ip_address" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Versión de Firmware</label>
              <input v-model="form.firmware_version" type="text" class="form-input" />
            </div> -->
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="form.is_active" id="is_active" class="form-checkbox" />
              <label for="is_active" class="form-label mb-0">Activo</label>
            </div>
          </div>

          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-8">Fechas</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Fecha de Fabricación</label>
              <input v-model="form.manufacture_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">Fecha de Instalación</label>
              <input v-model="form.installation_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">Última Fecha de Mantenimiento</label>
              <input v-model="form.last_maintenance_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">Próxima Fecha de Mantenimiento</label>
              <input v-model="form.next_maintenance_date" type="date" class="form-input" />
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <NuxtLink to="/assets" class="btn btn-secondary">Cancelar</NuxtLink>
            <button type="submit" class="btn btn-primary flex items-center" :disabled="saving">
              <span v-if="saving" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              {{ saving ? "Guardando..." : "Crear Activo" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAssetStore } from "~/stores/assets";
import { useOrganizationStore } from "~/stores/organizations";
import { useAuthStore } from "~/stores/auth";
import { useAssetIsoLogic } from "~/composables/useAssetIsoLogic";
import { useCustomVibrationProfileStore } from "~/stores/customVibrationProfiles";
import PageHeader from "~/components/PageHeader.vue";

const assetStore = useAssetStore(),
  organizationStore = useOrganizationStore(),
  authStore = useAuthStore(),
  customProfileStore = useCustomVibrationProfileStore(),
  router = useRouter();
const loadingInitialData = ref(true),
  saving = ref(false);

const form = ref({
  organization_id: null,
  name: "",
  asset_code: "",
  serial_number: "",
  model_number: "",
  country: "",
  state: "",
  city: "",
  description: "",
  asset_type_id: null,
  iso_group_id: null,
  custom_vibration_profile_id: null,
  shaft_height_mm: null,
  rigidity_type_id: null,
  foundation_type_id: null,
  coupling_type_id: null,
  manufacture_date: null,
  installation_date: null,
  last_maintenance_date: null,
  next_maintenance_date: null,
  power_kw: null,
  speed_rpm: null,
  critical_speed_rpm: null,
  operating_temp_c: null,
  ip_address: "",
  firmware_version: "",
  is_active: true,
});

const { suggestedIsoGroupName, classificationHint, availableAssetTypes, availableFoundationTypes, availableCouplingTypes, isAssetTypeLocked, foundationSuggestion, couplingSuggestion, powerSuggestion, heightSuggestion, isIsoModeActive } = useAssetIsoLogic(
  form,
  assetStore
);

const createAsset = async () => {
  saving.value = true;
  try {
    const payload = { ...form.value };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") payload[key] = null;
    });
    await assetStore.createAsset(payload);
    router.push("/assets");
  } catch (e) {
    console.error("Error creating asset:", e);
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  loadingInitialData.value = true;
  try {
    await Promise.all([assetStore.initializeDataForForms(), organizationStore.fetchOrganizations(), customProfileStore.fetchProfiles()]);
    form.value.organization_id = authStore.userProfile?.organization_id || organizationStore.organizations[0]?.id;
  } catch (e) {
    console.error("Error al cargar datos:", e);
  } finally {
    loadingInitialData.value = false;
  }
});
</script>

<style scoped>
.form-label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}
.form-input,
.form-select {
  @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
}
.form-checkbox {
  @apply h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500;
}
.card {
  @apply bg-white shadow-md rounded-lg p-6;
}
.btn {
  @apply inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm;
}
.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700;
}
.btn-secondary {
  @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
}
.form-hint {
  @apply mt-2 text-xs text-blue-600 italic;
}
</style>
