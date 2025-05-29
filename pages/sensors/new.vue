<template>
  <div>
    <PageHeader 
      title="Nuevo Sensor" 
      subtitle="Crear un nuevo sensor en el sistema">
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
            {{ saving ? 'Guardando...' : 'Guardar Sensor' }}
          </button> -->
        </div>
      </template>
    </PageHeader>

    <div class="max-w-3xl mx-auto">
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
              {{ saving ? 'Guardando...' : 'Guardar Sensor' }}
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

const router = useRouter();
const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const parameterStore = useParameterStore();

// Estado
const saving = ref(false);
const form = ref({
  name: '',
  type: 'temperature',
  unit: '',
  location: '',
  organizationId: '',
  status: 'active',
  thresholds: {
    min: 0,
    max: 100,
    criticalMin: 0,
    criticalMax: 100,
    // Add these two new variables here!
    normalMin: 0,   // Or whatever default value is appropriate
    normalMax: 100  // Or whatever default value is appropriate
  }
});

// Computed
const organizations = computed(() => organizationStore.organizations);
const availableUnits = computed(() => parameterStore.getUnitParameters);

// Métodos
const saveSensor = async () => {
  try {
    saving.value = true;
    const sensor = await sensorStore.createSensor({
      ...form.value,
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
  await Promise.all([
    organizationStore.fetchOrganizations(),
    parameterStore.fetchParameters()
  ]);
  
  // Establecer organización por defecto si hay una seleccionada
  if (organizations.value.length > 0) {
    form.value.organizationId = organizations.value[0].id;
  }
  
  // Establecer unidad por defecto según el tipo
  if (availableUnits.value.length > 0) {
    form.value.unit = availableUnits.value[0].value;
  }
});
</script>