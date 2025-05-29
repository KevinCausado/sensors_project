<template>
  <div class="min-h-screen flex flex-col">
    <!-- <div v-if="authStore.isLoading" class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <p class="text-xl font-semibold text-gray-700 mr-4">Cargando aplicación...</p>
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div> -->

    <div v-if="authStore.loadingAuth" class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <p class="text-xl font-semibold text-gray-700 mr-4">Cerrando Sesión...</p>
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else>
      <AuthGuard>
        <AppHeader v-if="isAuthenticated" @toggle-sidebar="toggleSidebar" />
        <div class="flex flex-1">
          <AppSidebar v-if="isAuthenticated" :is-open="sidebarOpen" @toggle="toggleSidebar" />
          <main :class="{'lg:ml-64': isAuthenticated}" class="flex-1 bg-gray-50">
            <div class="page-container">
              <NuxtPage :key="$route.fullPath" /> 
            </div>
          </main>
        </div>
      </AuthGuard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRoute } from 'vue-router'; 

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);
const sidebarOpen = ref(true);

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const route = useRoute(); 
</script>

<style scoped>
/* Puedes añadir estilos adicionales aquí si tu spinner es más complejo */
/* Ejemplo para .page-container si necesitas ajustar el padding/margin */
.page-container {
  padding: 1rem; /* Ajusta según tus necesidades */
  margin-top: 4rem; /* Asumiendo que tu header tiene una altura fija */
  /* Asegúrate de que no haya conflicto con el ml-64 de main */
  min-height: calc(100vh - 4rem); /* Ajusta para que ocupe el resto del viewport */
}
</style>