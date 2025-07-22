<template>
  <div>
    <PageHeader title="Permisos" subtitle="Gestionar permisos del sistema" />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Columna de Roles (sin cambios) -->
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

      <!-- Columna de Permisos (REDISEÑADA Y ORDENADA) -->
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Permisos para: {{ selectedRoleObject ? translateRole(selectedRoleObject.name) : "Seleccione un rol" }}</h2>
        <div v-if="selectedRole">
          <div v-if="selectedRoleObject.name === 'super-admin'" class="text-center py-8 text-gray-600">El rol "Super Admin" tiene acceso total y sus permisos no pueden ser modificados.</div>
          
          <!-- Bucle principal con jerarquía y orden personalizado -->
          <div v-else class="space-y-6">
            <div v-for="module in sortedHierarchicalModules" :key="module.id" class="p-4 border border-gray-200 rounded-lg">
              
              <!-- Sección del Módulo Padre -->
              <div>
                <h3 class="font-semibold text-gray-900 mb-3">{{ translateModule(module.name) }}</h3>
                <div class="space-y-2 pl-4">
                  <label v-for="permission in permissionStore.getModuleActions(module.name)" :key="permission" class="flex items-center">
                    <input
                      type="checkbox"
                      :checked="hasPermission(selectedRole, module.id, permission)"
                      @change="togglePermission(selectedRole, module.id, permission)"
                      class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span class="ml-3 text-sm text-gray-700 capitalize">{{ translatePermission(permission) }}</span>
                  </label>
                </div>
              </div>

              <!-- Sección de Submódulos (hijos) -->
              <div v-if="module.children && module.children.length > 0" class="mt-4 pt-4 border-t border-gray-200 space-y-4">
                <div v-for="child in module.children" :key="child.id">
                   <h4 class="font-medium text-sm text-gray-700 mb-3">{{ translateModule(child.name) }}</h4>
                   <div class="space-y-2 pl-4">
                       <label v-for="permission in permissionStore.getModuleActions(child.name)" :key="permission" class="flex items-center">
                         <input
                           type="checkbox"
                           :checked="hasPermission(selectedRole, child.id, permission)"
                           @change="togglePermission(selectedRole, child.id, permission)"
                           class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                         />
                         <span class="ml-3 text-sm text-gray-700 capitalize">{{ translatePermission(permission) }}</span>
                       </label>
                   </div>
                </div>
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
import { ref, computed, onMounted, watch } from "vue";
import { usePermissionStore } from "~/stores/permissions";
import PageHeader from "~/components/PageHeader.vue";

definePageMeta({
  meta: { requiredRole: "super-admin" },
});

const permissionStore = usePermissionStore();
const saving = ref(false);
const selectedRole = ref(null);
const permissions = ref({}); 

// --- INICIO DE LA MODIFICACIÓN ---

// 1. Se define el orden deseado para los módulos padres, basado en tu archivo de navegación.
const desiredModuleOrder = [
  'dashboard',
  'organization',
  'assets',
  'asset_status',
  'vibration_profiles',
  'sensors',
  'alerts',
  'users',
  'permissions',
  'parameters',
  'basic_analysis',
  'messaging',
  'reports',
  'settings'
];

// 2. Se obtiene la lista jerárquica del store.
const hierarchicalModules = computed(() => permissionStore.hierarchicalModules);

