<template>
  <NuxtLink 
    :to="to" 
    class="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
    :class="isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'">
    
    <!-- Usa el componente <Icon> directamente. El prop 'name' recibe la cadena formateada (ej: "heroicons:home") -->
    <Icon 
      :name="icon" 
      class="mr-3 h-5 w-5 flex-shrink-0" 
      :class="isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'" 
    />
    
    {{ label }}
    
    <!-- Para el icono de ChevronRight, también usamos el componente <Icon> -->
    <Icon 
      v-if="hasChildren" 
      name="heroicons:chevron-right" 
      class="ml-auto h-4 w-4 transition-transform"
      :class="isActive ? 'transform rotate-90' : ''" 
    />
  </NuxtLink>
</template>

<script setup>
// No necesitas importar 'computed', 'h', 'defineComponent' aquí,
// ya que el componente <Icon> de @nuxt/icon se encarga de la renderización.

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
    // Este prop 'icon' ahora espera el formato "coleccion:nombre-del-icono"
    // (ej: "heroicons:home", "heroicons:bell") que viene desde AppSidebar.vue.
    type: String,
    required: true 
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
</script>

<style scoped>
/* Tus estilos existentes están bien aquí. */
</style>
