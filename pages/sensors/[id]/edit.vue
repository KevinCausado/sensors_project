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
          
           <div>
            <label class="form-label">Dirección</label>
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
import { useSensorStore } from '@/stores/sensors';
import { useOrganizationStore } from '@/stores/organizations';
import { useParameterStore } from '@/stores/parameters';

const route = useRoute();
const router = useRouter();
const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
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
  country: '', // Nuevo campo 
  state: '', // Nuevo campo 
  city: '', // Nuevo campo 
  organizationId: '',
  organizationName: '',
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
const availableUnits = computed(() => parameterStore.getUnitParameters);

const loadSensorData = async () => {
  loading.value = true;
  error.value = null;
  try {
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
      country: fetchedSensor.country || '', // Populating new field 
      state: fetchedSensor.state || '', // Populating new field 
      city: fetchedSensor.city || '', // Populating new field 
      organizationId: fetchedSensor.organizationId || '',
      organizationName: fetchedSensor.organizationName || '',
      status: fetchedSensor.status || 'active',
      type: fetchedSensor.type || '',
      unit: fetchedSensor.unit || '',
      thresholds: {
        criticalMin: fetchedSensor.thresholds?.criticalMin || 0,
        criticalMax: fetchedSensor.thresholds?.criticalMax || 100,
        normalMin: fetchedSensor.thresholds?.normalMin || 0,
        normalMax: fetchedSensor.thresholds?.normalMax || 100,
      },
      last_communication: fetchedSensor.last_communication || null,
      battery_level: fetchedSensor.battery_level || null,
      signal_strength: fetchedSensor.signal_strength || null,
    };

    console.log("--- DEBUG EDICIÓN SENSOR ---");
    console.log("1. Sensor cargado y mapeado al formulario (form.value):", form.value);
    console.log("2. ID de Organización en el formulario (form.value.organizationId):", form.value.organizationId);
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
  try {
    await Promise.all([
      organizationStore.fetchOrganizations(),
      parameterStore.fetchParameters(),
    ]);
    console.log("3. Organizaciones cargadas en el store (organizationStore.organizations):", organizationStore.organizations);

    await loadSensorData();

    if (form.value.organizationId && organizations.value.length > 0) {
      const foundOrg = organizations.value.find(
        org => org.id === form.value.organizationId
      );
      console.log(`4. Buscando organización con ID "${form.value.organizationId}" en la lista de opciones:`, foundOrg);
      if (!foundOrg) {
          console.warn("5. ¡Advertencia! El ID de organización del sensor NO se encontró en la lista de organizaciones disponibles para el SELECT.");
      }
    } else {
         console.log("4. No hay organizationId en el sensor o la lista de organizaciones está vacía.");
    }
  } catch (e) {
    console.error('Error en onMounted al cargar datos iniciales:', e);
    error.value = 'Error inicial al cargar datos: ' + e.message;
  }
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