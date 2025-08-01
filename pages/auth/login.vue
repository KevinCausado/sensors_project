<template> 
  <div>
    <div class="mb-10">
      <h2 class="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
      <p class="mt-2 text-sm text-gray-600">
        ¿Eres nuevo? 
        <NuxtLink to="/auth/register" class="font-medium text-blue-600 hover:text-blue-500">
          Crea una cuenta
        </NuxtLink>
      </p>
    </div>
    
    <form @submit.prevent="login" class="space-y-6">
      <div>
        <label for="email" class="block text-xs font-bold uppercase text-gray-600 mb-2">Correo electrónico</label>
        <input 
          id="email" 
          v-model="email" 
          type="email" 
          required 
          class="block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          placeholder="Email" />
      </div>
      
      <div>
        <label for="password" class="block text-xs font-bold uppercase text-gray-600 mb-2">Contraseña</label>
        <input 
          id="password" 
          v-model="password" 
          type="password" 
          required 
          class="block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" 
          placeholder="Password" />
      </div>
      
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center">
          <input 
            id="remember-me" 
            v-model="rememberMe"
            type="checkbox" 
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
          <label for="remember-me" class="ml-2 block text-gray-700">
            Recordarme
          </label>
        </div>
        
        <div>
          <NuxtLink to="/auth/forgot-password" class="font-medium text-blue-600 hover:text-blue-500">
            ¿Olvidaste tu contraseña?
          </NuxtLink>
        </div>
      </div>
      
      <div v-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-sm">
        {{ error }}
      </div>
      
      <div>
        <button 
          type="submit" 
          class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading">
          <div v-if="loading" class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span v-else>Iniciar Sesión</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRouter } from 'vue-router';
import { navigationItems } from '~/utils/navigation';

definePageMeta({
  layout: 'auth'
});

const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const error = ref('');
const loading = ref(false);

const login = async () => {
  try {
    loading.value = true;
    error.value = '';

    await authStore.signIn({
      email: email.value,
      password: password.value
    });

    if (authStore.user) {
      await authStore.ensureUserProfileExists(authStore.user.id);
    } else {
      throw new Error("No se encontró usuario después de una autenticación exitosa.");
    }

    let redirectToPath = '/'; 

    for (const item of navigationItems) {
      if (item.children && item.children.length > 0) {
        for (const childItem of item.children) {
          const moduleId = childItem.moduleId;
          const permissionAction = childItem.permissionAction || 'view';
          if (childItem.to && authStore.can(moduleId + '.' + permissionAction)) {
            redirectToPath = childItem.to;
            break; 
          }
        }
        if (redirectToPath !== '/') {
          break;
        }
      } else {
        const moduleId = item.moduleId;
        const permissionAction = item.permissionAction || 'view';
        if (item.to && authStore.can(moduleId + '.' + permissionAction)) {
          redirectToPath = item.to;
          break;
        }
      }
    }

    if (redirectToPath === '/') {
      console.warn("[Login] No se encontró ningún módulo accesible con permiso de 'view'. Redirigiendo a la página de inicio.");
    }

    await navigateTo(redirectToPath, { replace: true });

  } catch (err) {
    console.error('Error de login:', err);
    error.value = authStore.error || err.message || 'Error al iniciar sesión. Por favor, verifica tus credenciales.';
  } finally {
    loading.value = false;
  }
};
</script>
