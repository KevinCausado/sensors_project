<template>
  <NuxtLink 
    :to="to" 
    class="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
    :class="isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'">
    <component 
      :is="resolveIcon" 
      class="mr-3 h-5 w-5 flex-shrink-0" 
      :class="isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'" />
    {{ label }}
    <ChevronRight v-if="hasChildren" class="ml-auto h-4 w-4 transition-transform"
          :class="isActive ? 'transform rotate-90' : ''" />
  </NuxtLink>
</template>

<script setup>
import { computed } from 'vue';

// Placeholder for icons
const HomeIcon = defineComponent({
  render: () => h('div')
});
const ChartIcon = defineComponent({
  render: () => h('div')
});
const CogIcon = defineComponent({
  render: () => h('div')
});
const ChevronRight = defineComponent({
  render: () => h('div')
});
const UsersIcon = defineComponent({
  render: () => h('div')
});
const ChipIcon = defineComponent({
  render: () => h('div')
});
const BellIcon = defineComponent({
  render: () => h('div')
});
const BuildingIcon = defineComponent({
  render: () => h('div')
});

// Props
const props = defineProps({
  to: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  hasChildren: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

// Map icon names to components
const resolveIcon = computed(() => {
  const iconMap = {
    'HomeIcon': HomeIcon,
    'ChartIcon': ChartIcon,
    'CogIcon': CogIcon,
    'UsersIcon': UsersIcon,
    'ChipIcon': ChipIcon,
    'BellIcon': BellIcon,
    'BuildingIcon': BuildingIcon
  };
  
  return iconMap[props.icon] || HomeIcon;
});
</script>