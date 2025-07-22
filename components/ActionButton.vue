<template>
  <button 
    :class="[
      'p-2 rounded-full transition-colors duration-200',
      colorClasses[color],
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
    ]"
    v-bind="$attrs"
    :disabled="disabled"
  >
    <!-- El `ref` ya no es necesario -->
    <component v-if="iconComponent" :is="iconComponent" class="w-5 h-5" />
  </button>
</template>

<script setup>
import { computed } from 'vue';

// Se han importado todos los íconos que usas en tu aplicación.
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChartBarIcon,
  PaperAirplaneIcon 
} from '@heroicons/vue/24/outline';

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  // Se eliminó el prop 'tooltip'.
  color: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'success', 'warning', 'error', 'gray'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

// El mapa de íconos para resolver el string del prop.
const icons = {
  'eye': EyeIcon,
  'pencil': PencilIcon,
  'trash': TrashIcon,
  'plus': PlusIcon,
  'check': CheckIcon,
  'x-mark': XMarkIcon,
  'download': ArrowDownTrayIcon,
  'refresh': ArrowPathIcon,
  'chart': ChartBarIcon,
  'paper-airplane': PaperAirplaneIcon
};

const colorClasses = {
  primary: 'text-primary-600 hover:bg-primary-50',
  success: 'text-success-600 hover:bg-success-50',
  warning: 'text-warning-600 hover:bg-warning-50',
  error: 'text-error-600 hover:bg-error-50',
  gray: 'text-gray-600 hover:bg-gray-50'
};

// Resuelve el componente de ícono a partir del prop 'icon'.
const iconComponent = computed(() => icons[props.icon]);

// Se eliminó por completo el hook onMounted y toda la lógica de Tippy.js.
</script>