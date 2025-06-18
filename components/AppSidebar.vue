<template>
  <!--
    Main sidebar container.
    - `w-64`: Defines the sidebar width.
    - `bg-white shadow-lg z-30`: Visual styles.
    - `transition-transform duration-200 ease-in-out`: For the slide animation.

    Conditional classes:
    - **Mobile behavior (md and below):** Sidebar is `fixed`, slides in/out.
      - `fixed inset-y-0 left-0`: Fixes it to the viewport.
      - `-translate-x-full`: Hides it off-screen when `isOpen` is false (and not desktop).
      - `translate-x-0`: Shows it on-screen when `isOpen` is true (and not desktop).
      - `z-40`: Ensures it's above main content when open.
    - **Desktop behavior (md and above):** Sidebar is `relative`, always visible, and *pushes* content.
      - `md:relative md:translate-x-0 md:block`: Makes it part of the normal flex flow,
                                                ensures it's visible, and is always a block element.
                                                `md:flex-shrink-0` ensures it keeps its `w-64`.
  -->
  <aside
    :class="{
      // Mobile-specific classes (when not desktop)
      'fixed inset-y-0 left-0 z-40': !isDesktop, // Apply fixed positioning only on mobile
      'transform -translate-x-full': !isOpen && !isDesktop, // Hide on mobile if closed
      'transform translate-x-0': isOpen && !isDesktop, // Show on mobile if open

      // Desktop-specific classes (when it is desktop)
      'md:relative md:translate-x-0 md:block md:flex-shrink-0': isDesktop // Push content on desktop
    }"
    class="w-64 bg-white border-r border-gray-200
           transition duration-200 ease-in-out"
  >
    <div class="h-full flex flex-col">
      
      <nav class="flex-1 overflow-y-auto py-4 px-3">
        <div class="space-y-1">
          <template v-for="item in processedNavigationItems" :key="item.name">
            <PermissionGuard :moduleId="item.moduleId" :permission="item.permissionAction">
              <SidebarLink
                :to="item.to"
                :icon="item.icon"
                :label="item.name"
                :has-children="!!item.children"
                :is-active="isActiveRoute(item)"
                @click="!isDesktop && toggleSidebar()" /> <!-- Close sidebar on navigation in mobile -->
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

      <!-- User info and logout button, visible only on mobile (when sidebar is open) -->
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

  <!-- This overlay is no longer needed in AppSidebar as it's now handled in default.vue -->
  <!-- <div v-if="isOpen" class="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 md:hidden" @click="toggleSidebar"></div> -->
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "~/stores/auth";
import { useOrganizationStore } from "~/stores/organizations";
import { useRoute, useRouter } from "vue-router";
import { navigationItems } from "~/utils/navigation";
import PermissionGuard from "~/components/PermissionGuard.vue";

// Mapea las cadenas de iconos de navigationItems al formato esperado por <Icon>
const processedNavigationItems = computed(() => {
  return navigationItems.map((item) => ({
    ...item,
    icon: item.icon.replace('i-heroicons-', 'heroicons:'),
  }));
});

// Props from parent (layout)
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true,
  },
  isDesktop: { // NEW PROP: indicates if current screen size is desktop
    type: Boolean,
    default: true
  }
});

// Emits to parent
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
  return `${initialFirstName}${initialLastName}`;
});

// Organization data
const organizations = computed(() => organizationStore.organizations);

const shouldShowOrganizationFilter = computed(() => {
  const hasOrganizations = organizations.value.length > 0;
  const currentPath = route.path;
  const isOnRelevantPage =
    currentPath === "/dashboard" ||
    currentPath.startsWith("/sensors") ||
    currentPath.startsWith("/alerts");
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
  await organizationStore.fetchOrganizations();
  organizationStore.setSelectedOrganization(null); // Set initial selection to "All Organizations"
  console.log('[AppSidebar] Estableciendo la selección inicial a "Todas las Organizaciones".');
});
</script>

<style scoped>
/* No specific scoped styles here. Use Tailwind classes directly. */
</style>