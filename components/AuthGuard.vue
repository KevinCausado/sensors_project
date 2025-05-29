<template>
  <div>
    <slot v-if="isAuthenticated" />
    <div v-else class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-gray-700">Por favor, espera...</h2>
        <p class="text-gray-500 mt-2">Verificando el estado de autenticación</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeMount } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const isAuthenticated = computed(() => authStore.isAuthenticated);

onBeforeMount(async () => {
  await authStore.checkAuth();
  
  // Si no está autenticado y la ruta actual no es una página de autenticación, redirige al login
  if (!isAuthenticated.value && !route.path.includes('/auth/')) {
    router.push('/auth/login');
  }
});
</script>