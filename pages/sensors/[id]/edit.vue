<template>
  <div>
    <PageHeader
      title="Editar Sensor"
      :subtitle="`Editar sensor ${form?.name}`"
    >
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink
            to="/sensors"
            class="btn btn-secondary"
          >
            Volver
          </NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-500">Cargando información del sensor...</p>
    </div>

    <div v-else-if="error" class="text-center py-8 text-error-600">
      <p>Error al cargar el sensor: {{ error }}</p>
    </div>

    <div v-else class="max-w-3xl mx-auto">
      <div class="card">
        <form @submit.prevent="saveSensor" class="space-y-6">
          <div>
            <label class="form-label">Nombre</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="form-input"
            />
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Tipo</label>
              <select
                v-model="form.type"
                required
                class="form-input"
              >
                <option value="temperature">Temperatura</option>
                <option value="humidity">Humedad</option>
                <option value="vibration">Vibración</option>
                <option value="pressure">Presión</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div>
              <label class="form-label">Unidad de Medida</label>
              <select
                v-model="form.unit"
                class="form-input"
              >
                <option value="">Seleccione una unidad</option>
                <option
                  v-for="unitOption in availableUnits"
                  :key="unitOption.unit"
                  :value="unitOption.unit"
                >
                  {{ unitOption.name }}
                </option>
              </select>
            </div>
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
            <label class="form-label">Descripción</label>
            <textarea v-model="form.location_description" class="form-input"></textarea>
          </div>
          <div>
            <label class="form-label">Organización</label>
            <select
              v-model="form.organizationId"
              required
              class="form-input"
              :disabled="organizationStore.isLoading"
            >
              <option value="">Seleccione una organización</option>
              <option
                v-for="org in organizations"
                :key="org.id"
                :value="org.id"
              >
                {{ org.name }}
              </option>
            </select>
          </div>

          <!-- Campo Activo Relacionado -->
          <div>
            <label class="form-label">Activo Relacionado</label>
            <select v-model="form.asset_id" class="form-input" :disabled="assetStore.isLoading">
              <option :value="null">Sin activo relacionado</option>
              <option v-for="assetOption in assets" :key="assetOption.id" :value="assetOption.id">
                {{ assetOption.name }} ({{ assetOption.asset_code || 'N/A' }})
              </option>
            </select>
          </div>

          <div>
            <label class="form-label">Estado</label>
            <select
              v-model="form.status"
              required
              class="form-input"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div class="card p-4 bg-gray-50 border border-gray-200">
            <h3 class="text-md font-medium text-gray-900 mb-3">Umbrales de Alerta (Thresholds)</h3>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label class="form-label">Normal Mínimo</label>
                <input
                  v-model.number="form.thresholds.normalMin"
                  type="number"
                  step="any"
                  class="form-input"
                />
              </div>
              <div>
                <label class="form-label">Normal Máximo</label>
                <input
                  v-model.number="form.thresholds.normalMax"
                  type="number"
                  step="any"
                  class="form-input"
                />
              </div>
              <div>
                <label class="form-label">Crítico Mínimo</label>
                <input
                  v-model.number="form.thresholds.criticalMin"
                  type="number"
                  step="any"
                  class="form-input"
                />
              </div>
              <div>
                <label class="form-label">Crítico Máximo</label>
                <input
                  v-model.number="form.thresholds.criticalMax"
                  type="number"
                  step="any"
                  class="form-input"
                />
              </div>
              <!-- Campos específicos para umbrales de vibración -->
              <template v-if="form.type === 'vibration'">
                <div>
                  <label class="form-label">Nivel de Alarma</label>
                  <input v-model.number="form.thresholds.alarm_level" type="number" step="any" class="form-input" />
                </div>
                <div>
                  <label class="form-label">Nivel Crítico</label>
                  <input v-model.number="form.thresholds.critical_level" type="number" step="any" class="form-input" />
                </div>
              </template>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <NuxtLink
              to="/sensors"
              class="btn btn-secondary"
            >
              Cancelar
            </NuxtLink>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="saving"
            >
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSensorStore } from '~/stores/sensors';
import { useOrganizationStore } from '~/stores/organizations';
import { useAssetStore } from '~/stores/assets';
import { useVibrationProfileStore } from '~/stores/vibrationProfiles'; // Importar el store de perfiles de vibración
import { useParameterStore } from '~/stores/parameters';

