<template>
  <aside class="bg-white border-r border-gray-200 w-64 fixed inset-y-0 left-0 transform md:translate-x-0 transition duration-200 ease-in-out z-30" :class="{ '-translate-x-full': !isOpen }">
    <div class="h-full flex flex-col">
      <div class="h-16 border-b border-gray-200 flex items-center px-6">
        <h2 class="text-xl font-bold text-primary-800">Menu Principal</h2>
        <button @click="toggleSidebar" class="p-1 ml-auto text-gray-400 md:hidden focus:outline-none">
          <XIcon class="h-6 w-6" />
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto py-4 px-3">
        <div class="space-y-1">
          <template v-for="item in processedNavigationItems" :key="item.name">
            <PermissionGuard :moduleId="item.moduleId" :permission="item.permissionAction">
              <SidebarLink :to="item.to" :icon="item.iconComponent" :label="item.name" :has-children="!!item.children" :is-active="isActiveRoute(item)" />
            </PermissionGuard>
          </template>
        </div>

        <div v-if="shouldShowOrganizationFilter && organizations.length > 0" class="mt-8 px-3">
          <label for="organization-filter" class="block text-xs font-medium text-gray-500 mb-2">Organización</label>
          <div class="relative">
            <select
              id="organization-filter"
              v-model="organizationStore.selectedOrganizationId"
              @change="changeOrganization"
              class="block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
            >
              <option :value="null">Todas las Organizaciones</option>
              <option v-for="org in organizations" :key="org.id" :value="org.id">
                {{ org.name }}
              </option>
            </select>
            <p v-if="organizationStore.isLoading" class="text-xs text-gray-500 mt-1">Cargando organizaciones...</p>
            <p v-if="organizationStore.error" class="text-xs text-red-500 mt-1">Error al cargar: {{ organizationStore.error }}</p>
          </div>
        </div>
      </nav>

      <div class="border-t border-gray-200 p-4 md:hidden">
        <div class="flex items-center">
          <div class="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm">
            {{ userInitials }}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900">{{ user?.profile?.firstName || user?.email }} {{ user?.profile?.lastName }}</p>
            <button @click="logout" class="text-xs text-error-600 hover:text-error-500">Cerrar sesión</button>
          </div>
        </div>
      </div>
    </div>
  </aside>

  <div v-if="isOpen" class="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 md:hidden" @click="toggleSidebar"></div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from "vue";
import { useAuthStore } from "~/stores/auth";
import { useOrganizationStore } from "~/stores/organizations";
import { useRoute, useRouter } from "vue-router";
import { navigationItems } from "~/utils/navigation";

// IMPORTA TU COMPONENTE PermissionGuard
import PermissionGuard from "~/components/PermissionGuard.vue";

// --- DEFINICIÓN DE ICONOS ---
const IconComponents = {
  "i-heroicons-x-mark": defineComponent({ render: () => h("div", { class: "i-heroicons-x-mark" }) }),
  "i-heroicons-home": defineComponent({ render: () => h("div", { class: "i-heroicons-home" }) }),
  "i-heroicons-chip": defineComponent({ render: () => h("div", { class: "i-heroicons-chip" }) }), // Ya tienes este
  "i-heroicons-bell": defineComponent({ render: () => h("div", { class: "i-heroicons-bell" }) }), // Ya tienes este
  "i-heroicons-building-office": defineComponent({ render: () => h("div", { class: "i-heroicons-building-office" }) }), // Ya tienes este
  "i-heroicons-users": defineComponent({ render: () => h("div", { class: "i-heroicons-users" }) }), // Ya tienes este
  "i-heroicons-lock-closed": defineComponent({ render: () => h("div", { class: "i-heroicons-lock-closed" }) }), // Ya tienes este
  "i-heroicons-cog-6-tooth": defineComponent({ render: () => h("div", { class: "i-heroicons-cog-6-tooth" }) }), // Ya tienes este

  // **NUEVOS ICONOS AÑADIDOS DESDE navigationItems.js**
  "i-heroicons-map-pin": defineComponent({ render: () => h("div", { class: "i-heroicons-map-pin" }) }),
  "i-heroicons-cpu-chip": defineComponent({ render: () => h("div", { class: "i-heroicons-cpu-chip" }) }),
  "i-heroicons-cube": defineComponent({ render: () => h("div", { class: "i-heroicons-cube" }) }),
  "i-heroicons-document-text": defineComponent({ render: () => h("div", { class: "i-heroicons-document-text" }) }),
  "i-heroicons-chart-bar": defineComponent({ render: () => h("div", { class: "i-heroicons-chart-bar" }) }),
  "i-heroicons-wave-pulse": defineComponent({ render: () => h("div", { class: "i-heroicons-wave-pulse" }) }),
  "i-heroicons-clipboard-document-check": defineComponent({ render: () => h("div", { class: "i-heroicons-clipboard-document-check" }) }),
  // Agrega cualquier otro icono que utilices en navigationItems.js
};

