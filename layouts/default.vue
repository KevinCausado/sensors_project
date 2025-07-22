<template> 
  <div class="h-screen flex flex-col bg-gray-50 font-inter text-xs">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <div v-if="authStore.loadingAuth" class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <p class="text-xl font-semibold text-gray-700 mr-4">Cerrando Sesión...</p>
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else class="flex flex-col flex-1">
      <AuthGuard>
        <AppHeader v-if="isAuthenticated" @toggle-sidebar="toggleSidebar" />
        <div class="flex flex-1 flex-col md:flex-row">
          <AppSidebar v-if="isAuthenticated" :is-open="sidebarOpen" :is-desktop="isDesktop" @toggle="toggleSidebar" />
          <div v-if="isAuthenticated && sidebarOpen && !isDesktop"
               @click="toggleSidebar"
               class="fixed inset-0 bg-black opacity-50 z-30 md:hidden">
          </div>
         
          <main class="flex-1 bg-gray-50 overflow-x-hidden overflow-y-auto pt-16 md:pt-0">
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