const route = useRoute();
const router = useRouter();
const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore();
const vibrationProfileStore = useVibrationProfileStore(); // Inicializar el store de perfiles de vibración
const parameterStore = useParameterStore();

const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const form = ref({
  id: '',
  name: '',
  serial_number: '',
  model: '',
  location_description: '', 
  organizationId: '',
  asset_id: null,
  status: 'active',
  type: '',
  unit: '',
  thresholds: {
    criticalMin: null,
    criticalMax: null,
    normalMin: null,
    normalMax: null,
    alarm_level: null, // Nuevo para vibración
    critical_level: null, // Nuevo para vibración
  },
  last_communication: null,
  battery_level: null,
  signal_strength: null,
});

const organizations = computed(() => organizationStore.organizations);
const assets = computed(() => assetStore.assets);
const availableUnits = computed(() => parameterStore.getUnitParameters);

const loadSensorData = async () => {
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([
      organizationStore.fetchOrganizations(),
      assetStore.fetchAssets(), 
      parameterStore.fetchParameters(),
    ]);

    const fetchedSensor = await sensorStore.fetchSensor(route.params.id);
    if (!fetchedSensor) {
      error.value = 'Sensor no encontrado.';
      router.push('/sensors');
      return;
    }

    form.value = {
      id: fetchedSensor.id,
      name: fetchedSensor.name || '',
      serial_number: fetchedSensor.serial_number || '',
      model: fetchedSensor.model || '',
      location_description: fetchedSensor.location_description || '',
      organizationId: fetchedSensor.organizationId || '',
      asset_id: fetchedSensor.assetId || null, 
      status: fetchedSensor.status || 'active',
      type: fetchedSensor.type || '',
      unit: fetchedSensor.unit || '',
      thresholds: {
        criticalMin: fetchedSensor.thresholds?.criticalMin ?? null, 
        criticalMax: fetchedSensor.thresholds?.criticalMax ?? null,
        normalMin: fetchedSensor.thresholds?.normalMin ?? null,
        normalMax: fetchedSensor.thresholds?.normalMax ?? null,
        alarm_level: fetchedSensor.thresholds?.alarm_level ?? null, // Cargar valor de alarma
        critical_level: fetchedSensor.thresholds?.critical_level ?? null, // Cargar valor crítico
      },
      last_communication: fetchedSensor.last_communication || null,
      battery_level: fetchedSensor.battery_level || null,
      signal_strength: fetchedSensor.signal_strength || null,
    };

    console.log("--- DEBUG EDICIÓN SENSOR ---");
    console.log("1. Sensor cargado y mapeado al formulario (form.value):", form.value);
    console.log("2. ID de Organización en el formulario (form.value.organizationId):", form.value.organizationId);
    console.log("3. ID de Activo en el formulario (form.value.asset_id):", form.value.asset_id);
    console.log("4. Lista de activos disponibles (assets.value):", assets.value);

  } catch (err) {
    error.value = 'Error al cargar sensor: ' + err.message;
    console.error('Error al cargar sensor:', err);
  } finally {
    loading.value = false;
  }
};

const saveSensor = async () => {
  saving.value = true;
  error.value = null;
  try {
    const payload = { ...form.value };

    // Limpiar campos numéricos de umbrales si están vacíos o son 0/null para enviar null a DB
    for (const key of ['criticalMin', 'criticalMax', 'normalMin', 'normalMax', 'alarm_level', 'critical_level']) {
      if (payload.thresholds[key] === '' || payload.thresholds[key] === 0) { 
        payload.thresholds[key] = null;
      }
    }

    await sensorStore.updateSensor(route.params.id, payload);
    router.push('/sensors');
  } catch (err) {
    error.value = 'Error al guardar sensor: ' + err.message;
    console.error('Error al guardar sensor:', err);
  } finally {
    saving.value = false;
  }
};

