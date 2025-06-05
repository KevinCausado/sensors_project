<template>
  <div>
    <PageHeader title="Permisos" subtitle="Gestionar permisos del sistema" />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Roles</h2>
        <div class="space-y-4">
          <div v-for="role in roles" :key="role.id" class="p-4 bg-gray-50 rounded-lg cursor-pointer" :class="{ 'border-2 border-primary-500': selectedRole === role.id, 'opacity-60': role.name === 'super-admin' }" @click="selectedRole = role.id">
            <div class="flex items-start justify-between">
              <div class="flex-grow pr-4">
                <h3 class="font-medium text-gray-900">{{ translateRole(role.name) }}</h3>
                <p class="text-sm text-gray-500 break-words">{{ role.description }}</p>
              </div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0" :class="getRoleBadgeClass(role.name)">{{ role.users || 0 }} usuarios</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Permisos para: {{ selectedRoleObject ? translateRole(selectedRoleObject.name) : "Seleccione un rol" }}</h2>
        <div v-if="selectedRole">
          <div v-if="selectedRoleObject.name === 'super-admin'" class="text-center py-8 text-gray-600">El rol "Super Admin" tiene acceso total y sus permisos no pueden ser modificados.</div>
          <div v-else class="space-y-6">
            <div v-for="module in modules" :key="module.id" class="p-4 border border-gray-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-medium text-gray-900">{{ translateModule(module.name) }}</h3>
              </div>
              <div class="space-y-2">
                <label v-for="permission in permissionStore.getModuleActions(module.name)" :key="permission" class="flex items-center">
                  <input
                    type="checkbox"
                    :id="`perm-${selectedRole}-${module.id}-${permission}`"
                    :checked="hasPermission(selectedRole, module.id, permission)"
                    @change="togglePermission(selectedRole, module.id, permission)"
                    class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span class="ml-2 text-sm text-gray-700">
                    {{ translatePermission(permission) }}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center text-gray-500 py-8">Selecciona un rol para ver sus permisos</div>
      </div>
    </div>

    <div class="mt-6 flex justify-end">
      <button @click="savePermissions" class="btn btn-primary" :disabled="saving || !selectedRole || selectedRoleObject?.name === 'super-admin'">
        {{ saving ? "Guardando..." : "Guardar Cambios" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue"; // Added onMounted and watch
import { usePermissionStore } from "~/stores/permissions";
import PageHeader from "~/components/PageHeader.vue"; // Make sure this path is correct
import { navigationItems } from "~/utils/navigation"; // <-- Esta importación ES NECESARIA para el orden y los nombres del sidebar

definePageMeta({
  // middleware: ['auth'], // Ensure auth middleware is correctly configured for your app
  meta: {
    requiredRole: "super-admin",
  },
});

const permissionStore = usePermissionStore();
const saving = ref(false);
const selectedRole = ref(null);

// Data
const modules = computed(() => permissionStore.appModules); // Corrected to appModules
const roles = computed(() => permissionStore.roles);
const permissions = ref({}); // This ref is for local changes before saving

// Computed for selected role object (added for easier super-admin check)
const selectedRoleObject = computed(() => {
  return roles.value.find((r) => r.id === selectedRole.value);
});

// Helpers
const translateRole = (roleName) => {
  // Renamed param to roleName for clarity
  const translations = {
    // Changed to translations for consistency
    "super-admin": "Super Administrador",
    admin: "Administrador",
    technician: "Técnico",
    viewer: "Visualizador",
    // Add other roles if they exist in your DB and you want to translate them
    editor: "Editor",
  };
  return translations[roleName] || roleName;
};

const translatePermission = (permission) => {
  const translations = {
    view: "Ver", // Adjusted to match 'view' from moduleActionDefinitions
    create: "Crear",
    manage: "Gestionar", // Adjusted from 'editar' to 'manage' if you use that in moduleActionDefinitions
    delete: "Eliminar",
    generate: "Generar",
    manage_schedules: "Programar",
    resolve: "Resolver", // Example if you have 'resolve'
    assign: "Asignar", // Example if you have 'assign'
    // Add any other specific permissions you define in moduleActionDefinitions
  };
  return translations[permission] || permission;
};

const getRoleBadgeClass = (roleName) => {
  // Changed param to roleName
  switch (roleName) {
    case "super-admin":
      return "bg-purple-100 text-purple-800"; // Changed colors slightly for variety
    case "admin":
      return "bg-blue-100 text-blue-800";
    case "Administrador Global":
      return "bg-yellow-100 text-yellow-800";
    case "Visor":
      return "bg-gray-100 text-gray-800";
    case "Editor":
      return "bg-green-100 text-green-800"; // Example if you have editor
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const translateModule = (moduleName) => {
  const translations = {
    dashboard: "Dashboard", // Or 'Panel de Control'
    locations: "Ubicaciones",
    sensors: "Sensores",
    assets: "Activos",
    reports: "Reportes",
    organization: "Organizaciones",
    alerts: "Alertas",
    users: "Usuarios",
    permissions: "Permisos",
    realtime_monitor: "Monitor en Tiempo Real",
    vibration_profiles: "Perfiles de Vibración",
    asset_status: "Estado de Activos",
    settings: "Configuración General",
    parameters: "Parametros",
  };
  return translations[moduleName] || moduleName;
};

const hasPermission = (roleId, moduleId, permission) => {
  // Check for super-admin based on selectedRoleObject's name
  if (selectedRoleObject.value?.name === "super-admin") return true;

  // Check local changes first for the currently selected role
  if (permissions.value[selectedRole.value] && permissions.value[selectedRole.value][moduleId]) {
    // For JSONB object, check if the specific permission key is true
    return permissions.value[selectedRole.value][moduleId][permission] === true;
  }

  // Then check from the store's rolePermissions state (database state)
  const rolePerms = permissionStore.rolePermissions[selectedRole.value];
  // For JSONB object, check if the specific permission key is true
  return rolePerms?.[moduleId]?.[permission] === true || false;
};

const togglePermission = (roleId, moduleId, permission) => {
  // Prevent changes for super-admin
  if (selectedRoleObject.value?.name === "super-admin") return;

  // Ensure the local 'permissions' object structure exists for the current role and module
  if (!permissions.value[roleId]) {
    permissions.value[roleId] = {};
  }
  if (!permissions.value[roleId][moduleId]) {
    // Initialize with existing permissions for this module from the store, or an empty object
    // Important: JSON.parse(JSON.stringify()) to deep copy and prevent direct mutation of store state
    permissions.value[roleId][moduleId] = JSON.parse(JSON.stringify(permissionStore.rolePermissions[roleId]?.[moduleId] || {}));
  }

  // Toggle the boolean value for the specific permission action
  // If undefined or false, set to true. If true, set to false.
  permissions.value[roleId][moduleId][permission] = !permissions.value[roleId][moduleId][permission];
};

const savePermissions = async () => {
  if (!selectedRole.value) return;
  // Prevent saving for super-admin
  if (selectedRoleObject.value?.name === "super-admin") {
    console.warn("Attempted to save permissions for super-admin. Action blocked.");
    return;
  }

  try {
    saving.value = true;
    const changesToSave = permissions.value[selectedRole.value] || {};
    // Filter out permissions that are explicitly false, to avoid saving unnecessary data
    // Or save everything as is if your backend handles it gracefully
    const filteredChanges = {};
    for (const moduleId in changesToSave) {
      if (Object.prototype.hasOwnProperty.call(changesToSave, moduleId)) {
        const modulePerms = changesToSave[moduleId];
        const activePerms = {};
        for (const permName in modulePerms) {
          if (modulePerms[permName] === true) {
            activePerms[permName] = true;
          }
        }
        if (Object.keys(activePerms).length > 0) {
          filteredChanges[moduleId] = activePerms;
        }
      }
    }

    await permissionStore.saveRolePermissions(selectedRole.value, filteredChanges);
    // After saving, re-initialize local permissions from the store's updated state
    // This will cause the watch on selectedRole to trigger and load the saved state
    permissions.value = {};
  } catch (error) {
    console.error("Error al guardar permisos:", error);
    // Add user-facing error notification here
  } finally {
    saving.value = false;
  }
};

// Cargar datos y configurar el estado inicial al montar el componente
onMounted(async () => {
  try {
    // Fetch both app modules and roles/permissions
    await permissionStore.fetchAppModules();
    await permissionStore.fetchRolesAndPermissions();

    // Select 'super-admin' by default if it exists, otherwise the first role
    const superAdminRole = roles.value.find((r) => r.name === "super-admin");
    if (superAdminRole) {
      selectedRole.value = superAdminRole.id;
    } else if (roles.value.length > 0) {
      selectedRole.value = roles.value[0].id;
    }
  } catch (error) {
    console.error("onMounted: Error al cargar roles y permisos:", error);
  }
});

// Observar selectedRole para inicializar 'permissions' cuando cambia el rol
watch(
  selectedRole,
  (newRoleId) => {
    if (newRoleId) {
      if (selectedRoleObject.value?.name === "super-admin") {
        permissions.value[newRoleId] = {}; // Clear local permissions for super-admin
      } else {
        // Deep copy permissions from the store's state for local editing
        // Ensure it's an object, not an array
        permissions.value[newRoleId] = JSON.parse(JSON.stringify(permissionStore.getRolePermissions(newRoleId) || {}));
      }
    }
  },
  { immediate: true }
);
</script>

<style scoped>
/* Add any specific styles you had or need here */
.card {
  @apply bg-white shadow-md rounded-lg p-6;
}
.btn {
  @apply px-4 py-2 rounded-md font-semibold text-white;
}
.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}
.form-checkbox {
  @apply rounded;
}
.form-input {
  @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500;
}
</style>
