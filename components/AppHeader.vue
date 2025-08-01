<template>
  <header class="bg-white shadow-sm flex-shrink-0">
    <div class="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
      <!-- Botón para abrir/cerrar sidebar en móvil -->
      <div class="flex items-center">
        <button @click="toggleSidebar" class="text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden">
          <Icon name="i-heroicons-bars-3" class="h-6 w-6" />
        </button>
      </div>

      <!-- Acciones del lado derecho (Notificaciones, Menú de Usuario) -->
      <div class="flex items-center space-x-4">
        <!-- CONTENEDOR DE NOTIFICACIONES -->
        <div class="relative notification-container">
          <button @click="toggleNotifications" class="p-1 text-gray-500 rounded-full hover:bg-gray-100 focus:outline-none relative">
            <Icon name="i-heroicons-bell" class="h-6 w-6" />
            <span v-if="unreadNotificationsCount > 0" class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center border-2 border-white animate-pulse">
              {{ unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount }}
            </span>
          </button>

          <!-- DROPDOWN DE NOTIFICACIONES -->
          <Transition name="fade-down">
            <div v-if="showNotifications" class="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl z-20 border border-gray-100">
              <div class="p-3 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-sm font-semibold text-gray-800">Notificaciones</h3>
                <p v-if="unreadNotificationsCount > 0" class="text-xs text-white bg-primary-600 font-semibold rounded-full px-2 py-0.5">{{ unreadNotificationsCount }} sin leer</p>
              </div>
              
              <div class="max-h-96 overflow-y-auto">
                <div v-if="alertStore.isLoading" class="p-4 text-center text-sm text-gray-500">Cargando...</div>
                <div v-else-if="recentAlerts.length === 0" class="p-8 text-center text-sm text-gray-500">
                  <Icon name="i-heroicons-check-circle" class="h-10 w-10 mx-auto text-gray-400"/>
                  <p class="mt-2">No tienes notificaciones.</p>
                </div>
                
                <ul v-else class="divide-y divide-gray-100">
                  <li v-for="alert in recentAlerts" :key="alert.id" class="hover:bg-gray-50/80 transition-colors">
                    <NuxtLink :to="alert.asset_id ? `/asset-status/${alert.asset_id}` : '/alerts'" @click="showNotifications = false" class="block p-3">
                      <div class="flex items-start">
                         <div :class="getAlertIconClass(alert.priority)" class="flex-shrink-0 rounded-full h-8 w-8 flex items-center justify-center mr-3">
                           <component :is="getAlertIcon(alert.type)" class="h-4 w-4" />
                         </div>
                        <div class="flex-1">
                          <p class="text-xs font-semibold text-gray-800 leading-tight">{{ alert.title }}</p>
                          <p class="text-xs text-gray-600 mt-0.5">
                            Activo: <span class="font-bold text-gray-800">{{ alert.assetName || 'N/A' }}</span>
                          </p>
                          <p class="text-xs text-gray-400 mt-1">{{ formatTimeAgo(alert.alert_time) }}</p>
                        </div>
                      </div>
                    </NuxtLink>
                  </li>
                </ul>
              </div>

              <div class="p-2 bg-gray-50 border-t border-gray-200">
                <NuxtLink to="/alerts" @click="showNotifications = false" class="block w-full text-center text-xs font-semibold text-primary-600 hover:text-primary-800 py-1">
                  Ver todas las alertas
                </NuxtLink>
              </div>
            </div>
          </Transition>
        </div>

        <!-- CONTENEDOR DE MENÚ DE USUARIO -->
        <div class="relative user-menu-container">
          <button @click="showUserMenu = !showUserMenu" class="flex items-center space-x-2 focus:outline-none p-1 rounded-full hover:bg-gray-100">
            <div class="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
              {{ userInitials }}
            </div>
            <span class="text-sm font-medium text-gray-700 hidden md:inline-block">
              {{ user?.firstName || authStore.user?.email }}
            </span>
            <Icon name="i-heroicons-chevron-down" class="h-4 w-4 text-gray-500 hidden md:inline-block" />
          </button>

          <Transition name="fade-down">
            <div v-if="showUserMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl z-20 py-1 border border-gray-100">
              <div class="px-4 py-2 border-b border-gray-100">
                <p class="text-sm font-medium text-gray-900 truncate">{{ user?.firstName }} {{ user?.lastName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
                <div class="mt-1">
                  <span class="text-xs rounded-full px-2 py-0.5" :class="getRoleBadgeClass(user?.role)">
                    {{ translateRole(user?.role) }}
                  </span>
                </div>
              </div>
              <NuxtLink to="/profile" @click="showUserMenu = false" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mi Perfil</NuxtLink>
              <div class="border-t border-gray-100 my-1"></div>
              <button @click="handleLogout" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                Cerrar sesión
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useAlertStore } from '~/stores/alerts';
import { useRouter } from 'vue-router';
import { ExclamationTriangleIcon, ExclamationCircleIcon, InformationCircleIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';


const emit = defineEmits(['toggle-sidebar']);

// Stores
const authStore = useAuthStore();
const alertStore = useAlertStore();
const router = useRouter();

// User data
const user = computed(() => authStore.userProfile);
const userInitials = computed(() => {
  if (!user.value || (!user.value.firstName && !user.value.lastName)) {
    return authStore.user?.email ? authStore.user.email.charAt(0).toUpperCase() : '?';
  }
  return `${user.value.firstName?.charAt(0) ?? ''}${user.value.lastName?.charAt(0) ?? ''}`.toUpperCase();
});

// Notifications
const recentAlerts = computed(() => alertStore.filteredAlerts.slice(0, 7)); // Muestra 7 para llenar más el espacio
const unreadNotificationsCount = computed(() => alertStore.alerts.filter(a => a.status === 'active').length);

// UI state
const showNotifications = ref(false);
const showUserMenu = ref(false);

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value) {
    showUserMenu.value = false; // Cierra el otro menú
  }
};

