// ~/utils/permissionsMap.js

/**
 * Define un mapeo de permisos para traducir nombres amigables del frontend
 * a los nombres internos/de base de datos.
 *
 * Estructura:
 * {
 * 'nombreAmigableFrontend': 'nombreInternoOBaseDeDatos'
 * }
 */
export const permissionMapping = {
  // Permisos generales (pueden ser usados en varios módulos si los nombres coinciden)
  'ver': 'view',
  'crear': 'create',
  'editar': 'manage', // Asumimos que 'editar' se mapea a 'manage' en tu DB
  'eliminar': 'delete',
  'gestionar': 'manage', // Podrías tener 'gestionar' como otro alias para 'manage'
  
  // Permisos específicos por módulo (si tuvieras nombres que solo aplican a un módulo)
  // 'users.ver_usuarios': 'users.view', // Esto sería si 'ver_usuarios' fuera el prop
  // 'reports.generar_reporte': 'reports.generate',

  // Puedes expandir esto para otros módulos si es necesario
  'generar': 'generate',
  'gestion_horarios': 'manage_schedules',
  'administrar': 'manage_schedules', // Otro posible alias para 'manage_schedules'
  'ver_estado': 'view_status', // Ejemplo si tuvieras un permiso para 'asset_status'
  'resolver': 'resolve',
  'asignar': 'assign' 

  // ... Agrega todos los mapeos necesarios
};

/**
 * Función para obtener el nombre de permiso interno/de DB a partir de un nombre amigable.
 * @param {string} friendlyPermissionName - El nombre de permiso usado en el frontend (ej: 'ver').
 * @returns {string} El nombre de permiso interno/de DB (ej: 'view'), o el nombre original si no hay mapeo.
 */
export const getInternalPermissionName = (friendlyPermissionName) => {
  return permissionMapping[friendlyPermissionName] || friendlyPermissionName;
};