// Mapea las cadenas de iconos a los componentes reales
const processedNavigationItems = computed(() => {
  return navigationItems.map((item) => ({
    ...item,
    iconComponent: IconComponents[item.icon],
  }));
});

// Exponer XIcon para el template
const XIcon = IconComponents["i-heroicons-x-mark"];

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true,
  },
});

// Emits
const emit = defineEmits(["toggle"]);

// Stores
const authStore = useAuthStore();
const organizationStore = useOrganizationStore();
const route = useRoute();
const router = useRouter();

// User data
const user = computed(() => authStore.user);

const userInitials = computed(() => {
  if (!user.value || !user.value.profile) {
    if (user.value?.email) {
      return user.value.email.charAt(0).toUpperCase();
    }
    return "";
  }
  const firstName = user.value.profile.firstName;
  const lastName = user.value.profile.lastName;
  if (!firstName && !lastName) {
    if (user.value?.email) return user.value.email.charAt(0).toUpperCase();
    return "";
  }
  const initialFirstName = firstName ? firstName.charAt(0).toUpperCase() : "";
  const initialLastName = lastName ? lastName.charAt(0).toUpperCase() : "";
  return `<span class="math-inline">\{initialFirstName\}</span>{initialLastName}`;
});

// Organization data
const organizations = computed(() => organizationStore.organizations);

const shouldShowOrganizationFilter = computed(() => {
  // Condición 1: Debe haber al menos una organización cargada en el store.
  const hasOrganizations = organizations.value.length > 0;

  // Condición 2: El usuario debe estar en una de las páginas donde el filtro es relevante.
  const currentPath = route.path;
  const isOnRelevantPage = 
    currentPath === "/dashboard" || 
    currentPath.startsWith("/sensors") || 
    currentPath.startsWith("/alerts");

  // El filtro se mostrará si AMBAS condiciones son verdaderas.
  // Ya NO se requiere una verificación de permisos específicos para este filtro.
  return hasOrganizations && isOnRelevantPage;
});

// Actions
const toggleSidebar = () => {
  emit("toggle");
};

const logout = async () => {
  await authStore.logout();
  router.push("/auth/login");
};

const changeOrganization = () => {
  // Cuando el usuario cambia la selección, el store se actualiza
  organizationStore.setSelectedOrganizationId(organizationStore.selectedOrganizationId);
};

// Helper functions
const isActiveRoute = (item) => {
  if (item.to === "/" && route.path === "/") {
    return true;
  }
  return item.to !== "/" && route.path.startsWith(item.to);
};

// Initialize organization selector
onMounted(async () => {
  await organizationStore.fetchOrganizations(); // <<< CAMBIO CLAVE AQUÍ: Siempre establecer a null al montar, ignorando cualquier valor guardado

  organizationStore.setSelectedOrganization(null);
  console.log('[AppSidebar] Estableciendo la selección inicial a "Todas las Organizaciones".');
});
</script>

<style scoped>
/* Tus estilos aquí */
</style>
