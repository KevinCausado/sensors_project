<template>
  <!-- Main app container: ensures it takes full viewport height and uses flexbox for layout -->
  <div class="min-h-screen flex flex-col bg-gray-50 font-inter">
    <!-- Load Inter font (ensure it's also in nuxt.config.js if global) -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Loading/Session spinners (maintain fixed behavior) -->
    <div v-if="authStore.loadingAuth" class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <p class="text-xl font-semibold text-gray-700 mr-4">Cerrando Sesión...</p>
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else class="flex flex-col flex-1">
      <AuthGuard>
        <!-- AppHeader: Assumes it's a fixed component at the top,
             and might have a hamburger button to toggleSidebar on mobile. -->
        <AppHeader v-if="isAuthenticated" @toggle-sidebar="toggleSidebar" />

        <!-- Main layout container: Sidebar + Main Content -->
        <!-- `flex-col md:flex-row`: Stacks vertically on mobile, arranges in a row on md (desktop). -->
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

          <!-- Main Content Area:
               - `flex-1`: Makes it take all remaining horizontal space.
               - `overflow-x-hidden`: Prevents global horizontal scroll on this container if a child overflows.
               - `pt-16 md:pt-0`: Top padding to compensate for fixed AppHeader height on mobile.
                                 Adjust 'pt-16' to your AppHeader's actual height on mobile.
          -->
          <main class="flex-1 bg-gray-50 overflow-x-hidden pt-16 md:pt-0">
            <!-- page-container: Uses Tailwind classes for padding, max-width and centering. -->
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
