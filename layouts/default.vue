<template>
  <!-- Contenedor principal de la aplicación: asegura que ocupa la altura completa de la vista y usa flexbox para el diseño -->
  <!-- Mantengo 'text-xs' para la fuente base como lo último que definimos -->
  <div class="min-h-screen flex flex-col bg-gray-50 font-inter text-xs">
    <!-- Carga la fuente Inter (asegúrate de que también esté en nuxt.config.js si es global) -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Spinners de carga/sesión (mantener el comportamiento fijo) -->
    <div v-if="authStore.loadingAuth" class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <!-- Mantengo 'text-xl' para el spinner para que sea visible, pero puedes ajustarlo si lo deseas -->
      <p class="text-xl font-semibold text-gray-700 mr-4">Cerrando Sesión...</p>
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else class="flex flex-col flex-1">
      <AuthGuard>
        <!-- AppHeader: Se asume que es un componente fijo en la parte superior,
             y podría tener un botón de hamburguesa para alternar la barra lateral en móvil. -->
        <AppHeader v-if="isAuthenticated" @toggle-sidebar="toggleSidebar" />

        <!-- Contenedor principal del layout: Barra lateral + Contenido principal -->
        <!-- `flex-col md:flex-row`: Se apila verticalmente en móvil, se organiza en fila en md (escritorio). -->
        <div class="flex flex-1 flex-col md:flex-row">
          <!-- AppSidebar:
               Passed `isDesktop` prop so it can decide its positioning behavior.
          -->
          <AppSidebar v-if="isAuthenticated" :is-open="sidebarOpen" :is-desktop="isDesktop" @toggle="toggleSidebar" />

          <!-- Overlay for when mobile sidebar is open -->
          <!-- Click outside the sidebar to close it on mobile -->
          <div v-if="isAuthenticated && sidebarOpen && !isDesktop"
               @click="toggleSidebar"
               class="fixed inset-0 bg-black opacity-50 z-30 md:hidden">
          </div>

          <!-- Área de Contenido Principal:
               - `flex-1`: Hace que ocupe todo el espacio horizontal restante.
               - `overflow-x-hidden`: Previene el desplazamiento horizontal global en este contenedor si un hijo se desborda.
               - `pt-16 md:pt-0`: Relleno superior para compensar la altura fija de AppHeader en móvil.
                                 Ajusta 'pt-16' a la altura real de tu AppHeader en móvil.
          -->
          <main class="flex-1 bg-gray-50 overflow-x-hidden pt-16 md:pt-0">
            <!-- page-container: Usa clases de Tailwind para padding y centrado. -->
            <!-- CAMBIO AQUÍ: Eliminamos 'max-w-*' y ajustamos el padding horizontal a tu preferencia -->
            <!-- 'w-full' asegura que ocupe todo el ancho disponible del main -->
            <!-- 'mx-auto' ya no es tan relevante sin 'max-w-*' pero se puede mantener si quieres un centrado vertical -->
            <div class="w-full mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <NuxtPage :key="$route.fullPath" />
            </div>
          </main>
        </div>
      </AuthGuard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRoute } from 'vue-router';
import AppHeader from '~/components/AppHeader.vue';
import AppSidebar from '~/components/AppSidebar.vue';
import AuthGuard from '~/components/AuthGuard.vue';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);
const sidebarOpen = ref(false); // Sidebar closed by default on mobile

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const route = useRoute();

// Logic to detect screen size
const isDesktop = ref(true); // Assume desktop by default for SSR/initial load

const checkScreenSize = () => {
  isDesktop.value = window.innerWidth >= 768; // Tailwind's 'md' breakpoint
  if (isDesktop.value) {
    sidebarOpen.value = true; // Sidebar open by default on desktop
  } else {
    // If we transition to mobile, ensure it's closed so it doesn't "pop up"
    sidebarOpen.value = false;
  }
};

onMounted(() => {
  checkScreenSize(); // Check size on mount
  window.addEventListener('resize', checkScreenSize); // Listen for resize changes
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize); // Clean up listener
});
</script>

<style scoped>
/* No specific scoped styles for .page-container here.
   Tailwind classes are used directly in the template. */
</style>
