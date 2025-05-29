<template>
  <div class="card">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-gray-500 truncate">{{ title }}</p>
        <div class="mt-1 flex items-baseline">
          <p class="text-2xl font-semibold" :class="getValueColor(color)">
            {{ value }}
          </p>
          
          <p v-if="percentage !== null" class="ml-2 flex items-baseline text-sm font-semibold">
            <span :class="getTrendColor(trend)">
              <component :is="getTrendIcon(trend)" class="h-4 w-4 inline" />
              {{ percentage }}%
            </span>
          </p>
        </div>
      </div>
      
      <div :class="getIconBgColor(color)" class="p-3 rounded-full">
        <component :is="getIconComponent(icon)" :class="getIconColor(color)" class="h-5 w-5" />
      </div>
    </div>
    
    <div v-if="subtitle" class="mt-4">
      <p class="text-sm text-gray-500">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup>
// Placeholders for icons
const SensorIcon = defineComponent({
  render: () => h('div')
});
const AlertIcon = defineComponent({
  render: () => h('div')
});
const OrgIcon = defineComponent({
  render: () => h('div')
});
const UserIcon = defineComponent({
  render: () => h('div')
});
const TrendUpIcon = defineComponent({
  render: () => h('div')
});
const TrendDownIcon = defineComponent({
  render: () => h('div')
});
const TrendStableIcon = defineComponent({
  render: () => h('div')
});

// Props
const props = defineProps({
  title: {
    type: String,
    required: true
  },
 value: {
    // CAMBIO SUGERIDO: Permitir Number o String, y que sea opcional o tenga un valor por defecto
    type: [Number, String], 
    default: 0, // <--- Añade un valor por defecto de 0
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'success', 'warning', 'error'].includes(value)
  },
  trend: {
    type: String,
    default: null,
    validator: (value) => value === null || ['up', 'down', 'stable'].includes(value)
  },
  percentage: {
    type: Number,
    default: null
  },
  subtitle: {
    type: String,
    default: ''
  }
});

// Helper functions
const getIconComponent = (iconName) => {
  const iconMap = {
    'sensor': SensorIcon,
    'alert': AlertIcon,
    'org': OrgIcon,
    'user': UserIcon
  };
  
  return iconMap[iconName] || SensorIcon;
};

const getTrendIcon = (trend) => {
  if (trend === 'up') return TrendUpIcon;
  if (trend === 'down') return TrendDownIcon;
  return TrendStableIcon;
};

const getValueColor = (color) => {
  const colorMap = {
    'primary': 'text-primary-800',
    'secondary': 'text-secondary-800',
    'success': 'text-success-700',
    'warning': 'text-warning-700',
    'error': 'text-error-700'
  };
  
  return colorMap[color] || 'text-gray-900';
};

const getIconBgColor = (color) => {
  const colorMap = {
    'primary': 'bg-primary-100',
    'secondary': 'bg-secondary-100',
    'success': 'bg-success-100',
    'warning': 'bg-warning-100',
    'error': 'bg-error-100'
  };
  
  return colorMap[color] || 'bg-gray-100';
};

const getIconColor = (color) => {
  const colorMap = {
    'primary': 'text-primary-700',
    'secondary': 'text-secondary-700',
    'success': 'text-success-700',
    'warning': 'text-warning-700',
    'error': 'text-error-700'
  };
  
  return colorMap[color] || 'text-gray-700';
};

const getTrendColor = (trend) => {
  if (trend === 'up') return 'text-success-600';
  if (trend === 'down') return 'text-error-600';
  return 'text-gray-500';
};
</script>