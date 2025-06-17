<template>
  <div>
    <!-- Muestra el contenido del slot SOLAMENTE si está autenticado Y la verificación ha terminado -->
    <slot v-if="isAuthenticated && !checkingAuth" />

    <!-- Muestra el mensaje de carga SOLAMENTE si la verificación AÚN está en progreso -->
    <div v-else-if="checkingAuth" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-gray-700">Por favor, espera...</h2>
        <p class="text-gray-500 mt-2">Verificando el estado de autenticación</p>
      </div>
    </div>
    
    <!-- Si no está autenticado Y la verificación terminó Y no es una página de autenticación, la redirección ya ocurrió -->
    <!-- Este 'else' implícito manejará el caso de que la verificación terminó y no está autenticado,
         y la ruta no era de auth, por lo que ya se redirigió y no hay nada que mostrar aquí. -->
  </div>
</template>

<script setup>
import { ref, computed, onBeforeMount } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const isAuthenticated = computed(() => authStore.isAuthenticated);
const checkingAuth = ref(true); // Nuevo estado para controlar si la verificación está en curso

onBeforeMount(async () => {
  checkingAuth.value = true; // Iniciar la verificación
  await authStore.checkAuth();
  checkingAuth.value = false; // Finalizar la verificación
  
  // Si no está autenticado y la ruta actual no es una página de autenticación, redirige al login
  if (!isAuthenticated.value && !route.path.includes('/auth/')) {
    router.push('/auth/login');
  }
});
</script>