// Close menus when clicking outside
const handleClickOutside = (event) => {
  const target = event.target;
  if (!target.closest('.notification-container')) showNotifications.value = false;
  if (!target.closest('.user-menu-container')) showUserMenu.value = false;
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  if (alertStore.alerts.length === 0) {
    alertStore.fetchAlerts();
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Helper functions
const getRoleBadgeClass = (role) => {
  const roles = { 'super-admin': 'bg-blue-100 text-blue-700', 'technician': 'bg-green-100 text-green-700', 'viewer': 'bg-gray-100 text-gray-700' };
  return roles[role] || 'bg-gray-100 text-gray-700';
};

const translateRole = (role) => {
  const roles = { 'super-admin': 'Super Admin', 'technician': 'Técnico', 'viewer': 'Visualizador' };
  return roles[role] || role;
};

const getAlertIcon = (type) => {
  const icons = {
    threshold: ExclamationTriangleIcon, status_change: ArrowPathIcon,
    data_issue: ExclamationCircleIcon, connectivity: ExclamationCircleIcon,
  };
  return icons[type] || InformationCircleIcon;
};

const getAlertIconClass = (priority) => {
  const classes = {
    high: "bg-red-100 text-red-600", medium: "bg-yellow-100 text-yellow-600",
    low: "bg-green-100 text-green-600",
  };
  return classes[priority] || "bg-gray-100 text-gray-600";
};

const formatTimeAgo = (createdAt) => {
  if (!createdAt) return "Fecha desconocida";
  const date = new Date(createdAt);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const intervals = [
    { label: "año", seconds: 31536000 }, { label: "mes", seconds: 2592000 },
    { label: "día", seconds: 86400 }, { label: "hora", seconds: 3600 },
    { label: "minuto", seconds: 60 }, { label: "segundo", seconds: 1 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      if (interval.label === "segundo" && count < 5) return "hace un instante";
      const plural = count > 1 ? (interval.label === "mes" ? "es" : "s") : "";
      return `hace ${count} ${interval.label}${plural}`;
    }
  }
  return "justo ahora";
};

// Actions
const toggleSidebar = () => emit('toggle-sidebar');

const handleLogout = async () => {
  await authStore.signOut();
  showUserMenu.value = false;
  router.push('/auth/login');
};
</script>

<style scoped>
.fade-down-enter-active,
.fade-down-leave-active {
  transition: all 0.2s ease-out;
}
.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
