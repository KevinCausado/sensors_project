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
            <label class="form-label">Descripción</label>
            <textarea v-model="form.location_description" class="form-input"></textarea>
          </div>
          <div>
            <label class="form-label">Organización</label>
            <select
              v-model="form.organizationId"
              required
              class="form-input"
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
            <select v-model="form.asset_id" class="form-input">
              <!-- Aseguramos que la opción para null sea explícita -->
              <option :value="null">Sin activo relacionado</option>
              <option v-for="assetOption in assets" :key="assetOption.id" :value="assetOption.id">
                {{ assetOption.name }} ({{ assetOption.asset_code }})
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
            </select>
          </div>

          <h3 class="text-lg font-medium text-gray-900 mb-2">Umbrales de Alerta (Thresholds)</h3>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Mínimo Normal</label>
              <input
                v-model.number="form.thresholds.normalMin"
                type="number"
                class="form-input"
              />
            </div>
            <div>
              <label class="form-label">Máximo Normal</label>
              <input
                v-model.number="form.thresholds.normalMax"
                type="number"
                class="form-input"
              />
            </div>
            <div>
              <label class="form-label">Mínimo Crítico</label>
              <input
                v-model.number="form.thresholds.criticalMin"
                type="number"
                class="form-input"
              />
            </div>
            <div>
              <label class="form-label">Máximo Crítico</label>
              <input
                v-model.number="form.thresholds.criticalMax"
                type="number"
                class="form-input"
              />
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
import { useParameterStore } from '~/stores/parameters';

const route = useRoute();
const router = useRouter();
const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore();
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
    criticalMin: 0,
    criticalMax: 100,
    normalMin: 0,
    normalMax: 100,
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
    // Es CRUCIAL que estos datos se carguen PRIMERO
    await Promise.all([
      organizationStore.fetchOrganizations(),
      assetStore.fetchAssets(), // Aseguramos que la lista de activos esté disponible
      parameterStore.fetchParameters(),
    ]);
    console.log("Datos de referencia (organizaciones, activos, parámetros) cargados.");

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
      // No poblar city, state, country directamente del sensor, ya que vienen del activo
      organizationId: fetchedSensor.organizationId || '',
      asset_id: fetchedSensor.assetId || null, // Usamos 'assetId' que es como lo mapea el store
      status: fetchedSensor.status || 'active',
      type: fetchedSensor.type || '',
      unit: fetchedSensor.unit || '',
      thresholds: {
        criticalMin: fetchedSensor.thresholds?.criticalMin ?? 0,
        criticalMax: fetchedSensor.thresholds?.criticalMax ?? 100,
        normalMin: fetchedSensor.thresholds?.normalMin ?? 0,
        normalMax: fetchedSensor.thresholds?.normalMax ?? 100,
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
    const payload = {
      ...form.value,
      organizationName: undefined,
      assetName: undefined,
      assetCity: undefined, // Asegurarse de que no se envíen
      assetState: undefined, // Asegurarse de que no se envíen
      assetCountry: undefined, // Asegurarse de que no se envíen
    };
    const updatedSensor = await sensorStore.updateSensor(route.params.id, payload);

    router.push('/sensors');
  } catch (err) {
    error.value = 'Error al guardar sensor: ' + err.message;
    console.error('Error al guardar sensor:', err);
  } finally {
    saving.value = false;
  }
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
