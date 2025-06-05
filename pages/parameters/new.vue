<template>
  <div>
    <PageHeader 
      title="Nuevo Parámetro" 
      subtitle="Crear un nuevo parámetro en el sistema">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink 
            to="/parameters"
            class="btn btn-secondary">
            Volver
          </NuxtLink>        
        </div>
      </template>
    </PageHeader>

    <div class="max-w-3xl mx-auto">
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
              class="form-input" />
            <p class="mt-1 text-sm text-gray-500">
              Identificador único para el parámetro (sin espacios ni caracteres especiales)
            </p>
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Tipo</label>
              <select 
                v-model="form.type"
                required
                class="form-input">
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="boolean">Booleano</option>
              </select>
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
              {{ saving ? 'Guardando...' : 'Guardar Parámetro' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useParameterStore } from '~/stores/parameters';

// Icons (placeholder)
const CheckIcon = defineComponent({
  render: () => h('div')
});

definePageMeta({
  // middleware: ['auth']
});

const router = useRouter();
const parameterStore = useParameterStore();

// Estado
const saving = ref(false);
const form = ref({
  name: '', // This property won't be sent to DB as 'name' column doesn't exist
  key: '',  // This is for the 'Clave' input, which maps to the 'key' DB column
  type: 'text',
  category: 'system',
  value: '',
  unit: '', // Assuming 'unit' is either stored in 'value' or another column not shown
  description: ''
});

// Métodos
const saveParameter = async () => {
  try {
    saving.value = true;
    await parameterStore.createParameter(form.value);
    router.push('/parameters');
  } catch (error) {
    console.error('Error al guardar parámetro:', error);
  } finally {
    saving.value = false;
  }
};
</script>