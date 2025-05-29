<template>
  <div>
    <h2 class="text-center text-2xl font-bold mb-8">Recuperar Contraseña</h2>
    
    <div v-if="emailSent" class="text-center">
      <div class="mb-6">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success-100">
          <CheckIcon class="h-6 w-6 text-success-600" />
        </div>
        <h3 class="mt-3 text-lg font-medium text-gray-900">Correo enviado</h3>
        <p class="mt-2 text-sm text-gray-500">
          Hemos enviado las instrucciones para restablecer tu contraseña a {{ email }}
        </p>
      </div>
      
      <div class="mt-6">
        <NuxtLink to="/auth/login" class="btn btn-primary w-full">
          Volver a Inicio de Sesión
        </NuxtLink>
      </div>
    </div>
    
    <form v-else @submit.prevent="sendResetEmail" class="space-y-6">
      <div>
        <label for="email" class="form-label">Correo electrónico</label>
        <input 
          id="email" 
          v-model="email" 
          type="email" 
          required 
          class="form-input" 
          placeholder="correo@ejemplo.com" />
        <p class="mt-2 text-sm text-gray-500">
          Ingresa el correo electrónico asociado a tu cuenta y te enviaremos las instrucciones para restablecer tu contraseña.
        </p>
      </div>
      
      <div v-if="error" class="text-error-600 text-sm mt-1">
        {{ error }}
      </div>
      
      <div>
        <button 
          type="submit" 
          class="btn btn-primary w-full flex justify-center"
          :disabled="loading">
          <span v-if="loading">Enviando...</span>
          <span v-else>Enviar instrucciones</span>
        </button>
      </div>
      
      <div class="text-center">
        <NuxtLink to="/auth/login" class="text-sm text-primary-600 hover:text-primary-500">
          Volver a Inicio de Sesión
        </NuxtLink>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';

// Icons (placeholder)
const CheckIcon = defineComponent({
  render: () => h('div')
});

definePageMeta({
  layout: 'auth'
});

const authStore = useAuthStore();

// Estado
const email = ref('');
const error = ref('');
const loading = ref(false);
const emailSent = ref(false);

// Enviar correo de recuperación
const sendResetEmail = async () => {
  try {
    loading.value = true;
    error.value = '';
    
    // Simular envío de correo
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    emailSent.value = true;
  } catch (err) {
    error.value = 'No se pudo enviar el correo. Por favor, inténtalo de nuevo.';
  } finally {
    loading.value = false;
  }
};
</script>