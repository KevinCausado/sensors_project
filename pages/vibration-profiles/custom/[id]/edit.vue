<template>
  <div>
    <PageHeader 
      title="Editar Perfil Personalizado" 
      :subtitle="form.name || 'Cargando...'"
    >
      <template #actions>
        <NuxtLink to="/vibration-profiles" class="btn btn-secondary">Cancelar</NuxtLink>
      </template>
    </PageHeader>
    
    <div v-if="loading" class="text-center py-10">Cargando datos del perfil...</div>
    <div v-else-if="error" class="text-center py-10 text-red-500">{{ error }}</div>

    <div v-else class="max-w-4xl mx-auto card">
      <form @submit.prevent="saveChanges" class="space-y-6">
        <h3 class="text-lg font-medium text-gray-900">Información del Perfil</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2">
              <label for="profile-name" class="form-label">Nombre del Perfil</label>
              <input id="profile-name" v-model="form.name" type="text" class="form-input" required />
            </div>
            <div>
              <label for="rigidity-type" class="form-label">Rigidez Aplicable</label>
              <select id="rigidity-type" v-model="form.rigidity_type_id" class="form-input" required>
                  <option :value="null" disabled>Selecciona...</option>
                  <option v-for="rt in rigidityTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
              </select>
            </div>
            <div class="md:col-span-3">
              <label for="profile-description" class="form-label">Descripción (Opcional)</label>
              <textarea id="profile-description" v-model="form.description" rows="2" class="form-input"></textarea>
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
              <label class="form-label-zone" :class="getSeverityClass(key)">{{ getSeverityDescription(key) }}</label>
              <input v-model.number="range.min_value" type="number" step="0.01" class="form-input text-center" required>
              <input v-model.number="range.max_value" type="number" step="0.01" class="form-input text-center" required>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-6 border-t">
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span v-if="saving" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCustomVibrationProfileStore } from '~/stores/customVibrationProfiles';
import PageHeader from '~/components/PageHeader.vue';

const route = useRoute();
const router = useRouter();
const store = useCustomVibrationProfileStore();

const loading = ref(true);
const saving = ref(false);
const error = computed(() => store.error);
const rigidityTypes = computed(() => store.rigidityTypes);
const profileId = route.params.id;

const form = ref({
  name: '',
  description: '',
  rigidity_type_id: null,
  ranges: {
    A: { min_value: null, max_value: null },
    B: { min_value: null, max_value: null },
    C: { min_value: null, max_value: null },
    D: { min_value: null, max_value: null },
  },
});

const loadProfile = async () => {
    loading.value = true;
    await store.fetchSupportData();
    const profileData = await store.fetchProfileById(profileId);
    if (profileData) {
        form.value.name = profileData.name;
        form.value.description = profileData.description;
        form.value.rigidity_type_id = profileData.rigidity_type_id;
        
        // Mapear los rangos al formulario
        profileData.ranges.forEach(range => {
            if (form.value.ranges[range.severity]) {
                form.value.ranges[range.severity].min_value = range.min_value;
                form.value.ranges[range.severity].max_value = range.max_value;
            }
        });
    } else {
        store.error = 'No se pudo encontrar el perfil para editar.';
    }
    loading.value = false;
};

const saveChanges = async () => {
    saving.value = true;
    await store.updateProfileWithRanges(profileId, form.value);
    saving.value = false;
    if (!store.error) {
        router.push('/vibration-profiles');
    }
};

const getSeverityDescription = (s) => ({'A': 'Buena','B': 'Satisfactoria','C': 'Insatisfactoria','D': 'Inaceptable'}[s]);
const getSeverityClass = (s) => ({'A': 'bg-green-100 text-green-800', 'B': 'bg-blue-100 text-blue-800','C': 'bg-yellow-100 text-yellow-800', 'D': 'bg-red-100 text-red-800'}[s]);

onMounted(loadProfile);
</script>

<style scoped>
.card { @apply bg-white shadow-md rounded-lg p-6; }
.form-label { @apply block text-sm font-medium text-gray-700; }
.form-input { @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm; }
.form-label-zone { @apply flex items-center justify-center text-sm font-medium rounded-md px-3 py-2 h-full; }
.btn { @apply inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm; }
.btn-primary { @apply bg-primary-600 text-white hover:bg-primary-700; }
.btn-secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300; }
</style>
