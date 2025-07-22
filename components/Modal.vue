<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Fondo oscuro (overlay) -->
      <div @click="close" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

      <!-- Contenedor para centrar el modal -->
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>-
     
      <div :class="['inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full', maxWidthClass]">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                <slot name="title">Título del Modal</slot>
              </h3>
              <div class="mt-4">
                <slot></slot>
              </div>
            </div>
          </div>
        </div>
        <!-- <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <slot name="footer">
            <button @click="close" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              Cerrar
            </button>
          </slot>
        </div> -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
 
  size: {
    type: String,
    default: 'lg', // Tamaño por defecto si no se especifica
  },
});

const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};

// Propiedad computada para determinar la clase de ancho máximo según la prop 'size'.
const maxWidthClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'sm:max-w-sm';
    case 'md': return 'sm:max-w-md';
    case 'lg': return 'sm:max-w-lg';
    case 'xl': return 'sm:max-w-xl';
    case '2xl': return 'sm:max-w-2xl';
    case '3xl': return 'sm:max-w-3xl';
    case '4xl': return 'sm:max-w-4xl';
    case '5xl': return 'sm:max-w-5xl';
    case '6xl': return 'sm:max-w-6xl';
    case '7xl': return 'sm:max-w-7xl';
    default: return 'sm:max-w-lg';
  }
});
</script>
