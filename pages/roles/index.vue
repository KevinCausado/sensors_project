<template>
  <div>
    <PageHeader 
      title="Roles y Permisos" 
      subtitle="Gestionar roles y sus permisos en el sistema" />
    
    <div class="card">
      <div class="space-y-6">
        <div v-for="role in roles" :key="role.id" class="border-b border-gray-200 pb-6 last:border-0">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-medium text-gray-900">{{ role.name }}</h3>
              <p class="text-sm text-gray-500">{{ role.description }}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="module in modules" :key="module.id" class="p-4 bg-gray-50 rounded-lg">
              <h4 class="font-medium text-gray-900 mb-2">{{ module.name }}</h4>
              <div class="space-y-2">
                <div v-for="permission in module.permissions" :key="permission"
                     class="flex items-center">
                  <input
                    type="checkbox"
                    :id="`${role.id}-${module.id}-${permission}`"
                    v-model="rolePermissionsMap[role.id][module.id]"
                    :value="permission"
                    :disabled="role.id === 'super-admin'"
                    @change="updatePermissions(role.id)"
                    class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label :for="`${role.id}-${module.id}-${permission}`"
                         class="ml-2 text-sm text-gray-700">
                    {{ translatePermission(permission) }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { usePermissionStore } from '~/stores/permissions';

definePageMeta({
  // middleware: ['auth'],
  meta: {
    requiredRole: 'super-admin'
  }
});

const permissionStore = usePermissionStore();

const roles = ref(permissionStore.roles);
const modules = ref(permissionStore.modules);
const rolePermissionsMap = ref({});

const translatePermission = (permission) => {
  const translations = {
    ver: 'Ver',
    crear: 'Crear',
    editar: 'Editar',
    eliminar: 'Eliminar',
    resolver: 'Resolver',
    asignar: 'Asignar'
  };
  return translations[permission] || permission;
};

const initializePermissionsMap = () => {
  roles.value.forEach(role => {
    if (!rolePermissionsMap.value[role.id]) {
      rolePermissionsMap.value[role.id] = {};
    }
    modules.value.forEach(module => {
      if (!rolePermissionsMap.value[role.id][module.id]) {
        rolePermissionsMap.value[role.id][module.id] = [];
      }
      const currentPerms = permissionStore.getRolePermissions(role.id)[module.id] || [];
      rolePermissionsMap.value[role.id][module.id] = [...currentPerms];
    });
  });
};

const updatePermissions = async (roleId) => {
  try {
    await permissionStore.saveRolePermissions(
      roleId,
      rolePermissionsMap.value[roleId]
    );
  } catch (error) {
    console.error('Error al actualizar permisos:', error);
  }
};

onMounted(() => {
  permissionStore.initializeDefaultPermissions();
  initializePermissionsMap();
});
</script>