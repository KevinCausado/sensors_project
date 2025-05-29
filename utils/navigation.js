// utils/navigation.js

// Definición de iconos usando clases (asume que los iconos están configurados globalmente,
// por ejemplo, con nuxt-icon o algún setup similar para i-heroicons)
// Nota: Aquí se usa una función dummy para representar los componentes de icono
// ya que no pueden ser importados directamente en un archivo de utilidades simple como este
// si no están disponibles globalmente o a través de un plugin.
// La Sidebar.vue seguirá usando los `defineComponent` con `h` que ya tienes.
const createIconComponent = (className) => ({
  render: () => h('div', { class: className })
});

// Puedes definir tus íconos aquí de la misma manera que en Sidebar.vue si no los tienes globalmente disponibles
// Asegúrate de importar `h` si los defines aquí para este archivo de utilidades
// import { h } from 'vue'; // Descomentar si usas la función createIconComponent aquí

export const navigationItems = [
  { name: "Dashboard", to: "/", icon: "i-heroicons-home", moduleId: "dashboard", permissionAction: "ver" },
  { name: "Sensores", to: "/sensors", icon: "i-heroicons-chip", moduleId: "sensors", permissionAction: "ver" },
  { name: "Alertas", to: "/alerts", icon: "i-heroicons-bell", moduleId: "alerts", permissionAction: "ver" },
  { name: "Organizaciones", to: "/organizations", icon: "i-heroicons-building-office", moduleId: "organizations", permissionAction: "ver" },
  { name: "Usuarios", to: "/users", icon: "i-heroicons-users", moduleId: "users", permissionAction: "ver" },
  { name: "Permisos", to: "/permissions", icon: "i-heroicons-lock-closed", moduleId: "roles", permissionAction: "ver" },
  { name: "Parámetros", to: "/parameters", icon: "i-heroicons-cog-6-tooth", moduleId: "parameters", permissionAction: "ver" },
  { name: "Configuración", to: "/settings", icon: "i-heroicons-cog-6-tooth", moduleId: "settings", permissionAction: "ver" }
];

// Ojo: En este archivo de utilidades, la propiedad 'icon' debe ser una cadena de texto (el nombre de la clase del icono)
// no un componente Vue. El Sidebar.vue se encargará de mapear esta cadena a tu componente de icono real.
