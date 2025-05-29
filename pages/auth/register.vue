<template>
  <div>
    <h2 class="text-center text-2xl font-bold mb-8">Crear una nueva cuenta</h2>
    
    <form @submit.prevent="register" class="space-y-6">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label for="first-name" class="form-label">Nombre</label>
          <input 
            id="first-name" 
            v-model="firstName" 
            type="text" 
            required 
            class="form-input" />
        </div>
        
        <div>
          <label for="last-name" class="form-label">Apellido</label>
          <input 
            id="last-name" 
            v-model="lastName" 
            type="text" 
            required 
            class="form-input" />
        </div>
      </div>
      
      <div>
        <label for="email" class="form-label">Correo electrónico</label>
        <input 
          id="email" 
          v-model="email" 
          type="email" 
          required 
          class="form-input" 
          placeholder="correo@ejemplo.com" />
      </div>
      
      <!-- <div>
        <label for="organization" class="form-label">Organización</label>
        <input 
          id="organization" 
          v-model="organization" 
          type="text" 
          required 
          class="form-input" />
      </div> -->
      
      <div>
        <label for="password" class="form-label">Contraseña</label>
        <input 
          id="password" 
          v-model="password" 
          type="password" 
          required 
          class="form-input"
          placeholder="••••••••" />
        <p class="mt-1 text-sm text-gray-500">Debe tener al menos 8 caracteres</p>
      </div>
      
      <div>
        <label for="password-confirm" class="form-label">Confirmar contraseña</label>
        <input 
          id="password-confirm" 
          v-model="passwordConfirm" 
          type="password" 
          required 
          class="form-input"
          placeholder="••••••••" />
      </div>
      
      <div v-if="error" class="text-error-600 text-sm mt-1">
        {{ error }}
      </div>
      
      <div>
        <button 
          type="submit" 
          class="btn btn-primary w-full flex justify-center"
          :disabled="loading">
          <span v-if="loading">Procesando...</span>
          <span v-else>Registrarse</span>
        </button>
      </div>
    </form>
    
    <div class="mt-6 text-center text-sm">
      <span class="text-gray-600">¿Ya tienes una cuenta?</span>
      <NuxtLink to="/auth/login" class="font-medium text-primary-600 hover:text-primary-500 ml-1">
        Iniciar sesión
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: 'auth'
});

const authStore = useAuthStore();
const router = useRouter();

// Form data
const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const passwordConfirm = ref('');
const organization = ref('');
const error = ref('');
const loading = ref(false);

// Register function
const register = async () => {
  try {
    // Validate passwords match
    if (password.value !== passwordConfirm.value) {
      error.value = 'Las contraseñas no coinciden';
      return;
    }
    
    // Validate password strength
    if (password.value.length < 8) {
      error.value = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }
    
    loading.value = true;
    error.value = '';
    
    await authStore.register({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      password: password.value,
      organization: organization.value
    });
    
    router.push('/');
  } catch (err) {
    error.value = err.message || 'Error al registrarse. Por favor, inténtalo de nuevo.';
  } finally {
    loading.value = false;
  }
};
</script>