<template>
  <div>
    <h2 class="text-center text-2xl font-bold mb-8">Iniciar sesión</h2>
    
    <form @submit.prevent="login" class="space-y-6">
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
      
      <div>
        <label for="password" class="form-label">Contraseña</label>
        <input 
          id="password" 
          v-model="password" 
          type="password" 
          required 
          class="form-input" 
          placeholder="••••••••" />
      </div>
      
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <input 
            id="remember-me" 
            v-model="rememberMe"
            type="checkbox" 
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
          <label for="remember-me" class="ml-2 block text-sm text-gray-700">
            Recordarme
          </label>
        </div>
        
        <div class="text-sm">
          <NuxtLink to="/auth/forgot-password" class="font-medium text-primary-600 hover:text-primary-500">
            ¿Olvidaste tu contraseña?
          </NuxtLink>
        </div>
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
          <span v-else>Iniciar sesión</span>
        </button>
      </div>
    </form>
    
    <div class="mt-6 text-center text-sm">
      <span class="text-gray-600">¿No tienes una cuenta?</span>
      <NuxtLink to="/auth/register" class="font-medium text-primary-600 hover:text-primary-500 ml-1">
        Regístrate ahora
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRouter } from 'vue-router';
import { navigationItems } from '~/utils/navigation'; // Asegúrate de que esta ruta sea correcta y el archivo exista

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

    await authStore.login({
      email: email.value,
      password: password.value
    });

    // --- CORRECCIÓN CLAVE AQUÍ ---
    // Asegúrate de que el user ya esté en el store después de login.
    // Luego llama a `ensureUserProfileExists` con el ID del usuario.
    if (authStore.user) {
      await authStore.ensureUserProfileExists(authStore.user.id); 
    } else {
      throw new Error("No user found after successful login authentication.");
    }
    
    let redirectToPath = '/'; // Ruta por defecto si no se encuentra ningún módulo accesible

    // Itera sobre tus ítems de navegación para encontrar el primero accesible
    // Asegúrate de que tus navigationItems tengan moduleId y to
    for (const item of navigationItems) {
      // Si el ítem es un "padre" con hijos, podrías querer manejarlo diferente
      if (item.children && item.children.length > 0) {
        for (const childItem of item.children) {
          const moduleId = childItem.moduleId;
          const permissionAction = childItem.permissionAction || 'view'; // Asume 'view'
          if (childItem.to && authStore.can(moduleId + '.' + permissionAction)) { // Usar authStore.can
            redirectToPath = childItem.to;
            console.log(`[Login] User has permission for child module "${childItem.name}". Redirecting to: ${redirectToPath}`);
            break; // Salir del bucle interno
          }
        }
        if (redirectToPath !== '/') { // Si se encontró una ruta hija, salir del bucle principal
          break;
        }
      } else {
        // Ítems de navegación de nivel superior sin hijos
        const moduleId = item.moduleId;
        const permissionAction = item.permissionAction || 'view'; // Asume 'view'
        if (item.to && authStore.can(moduleId + '.' + permissionAction)) { // Usar authStore.can
          redirectToPath = item.to;
          console.log(`[Login] User has permission for module "${item.name}". Redirecting to: ${redirectToPath}`);
          break; // Salir del bucle
        }
      }
    }

    if (redirectToPath === '/') {
      // Si después de revisar todos los módulos, no hay ninguno accesible con permiso 'view',
      // redirige a una página de "acceso no autorizado" o a la página de inicio general.
      console.warn("[Login] No accessible module found with 'view' permission. Redirecting to default home or unauthorized page.");
      // redirectToPath = '/unauthorized'; // Una página específica para usuarios sin permisos
    }

    await navigateTo(redirectToPath, { replace: true });

  } catch (err) {
    console.error('Login error:', err); // Log detallado del error
    error.value = err.message || 'Error al iniciar sesión. Por favor, verifica tus credenciales.';
  } finally {
    loading.value = false;
  }
};
</script>