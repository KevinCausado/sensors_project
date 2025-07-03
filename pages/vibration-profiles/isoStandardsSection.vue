<template>
    <div class="card p-6 shadow-lg">
        <h3 class="text-xl font-semibold text-gray-800 mb-2">Estándares Base (ISO 10816)</h3>
        <p class="text-sm text-gray-500 mb-4">Rangos de severidad definidos para cada grupo de maquinaria estándar.</p>
        
        <div v-if="loading" class="text-center py-4">Cargando estándares...</div>
        <div v-else-if="error" class="text-center py-4 text-red-600">Error: {{ error }}</div>
        
        <div v-else class="space-y-8">
            <div v-for="group in isoGroupsWithRanges" :key="group.id">
                <h4 class="text-lg font-bold text-primary-700">{{ group.name }}</h4>
                <p v-if="group.description" class="text-sm text-gray-500 mb-2">{{ group.description }}</p>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr>
                                <th class="th-cell text-center">Severidad</th>
                                <th class="th-cell text-center">Condición</th>
                                <th class="th-cell text-center">Rango (mm/s)</th>
                                <th class="th-cell text-center">Rigidez Aplicable</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="range in group.ranges" :key="range.id" class="border-b last:border-b-0">
                                <td class="td-cell text-center"><span class="font-bold px-3 py-1 rounded-full text-xs" :class="getSeverityClass(range.severity)">ZONA {{ range.severity }}</span></td>
                                <!-- ++ CORREGIDO: Se centra el contenido de la condición ++ -->
                                <td class="td-cell text-center font-medium" :class="getSeverityTextColor(range.severity)">{{ getSeverityDescription(range.severity) }}</td>
                                <td class="td-cell font-mono text-center">{{ range.min_value }} - {{ range.max_value }}</td>
                                <td class="td-cell text-center">{{ range.rigidity_name }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useNuxtApp } from '#app';

const loading = ref(true);
const error = ref(null);
const isoGroups = ref([]);
const vibrationRanges = ref([]);
const rigidityTypes = ref([]);
const { $supabase } = useNuxtApp();

const isoGroupsWithRanges = computed(() => {
  if (!isoGroups.value.length) return [];
  return isoGroups.value.map(group => ({
    ...group,
    ranges: vibrationRanges.value
      .filter(range => range.iso_groups_id === group.id)
      .map(range => ({ ...range, rigidity_name: rigidityTypes.value.find(rt => rt.id === range.rigidity_id)?.name || 'N/A' }))
      .sort((a, b) => a.severity.localeCompare(b.severity))
  })).sort((a, b) => a.name.localeCompare(b.name));
});

const getSeverityDescription = (s) => ({'A': 'Buena (Operación nueva)', 'B': 'Satisfactoria (Operación continua)', 'C': 'Insatisfactoria (No apta para operación continua)', 'D': 'Inaceptable (Peligro de daño)'}[s] || 'Desconocida');
const getSeverityClass = (s) => ({'A': 'bg-green-100 text-green-800', 'B': 'bg-blue-100 text-blue-800', 'C': 'bg-yellow-100 text-yellow-800', 'D': 'bg-red-100 text-red-800'}[s] || 'bg-gray-100');
const getSeverityTextColor = (s) => ({'A': 'text-green-700', 'B': 'text-blue-700', 'C': 'text-yellow-700', 'D': 'text-red-700'}[s] || 'text-gray-700');

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const [groupsRes, rangesRes, rigidityRes] = await Promise.all([
      $supabase.from('iso_groups').select('*'),
      $supabase.from('vibration_ranges').select('*'),
      $supabase.from('rigidity_types').select('*')
    ]);
    if (groupsRes.error) throw groupsRes.error;
    if (rangesRes.error) throw rangesRes.error;
    if (rigidityRes.error) throw rigidityRes.error;
    isoGroups.value = groupsRes.data;
    vibrationRanges.value = rangesRes.data;
    rigidityTypes.value = rigidityRes.data;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.card { @apply bg-white shadow-md rounded-lg; }
.th-cell { @apply px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider; }
.td-cell { @apply px-4 py-4 whitespace-nowrap text-sm; }
</style>
