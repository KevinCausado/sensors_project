<template>
  <div v-if="profile" class="border border-gray-200 shadow-sm rounded-lg overflow-hidden">
    <div class="bg-gray-50 p-4">
      <h4 class="text-md font-bold text-primary-700">{{ profile.name }}</h4>
      <p v-if="profile.description" class="text-sm text-gray-500 mt-1">{{ profile.description }}</p>
    </div>
    
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="th-cell">Severidad</th>
            <th class="th-cell">Condición</th>
            <th class="th-cell">Rango ({{ profile.unit || 'mm/s' }})</th>
            <th class="th-cell">Rigidez Aplicable</th>
          </tr>
        </thead>
        <tbody class="bg-white">
          <tr v-if="sortedRanges.length === 0">
            <td colspan="4" class="td-cell text-center text-gray-500">No hay rangos definidos para este perfil.</td>
          </tr>
          <tr v-for="range in sortedRanges" :key="range.severity" class="border-b last:border-b-0">
            <td class="td-cell text-center">
              <span class="font-bold px-3 py-1 rounded-full text-xs" :class="getSeverityClass(range.severity)">
                ZONA {{ range.severity }}
              </span>
            </td>
            <td class="td-cell text-center font-medium" :class="getSeverityTextColor(range.severity)">
              {{ range.condition_name }}
            </td>
            <td class="td-cell text-center font-mono">
              {{ range.min_value }} - {{ range.max_value }}
            </td>
            <td class="td-cell text-center">
              {{ profile.rigidity_name }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  profile: {
    type: Object,
    default: null
  }
});

const sortedRanges = computed(() => {
    if (!props.profile || !props.profile.ranges) return [];
    return [...props.profile.ranges].sort((a, b) => a.severity.localeCompare(b.severity));
});

const getSeverityClass = (severity) => {
    const classes = {
        'A': 'bg-green-100 text-green-800', 
        'B': 'bg-blue-100 text-blue-800',
        'C': 'bg-yellow-100 text-yellow-800', 
        'D': 'bg-red-100 text-red-800',
    };
    return classes[severity] || 'bg-gray-100';
};

const getSeverityTextColor = (severity) => {
    const colors = {
        'A': 'text-green-700',
        'B': 'text-blue-700',
        'C': 'text-yellow-700',
        'D': 'text-red-700',
    };
    return colors[severity] || 'text-gray-700';
};
</script>

<style scoped>

.th-cell { @apply px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider; }
.td-cell { @apply px-3 py-3 whitespace-nowrap; }
</style>
