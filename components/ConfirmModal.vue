<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="$emit('cancel')"></div>

      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div class="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-error-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationIcon class="w-6 h-6 text-error-600" />
            </div>
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 class="text-lg font-medium leading-6 text-gray-900">
                {{ title }}
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500">
                  {{ message }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
          <button 
            type="button"
            class="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-error-600 border border-transparent rounded-md shadow-sm hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error-500 sm:ml-3 sm:w-auto sm:text-sm"
            @click="$emit('confirm')">
            Eliminar
          </button>
          <button 
            type="button"
            class="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            @click="$emit('cancel')">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Icons (placeholder)
const ExclamationIcon = defineComponent({
  render: () => h('div')
});

defineProps({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  }
});

defineEmits(['confirm', 'cancel']);
</script>