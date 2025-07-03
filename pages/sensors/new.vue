<template>
  <div>
    <PageHeader title="Nuevo Sensor" subtitle="Crear un nuevo sensor en el sistema">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/sensors" class="btn btn-secondary">Volver</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div class="max-w-3xl mx-auto">
      <div class="card">
        <form @submit.prevent="saveSensor" class="space-y-6">
          <!-- Campos Generales del Sensor -->
          <div>
            <label class="form-label">Nombre</label>
            <input v-model="form.name" type="text" required class="form-input" />
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Tipo</label>
              <select v-model="form.type" required class="form-input">
                <option value="temperature">Temperatura</option>
                <option value="humidity">Humedad</option>
                <option value="vibration">Vibración</option>
                <option value="pressure">Presión</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div>
              <label class="form-label">Unidad de Medida</label>
              <select v-model="form.unit" class="form-input" :disabled="!!vibrationProfile">
                <option value="">Seleccione una unidad</option>
                <option v-for="unitOption in availableUnits" :key="unitOption.unit" :value="unitOption.unit">
                  {{ unitOption.name }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">Activo Relacionado</label>
            <select v-model="form.asset_id" class="form-input" :disabled="assetStore.isLoading">
              <option :value="null">Sin activo relacionado</option>
              <option v-for="assetOption in assets" :key="assetOption.id" :value="assetOption.id">
                {{ assetOption.name }} ({{ assetOption.asset_code || 'N/A' }})
              </option>
            </select>
            <!-- <p v-if="form.type !== 'vibration'" class="text-xs text-gray-500 mt-1">
                La asignación de perfiles solo está disponible para sensores de tipo Vibración.
            </p> -->
          </div>

           <div>
            <label class="form-label">Número de Serie</label>
            <input v-model="form.serial_number" type="text" class="form-input" />
          </div>

          <div>
            <label class="form-label">Modelo</label>
            <input v-model="form.model" type="text" class="form-input" />
          </div>
         
           <div>
            <label class="form-label">Descripción de Ubicación</label>
            <textarea v-model="form.location_description" class="form-input"></textarea>
          </div>

          <div>
            <label class="form-label">Organización</label>
            <select v-model="form.organizationId" required class="form-input" :disabled="organizationStore.isLoading">
              <option value="">Seleccione una organización</option>
              <option v-for="org in organizations" :key="org.id" :value="org.id">
                {{ org.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="form-label">Estado</label>
            <select v-model="form.status" required class="form-input">
              <option value="active">Activo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="inactive">Inactivo</option>
              <option value="error">Error</option>
            </select>
          </div>

          <!-- SECCIÓN DE UMBRALES CON LÓGICA CONDICIONAL -->
          <div class="space-y-2">
            <h3 class="text-md font-medium text-gray-900">Rangos de Umbral</h3>
            
            <!-- CASO 1: VIBRACIÓN CON PERFIL -> Muestra la tabla "quemada" -->
            <div v-if="form.type === 'vibration' && vibrationProfile">
                <VibrationProfileDisplay :profile="vibrationProfile" />
            </div>

          
           

            <!-- CASO 3: OTROS TIPOS DE SENSORES -> Muestra inputs normales -->
            <div v-else-if="form.type !== 'vibration'" class="card p-4 bg-gray-50 border border-gray-200">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="form-label">Crítico Mínimo</label>
                    <input v-model.number="form.thresholds.criticalMin" type="number" step="any" class="form-input" />
                  </div>
                  <div>
                    <label class="form-label">Crítico Máximo</label>
                    <input v-model.number="form.thresholds.criticalMax" type="number" step="any" class="form-input" />
                  </div>
                  <div>
                    <label class="form-label">Normal Mínimo</label>
                    <input v-model.number="form.thresholds.normalMin" type="number" step="any" class="form-input" />
                  </div>
                  <div>
                    <label class="form-label">Normal Máximo</label>
                    <input v-model.number="form.thresholds.normalMax" type="number" step="any" class="form-input" />
                  </div>
              </div>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="flex justify-end gap-2 pt-4">
            <NuxtLink to="/sensors" class="btn btn-secondary">Cancelar</NuxtLink>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? "Creando..." : "Crear Sensor" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useSensorStore } from "~/stores/sensors";
import { useOrganizationStore } from "~/stores/organizations";
import { useAssetStore } from "~/stores/assets"; 
import { useParameterStore } from "~/stores/parameters"; 
import PageHeader from "@/components/PageHeader.vue";
import VibrationProfileDisplay from "@/components/VibrationProfileDisplay.vue";

const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore(); 
const parameterStore = useParameterStore(); 
const router = useRouter();

const saving = ref(false);
const vibrationProfile = ref(null);

const form = ref({
  name: "",
  type: "temperature", 
  unit: "", 
  serial_number: "",
  model: "",
  location_description: "",
  organizationId: "", 
  asset_id: null, 
  status: "active", 
  thresholds: { 
    criticalMin: null, 
    criticalMax: null,
    normalMin: null,
    normalMax: null,
    alarm_level: null,
    critical_level: null,
  },
});

const organizations = computed(() => organizationStore.organizations);
const assets = computed(() => assetStore.assets); 
const availableUnits = computed(() => parameterStore.getUnitParameters);

const saveSensor = async () => {
  saving.value = true;
  try {
    const payload = { ...form.value };
    for (const key in payload.thresholds) {
      if (payload.thresholds[key] === '' || payload.thresholds[key] === null) {
        payload.thresholds[key] = null;
      }
    }
    await sensorStore.createSensor(payload);
    router.push("/sensors");
  } catch (error) {
    console.error("Error al guardar sensor:", error);
  } finally {
    saving.value = false;
  }
};

const resetThresholds = () => ({ 
    criticalMin: null, 
    criticalMax: null,
    normalMin: null, 
    normalMax: null,
    alarm_level: null, 
    critical_level: null,
});

watch([() => form.value.type, () => form.value.asset_id], async ([newType, newAssetId]) => {
  if (newType !== 'vibration') {
    vibrationProfile.value = null;
    form.value.thresholds = resetThresholds();
    return;
  }
  
  if (newAssetId) {
    const { profile, thresholds } = await sensorStore.getVibrationProfileForAsset(newAssetId);
    if (profile) {
      vibrationProfile.value = profile;
      form.value.thresholds = thresholds;
      form.value.unit = profile.unit || 'mm/s';
    } else {
      vibrationProfile.value = null;
      form.value.thresholds = resetThresholds();
    }
  } else {
    vibrationProfile.value = null;
    form.value.thresholds = resetThresholds();
  }
}, { deep: true });

onMounted(async () => {
  await Promise.all([
    organizationStore.fetchOrganizations(),
    assetStore.fetchAssets(), 
    parameterStore.fetchParameters(),
  ]);
  if (organizationStore.organizations.length > 0 && !form.value.organizationId) {
    form.value.organizationId = organizationStore.organizations[0].id;
  }
});
</script>

<style scoped>
.form-label { @apply block text-sm font-medium text-gray-700 mb-1; }
.form-input, .form-select { @apply mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm; }
.btn { @apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors duration-150; }
.btn-primary { @apply bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300; }
.btn-secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300; }
.card { @apply bg-white shadow rounded-lg p-6; }
</style>