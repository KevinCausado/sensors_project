<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organización</th>
          <th scope="col" class="relative px-6 py-3">
            <span class="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="loading">
          <td colspan="6" class="px-6 py-4 whitespace-nowrap text-center text-gray-500">Cargando sensores...</td>
        </tr>
        <tr v-else-if="sensors.length === 0">
          <td colspan="6" class="px-6 py-4 whitespace-nowrap text-center text-gray-500">No se encontraron sensores.</td>
        </tr>
        <tr v-else v-for="sensor in sensors" :key="sensor.id">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ sensor.name }}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ translateSensorType(sensor.type) }}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span :class="getStatusClass(sensor.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
              {{ translateStatus(sensor.status) }}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ sensor.location }}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ sensor.organizationName }}</td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div class="flex items-center justify-end gap-2">
              <button @click="$emit('view', sensor.id)" class="text-primary-600 hover:text-primary-900 flex items-center">
                <EyeIcon class="h-5 w-5" />
              </button>
              
              <button 
                v-if="canEdit" 
                @click="$emit('edit', sensor.id)" 
                class="text-info-600 hover:text-info-900 flex items-center ml-2">
                <PencilIcon class="h-5 w-5" />
              </button>

              <button 
                v-if="canDelete" 
                @click="$emit('delete', sensor)" 
                class="text-error-600 hover:text-error-900 flex items-center ml-2">
                <TrashIcon class="h-5 w-5" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { defineComponent, h } from 'vue';
// Importa los iconos que usa esta tabla
import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'; // O '/24/solid'

const props = defineProps({
  sensors: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  canEdit: { // NUEVA PROP
    type: Boolean,
    default: false,
  },
  canDelete: { // NUEVA PROP
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['view', 'edit', 'delete']);

// Métodos de traducción (los mismos que tenías en index.vue si los compartes)
const translateSensorType = (type) => {
  const types = {
    'temperature': 'Temperatura', 'humidity': 'Humedad', 'pressure': 'Presión',
    'level': 'Nivel', 'power': 'Energía', 'air-quality': 'Calidad del Aire'
  };
  return types[type] || type;
};

const translateStatus = (status) => {
  const statuses = {
    'active': 'Activo', 'inactive': 'Inactivo', 'maintenance': 'Mantenimiento', 'error': 'Error'
  };
  return statuses[status] || status;
};

const getStatusClass = (status) => {
  switch (status) {
    case 'active': return 'bg-success-100 text-success-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    case 'maintenance': return 'bg-warning-100 text-warning-800';
    case 'error': return 'bg-error-100 text-error-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
</script>