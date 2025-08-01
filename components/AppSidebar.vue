<template>  
  <aside
    :class="{
      'fixed inset-y-0 left-0 z-40': !isDesktop, 
      'transform -translate-x-full': !isOpen && !isDesktop, 
      'transform translate-x-0': isOpen && !isDesktop,      
      'relative flex-shrink-0': isDesktop 
    }"
    class="w-64 bg-white transition-transform duration-200 ease-in-out h-screen"
  >
    <div class="h-full flex flex-col">    
      <div class="flex items-center justify-start h-16 px-4 flex-shrink-0">
        <Logo class="h-8 w-8 text-gray-800" />
        <div class="ml-3 flex items-baseline">
          <span class="text-gray-800 text-xl font-bold">VibrAI</span>
          <span class="ml-2 text-xs font-semibold text-blue-500 tracking-wider">PANEL</span>
        </div>
      </div>
      

      <nav class="flex-1 overflow-y-auto py-4">
        <div class="space-y-1">
          <template v-for="item in navigationItems" :key="item.name">
            <PermissionGuard :moduleId="item.moduleId" :permission="item.permissionAction">
              <NuxtLink 
                :to="item.to"
                class="flex items-center py-2 text-sm transition-colors"
                :class="[
                  'font-semibold',
                  isActiveRoute(item) 
                    ? 'bg-gradient-to-r from-blue-100 to-gray-50 text-blue-700 rounded-l-md pl-6'
                    : 'text-gray-700 hover:bg-gray-100 rounded-md mx-3 px-3'
                ]"
                @click="!isDesktop && toggleSidebar()"
              >
                <Icon :name="item.icon" class="h-5 w-5 mr-3" />
                <span>{{ item.name }}</span>
              </NuxtLink>
            </PermissionGuard>
          </template>
        </div>

        <div v-if="shouldShowOrganizationFilter && organizations.length > 0" class="mt-8 px-2">
          <label for="organization-filter" class="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Organización</label>
          <div class="relative">
            <select
              id="organization-filter"
              v-model="organizationStore.selectedOrganizationId"
              @change="changeOrganization"
              class="block w-full rounded-md border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option :value="null">Todas</option>
              <option v-for="org in organizations" :key="org.id" :value="org.id">
                {{ org.name }}
              </option>
            </select>
          </div>
        </div>
      </nav>
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useAuthStore } from "~/stores/auth";
import { useOrganizationStore } from "~/stores/organizations";
import { useRoute } from "vue-router";
import { navigationItems } from "~/utils/navigation";
import PermissionGuard from "~/components/PermissionGuard.vue";
import Logo from '~/components/Logo.vue';

const props = defineProps({
  isOpen: Boolean,
  isDesktop: Boolean
});

const emit = defineEmits(["toggle"]);

// Stores
const authStore = useAuthStore();
const organizationStore = useOrganizationStore();
const route = useRoute();

// Data
const organizations = computed(() => organizationStore.organizations);

const shouldShowOrganizationFilter = computed(() => {
  const hasOrganizations = organizations.value.length > 0;
  const currentPath = route.path;
  const isOnRelevantPage =
    currentPath === "/dashboard" ||
    currentPath.startsWith("/sensors") ||
    currentPath.startsWith("/alerts") ||
    currentPath.startsWith("/assets") ||
    currentPath.startsWith("/asset-status");
  return hasOrganizations && isOnRelevantPage;
});

// Actions
const toggleSidebar = () => {
  if (!props.isDesktop) {
    emit("toggle");
  }
};

const changeOrganization = () => {  
  if (typeof organizationStore.setSelectedOrganizationId === 'function') {
    organizationStore.setSelectedOrganizationId(organizationStore.selectedOrganizationId);
  }
};

// Helpers
const isActiveRoute = (item) => {
  const itemPath = item.to;
  const currentPath = route.path;
  
  if (itemPath === '/' || itemPath === '/dashboard') {
    return currentPath === '/' || currentPath === '/dashboard';
  }
  
  return itemPath !== '/' && currentPath.startsWith(itemPath);
};

// Lifecycle
onMounted(async () => {
  if (organizationStore.organizations.length === 0) {
    await organizationStore.fetchOrganizations();  
  }
  if (organizationStore.selectedOrganizationId === undefined) {
    organizationStore.selectedOrganizationId = null; 
  }
});
</script>
