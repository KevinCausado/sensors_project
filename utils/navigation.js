// utils/navigation.js

export const navigationItems = [
  {
    name: "Dashboard",
    to: "/",
    icon: "i-heroicons-home",
    moduleId: "dashboard",
    permissionAction: "view"
  },
   {
    name: "Organizaciones",
    to: "/organizations",
    icon: "i-heroicons-building-office",
    moduleId: "organization",
    permissionAction: "view"
  },
   {
    name: "Activos",
    to: "/assets",
    icon: "i-heroicons-cube",
    moduleId: "assets",
    permissionAction: "view"
  },
  {
    name: "Estado de Activos",
    to: "/asset-status",
    icon: "i-heroicons-clipboard-document-check",
    moduleId: "asset_status",
    permissionAction: "view"
  },
   {
    name: "Perfiles de Vibración",
    to: "/vibration-profiles",
    icon: "i-heroicons-presentation-chart-line",
    moduleId: "vibration_profiles",
    permissionAction: "view"
  },
  // {
  //   name: "Ubicaciones",
  //   to: "/locations",
  //   icon: "i-heroicons-map-pin",
  //   moduleId: "locations",
  //   permissionAction: "view"
  // },
  {
    name: "Sensores",
    to: "/sensors",
    icon: "i-heroicons-cpu-chip",
    moduleId: "sensors",
    permissionAction: "view"
  },
  {
    name: "Alertas",
    to: "/alerts",
    icon: "i-heroicons-bell",
    moduleId: "alerts",
    permissionAction: "view"
  }, 
  {
    name: "Usuarios", // Changed name to just "Usuarios" as "Permisos" will be separate
    to: "/users", // This link will default to the 'users' tab
    icon: "i-heroicons-users",
    moduleId: "users",
    permissionAction: "view"
  },
  // --- NEW 'PERMISOS' NAVIGATION ITEM ---
  {
    name: "Permisos", // Name for the sidebar link
    to: "/permissions", // Link to the users page, with a query param to activate the permissions tab
    icon: "i-heroicons-key", // A suitable icon for permissions (e.g., a key or shield)
    moduleId: "permissions", // This must match the 'id' of the new module in your 'app_modules' table
    permissionAction: "view" // The permission action required to see this navigation item
  },
  {
    name: "Parametros",
    to: "/parameters",
    icon: "i-heroicons-cube",
    moduleId: "parameters",
    permissionAction: "view"
  },  
  {
    name: "Análisis Basico",
    to: "/reports",
    icon: "i-heroicons-document-text",
    moduleId: "reports",
    permissionAction: "view"
  },
   {
    name: "Mensajeria",
    to: "/realtime-monitor",
    icon: "i-heroicons-chart-bar",
    moduleId: "realtime_monitor",
    permissionAction: "view"
  }, 
  {
    name: "Configuración General",
    to: "/settings",
    icon: "i-heroicons-cog-6-tooth",
    moduleId: "settings",
    permissionAction: "view"
  },  
  
  // --- END NEW 'PERMISOS' NAVIGATION ITEM ---
 
];