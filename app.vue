<template>
  <div class="min-h-screen">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
// No necesitamos 'useRouter' aquí para la redirección inicial,
// ya que el middleware de Nuxt.js se encarga de eso.

const authStore = useAuthStore();

// Verificar autenticación al cargar la aplicación
onMounted(async () => {
  // Esta llamada a checkAuth() es crucial. Le dice a Pinia que sincronice
  // su estado 'user' con la sesión de Supabase (que puede estar en localStorage).
  await authStore.checkAuth();
  
  // ¡No necesitamos la lógica de redirección aquí!
  // El middleware 'auth.js' en la carpeta 'middleware/' de Nuxt.js
  // (que definimos y aplicamos a nuestras páginas) se encargará de:
  // - Redirigir a '/login' si no hay sesión y se intenta acceder a una ruta protegida.
  // - Redirigir a '/' si ya hay sesión y se intenta acceder a '/login' o '/signup'.
});
</script>