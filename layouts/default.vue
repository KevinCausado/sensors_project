<template> 
  <!-- CAMBIO: Fondo cambiado a 'bg-white' para un look más limpio y moderno -->
  <div class="h-screen flex flex-col bg-white font-inter text-sm">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Indicador de carga -->
    <div v-if="authStore.loadingAuth" class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <p class="text-xl font-semibold text-gray-700 mr-4">Cerrando Sesión...</p>
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>

    <!-- Contenido principal -->
    <div v-else class="flex-1 flex flex-col">
      <AuthGuard>
        
        <div class="flex flex-row flex-1 h-full overflow-hidden">
          <!-- Sidebar -->
          <AppSidebar v-if="isAuthenticated" :is-open="sidebarOpen" :is-desktop="isDesktop" @toggle="toggleSidebar" />     
         
          <div v-if="isAuthenticated && sidebarOpen && !isDesktop"
               @click="toggleSidebar"
               class="fixed inset-0 bg-black opacity-50 z-30 md:hidden">
          </div>       
         
          <div class="flex flex-col flex-1 min-w-0">
            <AppHeader v-if="isAuthenticated" @toggle-sidebar="toggleSidebar" />
            
            <main class="flex-1 overflow-y-auto bg-gray-50/60">
              <!-- CAMBIO: Se añade un fondo sutil al área de contenido principal para diferenciarla del fondo general -->
              <div class="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Breadcrumbs v-if="isAuthenticated" />
                <NuxtPage :key="$route.fullPath" />
              </div>
            </main>
          </div>
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
import Breadcrumbs from '~/components/Breadcrumbs.vue'; 

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);
const sidebarOpen = ref(false);

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const route = useRoute();
const isDesktop = ref(true);

const checkScreenSize = () => {
  isDesktop.value = window.innerWidth >= 768;
  if (isDesktop.value) {
    sidebarOpen.value = true;
  } else {
    sidebarOpen.value = false;
  }
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});
</script>
