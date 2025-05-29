<template>
  <div>
    <PageHeader 
      title="Editar Parámetro" 
      :subtitle="parameter?.name">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink 
            to="/parameters"
            class="btn btn-secondary">
            Volver
          </NuxtLink>
          <!-- <button 
            @click="saveParameter" 
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
        <form @submit.prevent="saveParameter" class="space-y-6">
          <div>
            <label class="form-label">Nombre</label>
            <input 
              v-model="form.name"
              type="text"
              required
              class="form-input" />
          </div>

          <div>
            <label class="form-label">Clave</label>
            <input 
              v-model="form.key"
              type="text"
              required
              disabled
              class="form-input bg-gray-50" />
            <p class="mt-1 text-sm text-gray-500">
              La clave no puede ser modificada
            </p>
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Tipo</label>
              <select 
                v-model="form.type"
                required
                disabled
                class="form-input bg-gray-50">
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="boolean">Booleano</option>
              </select>
              <p class="mt-1 text-sm text-gray-500">
                El tipo no puede ser modificado
              </p>
            </div>

            <div>
              <label class="form-label">Categoría</label>
              <select 
                v-model="form.category"
                required
                class="form-input">
                <option value="system">Sistema</option>
                <option value="sensors">Sensores</option>
                <option value="alerts">Alertas</option>
                <option value="units">Unidades</option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">Valor</label>
            <input 
              v-if="form.type === 'text'"
              v-model="form.value"
              type="text"
              required
              class="form-input" />
            <input 
              v-else-if="form.type === 'number'"
              v-model.number="form.value"
              type="number"
              step="any"
              required
              class="form-input" />
            <select 
              v-else
              v-model="form.value"
              required
              class="form-input">
              <option value="true">Verdadero</option>
              <option value="false">Falso</option>
            </select>
          </div>

          <div>
            <label class="form-label">Unidad (opcional)</label>
            <input 
              v-model="form.unit"
              type="text"
              class="form-input" />
          </div>

          <div>
            <label class="form-label">Descripción</label>
            <textarea 
              v-model="form.description"
              rows="3"
              class="form-input" />
          </div>

          <div class="flex justify-end gap-2">
            <NuxtLink 
              to="/parameters"
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
import { ref, onMounted } from 'vue';
import { useParameterStore } from '~/stores/parameters';

// Icons (placeholder)
const CheckIcon = defineComponent({
  render: () => h('div')
});

definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
const router = useRouter();
const parameterStore = useParameterStore();

// Estado
const loading = ref(true);
const saving = ref(false);
const parameter = ref(null);
const form = ref({
  name: '',
  key: '',
  type: 'text',
  category: 'system',
  value: '',
  unit: '',
  description: ''
});

// Métodos
const loadParameter = async () => {
  try {
    parameter.value = await parameterStore.fetchParameterById(route.params.id);
    form.value = { ...parameter.value };
  } catch (error) {
    console.error('Error al cargar parámetro:', error);
    router.push('/parameters');
  }
};

const saveParameter = async () => {
  try {
    saving.value = true;
    await parameterStore.updateParameter(route.params.id, form.value);
    router.push('/parameters');
  } catch (error) {
    console.error('Error al guardar parámetro:', error);
  } finally {
    saving.value = false;
  }
};

// Cargar datos
onMounted(async () => {
  try {
    await loadParameter();
  } finally {
    loading.value = false;
  }
});
</script>