<template>
  <div>
    <PageHeader
      title="Permisos"
      subtitle="Gestionar permisos del sistema" />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Roles</h2>
        <div class="space-y-4">
          <div
            v-for="role in roles"
            :key="role.id"
            class="p-4 bg-gray-50 rounded-lg cursor-pointer" :class="{
              'border-2 border-primary-500': selectedRole === role.id,
              'opacity-60': role.name === 'super-admin' // Solo aplica la opacidad para el super-admin
            }"
            @click="selectedRole = role.id" >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-gray-900">{{ translateRole(role.name) }}</h3>
                <p class="text-sm text-gray-500">{{ role.description }}</p>
              </div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getRoleBadgeClass(role.name)"> {{ role.users || 0 }} usuarios
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Permisos</h2>

        <div v-if="selectedRoleObject?.name === 'super-admin'"
             class="text-center py-8 bg-blue-50 rounded-lg border border-blue-200 text-blue-800">
          <p class="font-semibold text-lg">Permisos de Super Administrador</p>
          <p class="mt-2 text-sm">Este rol tiene todos los permisos y no pueden ser modificados.</p>
        </div>

        <div v-else-if="selectedRole" class="space-y-6">
          <div v-for="module in modules" :key="module.id" class="p-4 border border-gray-200 rounded-lg">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-gray-900">{{ module.name }}</h3>
            </div>
            <div class="space-y-2">
              <label v-for="permission in module.permissions"
                     :key="permission"
                     class="flex items-center">
                <input
                  type="checkbox"
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

        <div v-else class="text-center text-gray-500 py-8">
          Selecciona un rol para ver sus permisos
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end">
      <button
        @click="savePermissions"
        class="btn btn-primary"
        :disabled="saving || !selectedRole || selectedRoleObject?.name === 'super-admin'"> {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
      </button>
    </div>
  </div>
</template>



<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { usePermissionStore } from '~/stores/permissions';
import PageHeader from '~/components/PageHeader.vue'; // Asegúrate de que esta ruta sea correcta

definePageMeta({
  // middleware: ['auth'],
  meta: {
    requiredRole: 'super-admin' // Asegúrate de que solo los super-admin puedan acceder a esta página
  }
});

const permissionStore = usePermissionStore();
const saving = ref(false);
const selectedRole = ref(null);

// Data
const modules = computed(() => permissionStore.modules);
const roles = computed(() => permissionStore.roles); // Los roles cargados de la BD
const permissions = ref({}); // Este ref es para los cambios locales en el frontend antes de guardar

// Computed para obtener el objeto de rol seleccionado, útil para acceder a `name`
const selectedRoleObject = computed(() => {
  return roles.value.find(r => r.id === selectedRole.value);
});

// Helpers
const translateRole = (roleName) => {
  const rolesMap = {
    'super-admin': 'Super Administrador',
    'admin': 'Administrador',
    'technician': 'Técnico',
    'viewer': 'Visualizador'
  };
  return rolesMap[roleName] || roleName;
};

const translatePermission = (permission) => {
  const translations = {
    'ver': 'Ver',
    'crear': 'Crear',
    'editar': 'Editar',
    'eliminar': 'Eliminar',
    'resolver': 'Resolver',
    'asignar': 'Asignar'
  };
  return translations[permission] || permission;
};

const getRoleBadgeClass = (roleName) => { // Asegúrate de que reciba el nombre del rol
  switch (roleName) {
    case 'super-admin':
      return 'bg-primary-100 text-primary-800';
    case 'admin':
      return 'bg-secondary-100 text-secondary-800';
    case 'technician':
      return 'bg-warning-100 text-warning-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const hasPermission = (roleId, moduleId, permission) => {
  // El rol 'super-admin' siempre tiene todos los permisos
  if (selectedRoleObject.value?.name === 'super-admin') return true;

  // Primero verifica los cambios PENDIENTES en el `permissions` local
  if (permissions.value[roleId] && permissions.value[roleId][moduleId]) {
    return permissions.value[roleId][moduleId].includes(permission);
  }

  // Si no hay cambios pendientes para este rol/módulo, usa los permisos del store (cargados de la BD)
  const rolePerms = permissionStore.getRolePermissions(roleId);
  return rolePerms[moduleId]?.includes(permission) || false;
};

const togglePermission = (roleId, moduleId, permission) => {
  // No permitir cambios si el rol es 'super-admin'
  if (selectedRoleObject.value?.name === 'super-admin') return;

  // Si aún no hemos iniciado cambios para este rol, inicializamos con los permisos actuales del store
  if (!permissions.value[roleId]) {
    // Clonar profundamente para evitar mutar el estado directamente del store antes de guardar
    permissions.value[roleId] = JSON.parse(JSON.stringify(permissionStore.getRolePermissions(roleId)));
  }

  // Asegurarse de que el módulo exista en los cambios pendientes
  if (!permissions.value[roleId][moduleId]) {
    permissions.value[roleId][moduleId] = [];
  }

  const index = permissions.value[roleId][moduleId].indexOf(permission);
  if (index === -1) {
    permissions.value[roleId][moduleId].push(permission);
  } else {
    permissions.value[roleId][moduleId].splice(index, 1);
  }
};

const savePermissions = async () => {
  if (!selectedRole.value) return;
  // No permitir guardar si el rol seleccionado es 'super-admin'
  if (selectedRoleObject.value?.name === 'super-admin') {
    console.warn('Intentó guardar permisos para super-admin. Acción bloqueada.');
    return;
  }

  try {
    saving.value = true;
    const changesToSave = permissions.value[selectedRole.value] || {};

    await permissionStore.saveRolePermissions(selectedRole.value, changesToSave);

    // Una vez guardado, es seguro vaciar los cambios locales para el rol seleccionado
    delete permissions.value[selectedRole.value];

  } catch (error) {
    console.error('Error al guardar permisos:', error);
    // Aquí puedes añadir una notificación de error al usuario
  } finally {
    saving.value = false;
  }
};

// Cargar datos y configurar el estado inicial al montar el componente
onMounted(async () => {
  try {
    // Primero, carga los roles disponibles desde la base de datos
    await permissionStore.fetchRoles();
  } catch (error) {
    console.error('onMounted: Error al cargar roles:', error);
  }

  // Seleccionar el rol "super-admin" por defecto si existe, de lo contrario, el primer rol
  const superAdminRole = roles.value.find(r => r.name === 'super-admin');
  if (superAdminRole) {
    selectedRole.value = superAdminRole.id;
  } else if (roles.value.length > 0) {
    selectedRole.value = roles.value[0].id;
  }
});

// Observar selectedRole para inicializar 'permissions' cuando cambia el rol
watch(selectedRole, (newRoleId) => {
  if (newRoleId) {
    // Si el nuevo rol es 'super-admin', no inicializamos permisos locales porque no son editables
    if (selectedRoleObject.value?.name === 'super-admin') {
      permissions.value[newRoleId] = {}; // Vacía los permisos locales para este rol
    } else if (!permissions.value[newRoleId]) {
      // Inicializa los permisos locales copiando los del store
      permissions.value[newRoleId] = JSON.parse(JSON.stringify(permissionStore.getRolePermissions(newRoleId)));
    }
  }
}, { immediate: true });
</script>