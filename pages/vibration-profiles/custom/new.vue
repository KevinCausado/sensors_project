<template>
  <div>
    <PageHeader title="Nuevo Perfil Personalizado" subtitle="Define un nombre, una rigidez y los cuatro rangos de severidad." >
      <template #actions>
        <NuxtLink to="/vibration-profiles" class="btn btn-secondary">Cancelar</NuxtLink>
      </template>
    </PageHeader>

    <div class="max-w-4xl mx-auto card">
      <form @submit.prevent="saveProfile" class="space-y-6">
        <h3 class="text-lg font-medium text-gray-900">Información del Perfil</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2">
              <label for="profile-name" class="form-label">Nombre del Perfil</label>
              <input id="profile-name" v-model="form.name" type="text" class="form-input" required placeholder="Ej: Bombas de agua - Modelo X" />
            </div>
             <!-- ++ SELECTOR DE RIGIDEZ ÚNICO ++ -->
            <div>
              <label for="rigidity-type" class="form-label">Rigidez Aplicable</label>
              <select id="rigidity-type" v-model="form.rigidity_type_id" class="form-input" required>
                  <option :value="null" disabled>Selecciona...</option>
                  <option v-for="rt in rigidityTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
              </select>
            </div>
            <div class="md:col-span-3">
              <label for="profile-description" class="form-label">Descripción (Opcional)</label>
              <textarea id="profile-description" v-model="form.description" rows="2" class="form-input" placeholder="Describe a qué tipo de máquinas o condiciones se aplica este perfil."></textarea>
            </div>
        </div>

        <div class="border-t pt-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Zonas de Severidad (mm/s)</h3>
          <div class="grid grid-cols-3 gap-4 mb-2 text-xs font-semibold text-gray-500 px-2">
              <div>Zona</div>
              <div class="text-center">Min</div>
              <div class="text-center">Max</div>
          </div>
          <div class="space-y-3">
            <div v-for="(range, key) in form.ranges" :key="key" class="grid grid-cols-3 gap-4 items-center">
              <label class="form-label-zone" :class="getSeverityClass(key)">{{ range.condition_name }} (Zona {{key}})</label>
              <input v-model.number="range.min_value" type="number" step="0.01" class="form-input text-center" placeholder="Min" required>
              <input v-model.number="range.max_value" type="number" step="0.01" class="form-input text-center" placeholder="Max" required>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-6 border-t">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            {{ loading ? 'Guardando...' : 'Guardar Perfil Completo' }}
          </button>
        </div>
        <p v-if="error" class="text-red-600 text-sm text-center">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCustomVibrationProfileStore } from '~/stores/customVibrationProfiles';
import PageHeader from '~/components/PageHeader.vue';

const router = useRouter();
const store = useCustomVibrationProfileStore();
const loading = computed(() => store.loading);
const error = computed(() => store.error);
const rigidityTypes = computed(() => store.rigidityTypes);

const form = ref({
  name: '',
  description: '',
  rigidity_type_id: null, // ++ Campo principal para la rigidez
  ranges: {
    A: { min_value: null, max_value: null, condition_name: 'Buena' },
    B: { min_value: null, max_value: null, condition_name: 'Satisfactoria' },
    C: { min_value: null, max_value: null, condition_name: 'Insatisfactoria' },
    D: { min_value: null, max_value: null, condition_name: 'Inaceptable' },
  },
});

const saveProfile = async () => {
  if (!form.value.name || !form.value.rigidity_type_id) {
      return alert('El nombre del perfil y la rigidez son obligatorios.');
  }
  await store.createProfileWithRanges(form.value);
  if (!store.error) {
    router.push('/vibration-profiles');
  }
};

const getSeverityClass = (severity) => ({
    'A': 'bg-green-100 text-green-800', 'B': 'bg-blue-100 text-blue-800',
    'C': 'bg-yellow-100 text-yellow-800', 'D': 'bg-red-100 text-red-800',
}[severity] || 'bg-gray-100 text-gray-800');

onMounted(() => {
    store.fetchSupportData();
});
</script>

<style scoped>
.card { @apply bg-white shadow-md rounded-lg p-6; }
.form-label { @apply block text-sm font-medium text-gray-700; }
.form-input { @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm; }
.form-label-zone { @apply flex items-center justify-center text-sm font-medium rounded-md px-3 py-2 h-full; }
.btn-primary { @apply bg-primary-600 text-white hover:bg-primary-700; }
.btn-secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300; }
</style>
