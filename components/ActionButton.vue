<template>
  <button 
    :class="[
      'p-2 rounded-full transition-colors duration-200',
      colorClasses[color],
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
    ]"
    v-bind="$attrs"
    :disabled="disabled"
    ref="buttonRef">
    <component :is="icon" class="w-5 h-5" />
  </button>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChartBarIcon
} from '@heroicons/vue/24/outline';

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  tooltip: {
    type: String,
    required: true
  },
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

const buttonRef = ref(null);

const icons = {
  'eye': EyeIcon,
  'pencil': PencilIcon,
  'trash': TrashIcon,
  'plus': PlusIcon,
  'check': CheckIcon,
  'x-mark': XMarkIcon,
  'download': ArrowDownTrayIcon,
  'refresh': ArrowPathIcon,
  'chart': ChartBarIcon
};

const colorClasses = {
  primary: 'text-primary-600 hover:bg-primary-50',
  success: 'text-success-600 hover:bg-success-50',
  warning: 'text-warning-600 hover:bg-warning-50',
  error: 'text-error-600 hover:bg-error-50',
  gray: 'text-gray-600 hover:bg-gray-50'
};

const icon = computed(() => icons[props.icon]);

onMounted(() => {
  tippy(buttonRef.value, {
    content: props.tooltip,
    placement: 'top'
  });
});
</script>