// 3. Se crea una nueva propiedad computada que ordena la lista jerárquica.
const sortedHierarchicalModules = computed(() => {
  const modules = [...hierarchicalModules.value]; // Copia para no mutar el estado original
  
  return modules.sort((a, b) => {
    const indexA = desiredModuleOrder.indexOf(a.name);
    const indexB = desiredModuleOrder.indexOf(b.name);

    // Si un módulo no está en la lista de orden, se envía al final.
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
});

// --- FIN DE LA MODIFICACIÓN ---


const roles = computed(() => permissionStore.roles);

const selectedRoleObject = computed(() => {
  return roles.value.find((r) => r.id === selectedRole.value);
});

// Funciones de traducción
const translateRole = (roleName) => {
  const translations = { "super-admin": "Super Administrador", admin: "Administrador", technician: "Técnico", viewer: "Visualizador", editor: "Editor" };
  return translations[roleName] || roleName;
};
const translatePermission = (permission) => {
  const translations = { view: "Ver", create: "Crear", manage: "Gestionar", delete: "Eliminar", generate: "Generar", resolve: "Resolver", assign: "Asignar" };
  return translations[permission] || permission;
};
const getRoleBadgeClass = (roleName) => {
  const classes = { "super-admin": "bg-purple-100 text-purple-800", admin: "bg-blue-100 text-blue-800", "Administrador Global": "bg-yellow-100 text-yellow-800", Visor: "bg-gray-100 text-gray-800", Editor: "bg-green-100 text-green-800" };
  return classes[roleName] || "bg-gray-100 text-gray-800";
};
const translateModule = (moduleName) => {
  const translations = { 
    dashboard: "Dashboard", sensors: "Sensores", assets: "Activos", 
    reports: "Reportes",
    report_schedules: "Tareas Programadas",
    report_configurations: "Configuración de Servidores",
    organization: "Organizaciones", alerts: "Alertas", users: "Usuarios", 
    permissions: "Permisos", messaging: "Mensajeria", vibration_profiles: "Perfiles de Vibración", 
    asset_status: "Estado de Activos", settings: "Configuración General", 
    parameters: "Parametros", basic_analysis: "Analisis Básico" 
  };
  return translations[moduleName] || moduleName;
};

// Lógica de permisos
const hasPermission = (roleId, moduleId, permission) => {
  if (selectedRoleObject.value?.name === "super-admin") return true;
  if (permissions.value[selectedRole.value] && permissions.value[selectedRole.value][moduleId]) {
    return permissions.value[selectedRole.value][moduleId][permission] === true;
  }
  const rolePerms = permissionStore.rolePermissions[selectedRole.value];
  return rolePerms?.[moduleId]?.[permission] === true || false;
};
const togglePermission = (roleId, moduleId, permission) => {
  if (selectedRoleObject.value?.name === "super-admin") return;
  if (!permissions.value[roleId]) {
    permissions.value[roleId] = {};
  }
  if (!permissions.value[roleId][moduleId]) {
    permissions.value[roleId][moduleId] = JSON.parse(JSON.stringify(permissionStore.rolePermissions[roleId]?.[moduleId] || {}));
  }
  permissions.value[roleId][moduleId][permission] = !permissions.value[roleId][moduleId][permission];
};
const savePermissions = async () => {
  if (!selectedRole.value || selectedRoleObject.value?.name === "super-admin") return;
  try {
    saving.value = true;
    const changesToSave = permissions.value[selectedRole.value] || {};
    await permissionStore.saveRolePermissions(selectedRole.value, changesToSave);
    permissions.value = {};
    if (selectedRole.value) {
      permissions.value[selectedRole.value] = JSON.parse(JSON.stringify(permissionStore.getRolePermissions(selectedRole.value) || {}));
    }
  } catch (error) {
    console.error("Error al guardar permisos:", error);
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    await permissionStore.fetchAppModules();
    await permissionStore.fetchRolesAndPermissions();
    if (roles.value.length > 0) {
      selectedRole.value = roles.value[0].id;
    }
  } catch (error) {
    console.error("onMounted: Error al cargar datos:", error);
  }
});

watch(selectedRole, (newRoleId) => {
    if (newRoleId) {
      permissions.value[newRoleId] = JSON.parse(JSON.stringify(permissionStore.getRolePermissions(newRoleId) || {}));
    }
}, { deep: true });
</script>

<style scoped>
.card { @apply bg-white shadow-md rounded-lg p-6; }
.btn { @apply px-4 py-2 rounded-md font-semibold text-white; }
.btn-primary { @apply bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2; }
</style>
