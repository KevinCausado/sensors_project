<script setup>
import { useAuthStore } from '~/stores/auth';
import { useRouter } from 'vue-router';
import { onMounted, watch } from 'vue';

const authStore = useAuthStore();
const router = useRouter();

// Función para manejar la redirección
const handleRedirect = () => {
  // Asegurarse de que el proceso de checkAuth haya terminado
  if (!authStore.isLoading) {
    if (authStore.isAuthenticated) {
      console.log('[pages/index.vue] Authenticated, redirecting to /dashboard');
      router.replace('/dashboard');
    } else {
      console.log('[pages/index.vue] Not authenticated, redirecting to /auth/login');
      router.replace('/auth/login');
    }
  }
};

// Observar cuando isLoading cambia a false
watch(() => authStore.isLoading, (newVal) => {
  if (newVal === false) {
    handleRedirect();
  }
}, { immediate: true }); // Ejecutar inmediatamente para el caso inicial si isLoading ya es false

// Si por alguna razón (ej. recarga rápida), el store ya está listo
// y isLoading es false, la redirección se manejará de inmediato.
onMounted(() => {
  // Si en el montaje isLoading ya es false, significa que checkAuth ya terminó.
  // Esto es un respaldo para asegurar la redirección si el watchEffect no la dispara a tiempo.
  if (!authStore.isLoading) {
    handleRedirect();
  }
});

// Este componente no necesita mostrar nada si el layout ya muestra el cargador
// Y la redirección es casi instantánea una vez que isLoading es false.
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <p class="text-gray-600">Procesando autenticación...</p>
    </div>
</template>