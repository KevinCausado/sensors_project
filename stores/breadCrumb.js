import { defineStore } from 'pinia';

/**
 * Este store gestiona los nombres de los segmentos dinámicos de las migas de pan (breadcrumbs).
 * Permite que las páginas de detalle (ej. la página de una organización específica)
 * comuniquen su nombre al componente de breadcrumbs.
 */
export const useBreadcrumbStore = defineStore('breadcrumbs', {
  state: () => ({
    // Almacena los nombres para rutas específicas.
    // Ejemplo: { '/organizations/abc-123': 'VibrAI' }
    dynamicNames: {},
  }),
  actions: {
    /**
     * Establece un nombre para una ruta específica.
     * @param {object} payload - Un objeto con 'path' y 'name'.
     * @param {string} payload.path - La ruta completa (ej. /organizations/abc-123).
     * @param {string} payload.name - El nombre a mostrar (ej. VibrAI).
     */
    setNameForPath({ path, name }) {
      this.dynamicNames[path] = name;
    },
    /**
     * Limpia el nombre de una ruta para evitar que se muestre en otras páginas.
     * @param {string} path - La ruta a limpiar.
     */
    clearNameForPath(path) {
      delete this.dynamicNames[path];
    },
  },
});
