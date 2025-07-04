<template>
  <div>
    <PageHeader 
      title="Editar Sensor" 
      :subtitle="`Modificando el sensor ${form?.name || ''}`"
    >
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/sensors" class="btn btn-secondary">Volver</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-10">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-500">Cargando datos del sensor...</p>
    </div>

    <div v-else-if="error" class="text-center py-8 text-red-600">
      <p>Error al cargar el sensor: {{ error }}</p>
    </div>

    <div v-else class="max-w-3xl mx-auto">
      <div class="card">
        <form @submit.prevent="saveSensor" class="space-y-6">
          <!-- Campos Generales del Sensor -->
          <div>
            <label class="form-label">Nombre</label>
            <input v-model="form.name" type="text" required class="form-input" />
          </div>

          <div>
            <label class="form-label">Código</label>
            <input v-model="form.code" type="text" class="form-input" />
          </div>

          <!-- Selección de Jerarquía -->
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label class="form-label">Marca</label>
              <select v-model="selectedBrand" class="form-input" :disabled="sensorStore.hierarchyIsLoading">
                <option :value="null" disabled>
                  {{ sensorStore.hierarchyIsLoading ? 'Cargando...' : 'Seleccione una marca' }}
                </option>
                <option v-for="brand in brands" :key="brand.id" :value="brand.id">
                  {{ brand.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Modelo</label>
              <select v-model="selectedModel" class="form-input" :disabled="!selectedBrand || filteredModels.length === 0">
                <option :value="null" disabled>Seleccione un modelo</option>
                <option v-for="model in filteredModels" :key="model.id" :value="model.id">
                  {{ model.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Firmware</label>
              <select v-model="form.firmware_id" class="form-input" :disabled="!selectedModel || filteredFirmwares.length === 0">
                <option :value="null" disabled>Seleccione un firmware</option>
                <option v-for="fw in filteredFirmwares" :key="fw.id" :value="fw.id">
                  {{ fw.version }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Tipo</label>
              <select v-model="form.type" required class="form-input">
                <option value="temperature">Temperatura</option>
                <option value="vibration">Vibración</option>
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
            <select v-model="form.asset_id" class="form-input" :disabled="assetStore.isLoading ">
              <option :value="null">Sin activo relacionado</option>
              <option v-for="assetOption in assets" :key="assetOption.id" :value="assetOption.id">
                {{ assetOption.name }} ({{ assetOption.asset_code || 'N/A' }})
              </option>
            </select>
          </div>
         
          <div>
            <label class="form-label">Descripción de Ubicación</label>
            <textarea v-model="form.location_description" class="form-input"></textarea>
          </div>

          <div>
            <label class="form-label">Organización</label>
            <select v-model="form.organization_id" required class="form-input" :disabled="organizationStore.isLoading">
              <option value="" disabled>Seleccione una organización</option>
              <option v-for="org in organizations" :key="org.id" :value="org.id">
                {{ org.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="form-label">Estado</label>
            <select v-model="form.status" required class="form-input">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div class="space-y-2">
            <h3 class="text-md font-medium text-gray-900">Rangos de Umbral</h3>
            <div v-if="form.type === 'vibration' && vibrationProfile">
                <VibrationProfileDisplay :profile="vibrationProfile" />
            </div>
            <div v-else-if="form.type !== 'vibration'" class="card p-4 bg-gray-50 border border-gray-200">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label class="form-label">Crítico Mínimo</label><input v-model.number="form.thresholds.criticalMin" type="number" step="any" class="form-input" /></div>
                  <div><label class="form-label">Crítico Máximo</label><input v-model.number="form.thresholds.criticalMax" type="number" step="any" class="form-input" /></div>
                  <div><label class="form-label">Normal Mínimo</label><input v-model.number="form.thresholds.normalMin" type="number" step="any" class="form-input" /></div>
                  <div><label class="form-label">Normal Máximo</label><input v-model.number="form.thresholds.normalMax" type="number" step="any" class="form-input" /></div>
              </div>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="flex justify-end gap-3 pt-4">
            <NuxtLink :to="`/sensors/${route.params.id}`" class="btn btn-secondary">Cancelar</NuxtLink>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSensorStore } from '~/stores/sensors';
import { useOrganizationStore } from '~/stores/organizations';
import { useAssetStore } from '~/stores/assets';
import { useParameterStore } from '~/stores/parameters';
import PageHeader from "@/components/PageHeader.vue";
import VibrationProfileDisplay from "@/components/VibrationProfileDisplay.vue";

const route = useRoute();
const router = useRouter();
const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore();
const parameterStore = useParameterStore();

const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const vibrationProfile = ref(null);

const selectedBrand = ref(null);
const selectedModel = ref(null);

const form = ref({
  id: '',
  name: '',
  code: '',
  firmware_id: null,
  location_description: '', 
  organization_id: '',
  asset_id: null,
  status: 'active',
  type: '',
  unit: '',
  thresholds: {
    criticalMin: null, criticalMax: null,
    normalMin: null, normalMax: null,
    alarm_level: null, critical_level: null,
  },
});

const organizations = computed(() => organizationStore.organizations);
const assets = computed(() => assetStore.assets);
const availableUnits = computed(() => parameterStore.getUnitParameters);

const brands = computed(() => sensorStore.brands);
const filteredModels = computed(() => sensorStore.getModelsByBrand(selectedBrand.value));
const filteredFirmwares = computed(() => sensorStore.getFirmwaresByModel(selectedModel.value));

const resetThresholds = () => ({ 
    criticalMin: null, criticalMax: null,
    normalMin: null, normalMax: null,
    alarm_level: null, critical_level: null,
});

const loadSensorData = async () => {
  loading.value = true;
  error.value = null;
  vibrationProfile.value = null;
  try {
    const sensorId = route.params.id;
    await Promise.all([
      organizationStore.fetchOrganizations(),
      assetStore.fetchAssets(), 
      parameterStore.fetchParameters(),
      sensorStore.fetchSensorHierarchy(),
    ]);

    const fetchedSensor = await sensorStore.fetchSensor(sensorId);
    if (!fetchedSensor) {
      error.value = 'Sensor no encontrado.';
      router.push('/sensors');
      return;
    }

    form.value = {
      id: fetchedSensor.id,
      name: fetchedSensor.name || '',
      code: fetchedSensor.code || '',
      firmware_id: fetchedSensor.firmware_id || null,
      location_description: fetchedSensor.location_description || '',
      organization_id: fetchedSensor.organizationId || '',
      asset_id: fetchedSensor.assetId || null, 
      status: fetchedSensor.status || 'active',
      type: fetchedSensor.type || '',
      unit: fetchedSensor.unit || '',
      thresholds: {
        criticalMin: fetchedSensor.thresholds?.criticalMin ?? null, 
        criticalMax: fetchedSensor.thresholds?.criticalMax ?? null,
        normalMin: fetchedSensor.thresholds?.normalMin ?? null,
        normalMax: fetchedSensor.thresholds?.normalMax ?? null,
        alarm_level: fetchedSensor.thresholds?.alarm_level ?? null,
        critical_level: fetchedSensor.thresholds?.critical_level ?? null,
      },
    };

    if (fetchedSensor.brandId) {
      selectedBrand.value = fetchedSensor.brandId;
    }
    
    await nextTick();

    if (fetchedSensor.modelId) {
      selectedModel.value = fetchedSensor.modelId;
    }

    if (form.value.type === 'vibration' && form.value.asset_id) {
        const { profile } = await sensorStore.getVibrationProfileForAsset(form.value.asset_id);
        if (profile) {
            vibrationProfile.value = profile;
        }
    }

  } catch (err) {
    error.value = 'Error al cargar los datos del sensor: ' + err.message;
  } finally {
    loading.value = false;
  }
};

const saveSensor = async () => {
  saving.value = true;
  error.value = null;
  try {
    const payload = { ...form.value };
    for (const key in payload.thresholds) {
        if (payload.thresholds[key] === '' || payload.thresholds[key] === null) {
            payload.thresholds[key] = null;
        }
    }
    delete payload.id;
    await sensorStore.updateSensor(route.params.id, payload);
    router.push(`/sensors/`);
  } catch (err) {
    error.value = 'Error al guardar el sensor: ' + err.message;
  } finally {
    saving.value = false;
  }
};

watch(selectedBrand, (newVal, oldVal) => {
  // Solo reiniciar si el valor fue cambiado por el usuario (no en la carga inicial)
  if (oldVal !== null) { 
    selectedModel.value = null;
    form.value.firmware_id = null;
  }
});

watch(selectedModel, (newVal, oldVal) => {
  // Solo reiniciar si el valor fue cambiado por el usuario (no en la carga inicial)
  if (oldVal !== null) {
    form.value.firmware_id = null;
  }
});

watch([() => form.value.type, () => form.value.asset_id], async ([newType, newAssetId]) => {
  if (loading.value) return;

  if (newType !== 'vibration') {
    vibrationProfile.value = null;    
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
});

onMounted(loadSensorData);

watch(() => route.params.id, (newId) => {
  if (newId) loadSensorData();
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
