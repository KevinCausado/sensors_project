// ~/utils/permissionsMap.js
 
export const permissionMapping = {
  // Permisos generales (pueden ser usados en varios módulos si los nombres coinciden)
  'ver': 'view',
  'crear': 'create',
  'editar': 'manage', 
  'eliminar': 'delete',
  'gestionar': 'manage',   
  'generar': 'generate',
  'gestion_horarios': 'manage_schedules',
  'administrar': 'manage_schedules', 
  'ver_estado': 'view_status', 
  'resolver': 'resolve',
  'asignar': 'assign', 
};

export const getInternalPermissionName = (friendlyPermissionName) => {
  return permissionMapping[friendlyPermissionName] || friendlyPermissionName;
};