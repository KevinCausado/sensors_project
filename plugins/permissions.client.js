// plugins/permissions.client.js
import { usePermissionStore } from '~/stores/permissions';

export default defineNuxtPlugin((nuxtApp) => {
  const permissionStore = usePermissionStore();
  
  // La lógica para cargar los roles y sus permisos desde la base de datos
  // se maneja en el `onMounted` del componente `permissions.vue` llamando a `permissionStore.fetchRoles()`.
  // Por lo tanto, esta inicialización no es necesaria aquí y la función ya no existe en el store.
  
  // if (Object.keys(permissionStore.rolePermissions).length === 0) {
  //   permissionStore.initializeDefaultPermissions(); // <-- ELIMINAR O COMENTAR ESTA LÍNEA
  //   console.log('[Permissions Plugin] Default permissions initialized.');
  // }
});