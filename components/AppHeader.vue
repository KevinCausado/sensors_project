<template>
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
      <div class="flex items-center">
        <button
          @click="toggleSidebar"
          class="text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden">
          <MenuIcon class="h-6 w-6" />
        </button>
        <div class="ml-4 lg:ml-0">
          <h1 class="text-xl font-semibold text-gray-900">Menu Principal</h1>
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <div class="relative notification-container">
          <button
            @click="showNotifications = !showNotifications"
            class="p-1 text-gray-500 focus:outline-none relative">
            <BellIcon class="h-6 w-6" />
            <span v-if="unreadNotifications > 0"
                  class="absolute top-0 right-0 h-4 w-4 rounded-full bg-error-500 text-white text-xs flex items-center justify-center">
              {{ unreadNotifications }}
            </span>
          </button>

          <div v-if="showNotifications"
               class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10 overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-200">
              <h3 class="text-sm font-semibold">Notificaciones</h3>
            </div>
            <div class="max-h-64 overflow-y-auto">
              <div v-if="notifications.length === 0" class="px-4 py-3 text-sm text-gray-500">
                No hay notificaciones
              </div>
              <a v-for="notification in notifications"
                 :key="notification.id"
                 href="#"
                 class="block px-4 py-3 hover:bg-gray-50 transition duration-150 border-b border-gray-100">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <div :class="getNotificationIconClass(notification.type)"
                          class="h-8 w-8 rounded-full flex items-center justify-center">
                      <component :is="getNotificationIcon(notification.type)" class="h-4 w-4" />
                    </div>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium"
                       :class="notification.read ? 'text-gray-700' : 'text-gray-900'">
                      {{ notification.title }}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ notification.message }}
                    </p>
                    <p class="text-xs text-gray-400 mt-1">
                      {{ formatTimeAgo(notification.timestamp) }}
                    </p>
                  </div>
                </div>
              </a>
            </div>
            <div class="px-4 py-2 border-t border-gray-200">
              <button class="text-xs text-primary-600 hover:text-primary-500">
                Marcar todo como leído
              </button>
            </div>
          </div>
        </div>

        <div class="relative user-menu-container">
          <button
            @click="showUserMenu = !showUserMenu"
            class="flex items-center space-x-2 focus:outline-none">
            <div class="flex items-center space-x-2">
              <div class="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm">
                {{ userInitials }}
              </div>
              <span class="text-sm font-medium text-gray-700 hidden md:inline-block">
                {{ user?.firstName || authStore.user?.email }}
              </span>
            </div>
            <ChevronDownIcon class="h-4 w-4 text-gray-500" />
          </button>

          <div v-if="showUserMenu"
               class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1">
            <div class="px-4 py-2 border-b border-gray-100">
              <p class="text-sm font-medium text-gray-900">{{ user?.firstName }} {{ user?.lastName }}</p>
              <p class="text-xs text-gray-500">{{ authStore.user?.email }}</p>
              <div class="mt-1">
                <span class="text-xs rounded-full px-2 py-0.5"
                      :class="getRoleBadgeClass(user?.role)">
                  {{ translateRole(user?.role) }}
                </span>
              </div>
            </div>
            <NuxtLink
              to="/profile"
              class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              Mi Perfil
            </NuxtLink>
            <div class="border-t border-gray-100 my-1"></div>
            <button
              @click="handleLogout"
              class="block w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-gray-100">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useNotificationStore } from '~/stores/notifications';
import { useRouter } from 'vue-router';

// Icons (placeholders) - Asegúrate de que estos imports sean correctos o estén definidos.
const MenuIcon = defineComponent({ render: () => h('div', { class: 'i-heroicons-bars-3' }) });
const BellIcon = defineComponent({ render: () => h('div', { class: 'i-heroicons-bell' }) });
const ChevronDownIcon = defineComponent({ render: () => h('div', { class: 'i-heroicons-chevron-down' }) });
const AlertIcon = defineComponent({ render: () => h('div', { class: 'i-heroicons-exclamation-triangle' }) });
const SensorIcon = defineComponent({ render: () => h('div', { class: 'i-heroicons-cpu-chip' }) });
const InfoIcon = defineComponent({ render: () => h('div', { class: 'i-heroicons-information-circle' }) });

// Stores
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const emit = defineEmits(['toggle-sidebar']);

// User data
// ¡CAMBIO CLAVE AQUÍ!: user ahora apunta directamente a userProfile
const user = computed(() => authStore.userProfile);

const userInitials = computed(() => {
  // Accede a firstName y lastName directamente desde `user` (userProfile)
  if (!user.value || (!user.value.firstName && !user.value.lastName)) {
    // Fallback: si no hay nombres en el perfil, usa la primera letra del email del objeto de autenticación
    if (authStore.user?.email) {
      return authStore.user.email.charAt(0).toUpperCase();
    }
    return '';
  }
  const initialFirstName = user.value.firstName ? user.value.firstName.charAt(0).toUpperCase() : '';
  const initialLastName = user.value.lastName ? user.value.lastName.charAt(0).toUpperCase() : '';
  return `${initialFirstName}${initialLastName}`;
});

// Notifications
const notifications = computed(() => notificationStore.notifications);
const unreadNotifications = computed(() =>
  notifications.value.filter(n => !n.read).length
);

// UI state
const showNotifications = ref(false);
const showUserMenu = ref(false);

// Close menus when clicking outside
onMounted(() => {
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!target.closest('.notification-container')) {
      showNotifications.value = false;
    }
    if (!target.closest('.user-menu-container')) {
      showUserMenu.value = false;
    }
  });
});

// Helper functions (mantienen su lógica)
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const diff = now - new Date(timestamp);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) {
    return `Hace ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} hora${hours === 1 ? '' : 's'}`;
  }

  const days = Math.floor(hours / 24);
  return `Hace ${days} día${days === 1 ? '' : 's'}`;
};

const getNotificationIconClass = (type) => {
  switch (type) {
    case 'alert':
      return 'bg-error-100 text-error-600';
    case 'sensor':
      return 'bg-primary-100 text-primary-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'alert':
      return AlertIcon;
    case 'sensor':
      return SensorIcon;
    default:
      return InfoIcon;
  }
};

const getRoleBadgeClass = (role) => {
  // Asegúrate de que los nombres de los roles aquí coincidan con los de tu DB
  switch (role) {
    case 'super-admin':
      return 'bg-primary-100 text-primary-700';
    case 'technician':
      return 'bg-secondary-100 text-secondary-700';
    case 'viewer': // Añadido el rol 'viewer'
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const translateRole = (role) => {
  // Asegúrate de que los nombres de los roles aquí coincidan con los de tu DB
  switch (role) {
    case 'super-admin':
      return 'Super Admin';
    case 'technician':
      return 'Técnico';
    case 'viewer': // Añadido el rol 'viewer'
      return 'Visualizador';
    default:
      return role; // Mantener el rol si no se conoce, o puedes poner 'Desconocido'
  }
};

// Actions
const toggleSidebar = () => {
  emit('toggle-sidebar');
};

const handleLogout = async () => {
  await authStore.logout();
  showUserMenu.value = false;
  router.push('/auth/login');
};
</script>