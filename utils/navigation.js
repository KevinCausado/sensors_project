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
    name: "Usuarios", 
    to: "/users", 
    icon: "i-heroicons-users",
    moduleId: "users",
    permissionAction: "view"
  },

  {
    name: "Permisos", 
    to: "/permissions", 
    icon: "i-heroicons-key", 
    moduleId: "permissions", 
    permissionAction: "view" 
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
    to: "/basic-analysis",
    icon: "i-heroicons-document-text",
    moduleId: "basic_analysis",
    permissionAction: "view"
  },
  //  {
  //   name: "Mensajeria",
  //   to: "/messaging",
  //   icon: "i-heroicons-chart-bar",
  //   moduleId: "messaging",
  //   permissionAction: "view"
  // }, 
  {
    name: "Reportes",
    to: "/reports",
    icon: "i-heroicons-document-text",
    moduleId: "reports",
    permissionAction: "view"
  },
  {
    name: "Configuración General",
    to: "/settings",
    icon: "i-heroicons-cog-6-tooth",
    moduleId: "settings",
    permissionAction: "view"
  },    
 
];