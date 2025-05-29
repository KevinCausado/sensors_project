<template>
  <div>
    <PageHeader 
      title="Editar Sensor" 
      :subtitle="`Editar sensor ${sensor?.name}`">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink 
            to="/sensors"
            class="btn btn-secondary">
            Volver
          </NuxtLink>
          <!-- <button 
            @click="saveSensor" 
            class="btn btn-primary flex items-center"
            :disabled="saving">
            <CheckIcon class="h-5 w-5 mr-2" />
            {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
          </button> -->
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
              class="form-input" />
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Tipo</label>
              <select 
                v-model="form.type"
                required
                class="form-input">
                <option value="temperature">Temperatura</option>
                <option value="humidity">Humedad</option>
                <option value="pressure">Presión</option>
                <option value="level">Nivel</option>
                <option value="power">Energía</option>
                <option value="air-quality">Calidad del Aire</option>
              </select>
            </div>

            <div>
              <label class="form-label">Unidad de Medida</label>
              <select 
                v-model="form.unit"
                required
                class="form-input">
                <option v-for="unit in availableUnits" 
                        :key="unit.id" 
                        :value="unit.value">
                  {{ unit.name }} ({{ unit.value }})
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">Ubicación</label>
            <input 
              v-model="form.location"
              type="text"
              required
              class="form-input" />
          </div>

          <div>
            <label class="form-label">Organización</label>
            <select 
              v-model="form.organizationId"
              required
              class="form-input">
              <option v-for="org in organizations" 
                      :key="org.id" 
                      :value="org.id">
                {{ org.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="form-label">Estado</label>
            <select 
              v-model="form.status"
              required
              class="form-input">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="maintenance">Mantenimiento</option>
            </select>
          </div>

       <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Umbrales</h3>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label class="form-label">Mínimo</label>
                <input 
                  v-model.number="form.thresholds.min"
                  type="number"
                  step="0.01"
                  required
                  class="form-input" />
              </div>

              <div>
                <label class="form-label">Máximo</label>
                <input 
                  v-model.number="form.thresholds.max"
                  type="number"
                  step="0.01"
                  required
                  class="form-input" />
              </div>

              <div>
                <label class="form-label">Mínimo Crítico</label>
                <input 
                  v-model.number="form.thresholds.criticalMin"
                  type="number"
                  step="0.01"
                  required
                  class="form-input" />
              </div>

              <div>
                <label class="form-label">Máximo Crítico</label>
                <input 
                  v-model.number="form.thresholds.criticalMax"
                  type="number"
                  step="0.01"
                  required
                  class="form-input" />
              </div>

              <div>
                <label class="form-label">Mínimo Normal</label>
                <input 
                  v-model.number="form.thresholds.normalMin"
                  type="number"
                  step="0.01"
                  required
                  class="form-input" />
              </div>

              <div>
                <label class="form-label">Máximo Normal</label>
                <input 
                  v-model.number="form.thresholds.normalMax"
                  type="number"
                  step="0.01"
                  required
                  class="form-input" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <NuxtLink 
              to="/sensors"
              class="btn btn-secondary">
              Cancelar
            </NuxtLink>
            <button 
              type="submit" 
              class="btn btn-primary"
              :disabled="saving">
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSensorStore } from '~/stores/sensors';
import { useOrganizationStore } from '~/stores/organizations';
import { useParameterStore } from '~/stores/parameters';

// Icons (placeholder)
const CheckIcon = defineComponent({
  render: () => h('div')
});

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const router = useRouter();
const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const parameterStore = useParameterStore();

// Estado
const loading = ref(true);
const saving = ref(false);
const sensor = ref(null);
const form = ref({
  name: '',
  type: '',
  unit: '',
  location: '',
  organizationId: '',
  status: '',
  thresholds: {
    min: 0,
    max: 100,
    criticalMin: 0,
    criticalMax: 100,
     normalMin: 0,   // Valor por defecto
    normalMax: 100  // Valor por defecto
  }
});

// Computed
const organizations = computed(() => organizationStore.organizations);
const availableUnits = computed(() => parameterStore.getUnitParameters);

// Métodos
const loadSensor = async () => {
  try {
    const fetchedSensor = await sensorStore.fetchSensor(route.params.id);
    sensor.value = fetchedSensor;

    // Asegúrate de que los campos normalMin y normalMax se carguen o se inicialicen
    form.value = {
      ...fetchedSensor,
      thresholds: {
        min: fetchedSensor.thresholds?.min || 0,
        max: fetchedSensor.thresholds?.max || 100,
        criticalMin: fetchedSensor.thresholds?.criticalMin || 0,
        criticalMax: fetchedSensor.thresholds?.criticalMax || 100,
        // Carga los nuevos campos, o usa el valor por defecto si no existen
        normalMin: fetchedSensor.thresholds?.normalMin || 0,
        normalMax: fetchedSensor.thresholds?.normalMax || 100
      }
    };
  } catch (error) {
    console.error('Error al cargar sensor:', error);
    router.push('/sensors');
  }
};

const saveSensor = async () => {
  try {
    saving.value = true;
    const updatedSensor = await sensorStore.updateSensor(route.params.id, {
      ...form.value,
      // Asegúrate de que thresholds se envíe completo con los nuevos campos
      thresholds: { ...form.value.thresholds }, // Envía el objeto thresholds completo
      organizationName: organizations.value.find(org => org.id === form.value.organizationId)?.name
    });
    router.push('/sensors');
  } catch (error) {
    console.error('Error al guardar sensor:', error);
  } finally {
    saving.value = false;
  }
};

// Cargar datos
onMounted(async () => {
  try {
    await Promise.all([
      loadSensor(),
      organizationStore.fetchOrganizations(),
      parameterStore.fetchParameters()
    ]);
  } finally {
    loading.value = false;
  }
});
</script>