// Observar cambios en el tipo de sensor y el asset_id para cargar umbrales
watch([() => form.value.type, () => form.value.asset_id], async ([newType, newAssetId]) => {
  // Solo aplicar lógica si no estamos en la carga inicial y el activo ha sido seleccionado
  if (!loading.value && newType === 'vibration' && newAssetId) {
    console.log(`[EditSensorPage] Sensor tipo vibración y asset_id seleccionado/cambiado: ${newAssetId}. Intentando cargar umbrales del perfil.`);
    const selectedAsset = assets.value.find(asset => asset.id === newAssetId);
    
    if (selectedAsset && selectedAsset.vibration_profile_id) {
      console.log(`[EditSensorPage] Activo tiene perfil de vibración ID: ${selectedAsset.vibration_profile_id}`);
      await vibrationProfileStore.fetchVibrationProfile(selectedAsset.vibration_profile_id);
      const profileThresholds = vibrationProfileStore.getCurrentVibrationProfile?.thresholds;

      if (profileThresholds) {
        console.log('[EditSensorPage] Umbrales del perfil cargados:', profileThresholds);
        // Asignar los umbrales del perfil al formulario del sensor
        form.value.thresholds.normalMin = profileThresholds.normal_min ?? null;
        form.value.thresholds.normalMax = profileThresholds.normal_max ?? null;
        form.value.thresholds.criticalMin = profileThresholds.min_value ?? null; 
        form.value.thresholds.criticalMax = profileThresholds.max_value ?? null; 
        form.value.thresholds.alarm_level = profileThresholds.alarm_level ?? null;
        form.value.thresholds.critical_level = profileThresholds.critical_level ?? null;

        // Asignar la unidad del perfil de vibración si está disponible
        const profileUnit = vibrationProfileStore.getCurrentVibrationProfile?.vibration_range_unit;
        if (profileUnit) {
          form.value.unit = profileUnit;
          console.log(`[EditSensorPage] Unidad del perfil de vibración asignada: ${profileUnit}`);
        } else {
          console.warn('[EditSensorPage] Perfil de vibración no tiene unidad definida.');
        }

      } else {
        console.warn('[EditSensorPage] El perfil de vibración no tiene umbrales definidos.');
        resetVibrationThresholds(); // Limpiar solo umbrales de vibración
      }
    } else {
      console.log('[EditSensorPage] Activo seleccionado no tiene perfil de vibración o no se encontró. Limpiando umbrales de vibración.');
      resetVibrationThresholds(); // Limpiar solo umbrales de vibración
    }
  } else if (!loading.value && newType !== 'vibration') {
    // Si el tipo cambia a no-vibración, limpiar solo los umbrales específicos de vibración
    console.log('[EditSensorPage] Tipo de sensor no es vibración. Reiniciando umbrales específicos de vibración.');
    resetVibrationThresholds();
  }
}, { immediate: false }); // No ejecutar inmediatamente, espera interacción del usuario o carga inicial

// Función para reiniciar solo los umbrales específicos de vibración
const resetVibrationThresholds = () => {
  form.value.thresholds.alarm_level = null;
  form.value.thresholds.critical_level = null;
  // Opcional: También podrías resetear normalMin/Max y criticalMin/Max a null si son exclusivos de vibración
  // pero por ahora los mantendremos si se llenaron antes.
};


onMounted(async () => {
  await loadSensorData();
});

const sensor = computed(() => form.value);
watch(() => route.params.id, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    console.log(`ID del sensor en la ruta cambió de ${oldId} a ${newId}. Recargando datos...`);
    await loadSensorData();
  }
});
</script>

<style scoped>
/* Tus estilos aquí */
</style>