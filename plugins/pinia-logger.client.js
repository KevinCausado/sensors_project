// plugins/pinia-logger.client.js
export default defineNuxtPlugin(async (nuxtApp) => {
  nuxtApp.$pinia.use(({ store }) => {
    store.$subscribe((mutation, state) => {
      // Solo registra los cambios en el authStore por ahora para mantenerlo limpio
      if (store.$id === 'auth') {
        console.warn(`[PINIA AUTH STATE CHANGE] Tienda: ${store.$id}, Tipo: ${mutation.type}`);
        console.warn('[PINIA AUTH STATE CHANGE] Carga de la Mutación:', mutation.payload); // Qué cambió exactamente
        console.warn('[PINIA AUTH STATE CHANGE] NUEVO ESTADO DE AUTENTICACIÓN:', JSON.parse(JSON.stringify(state))); // El estado completo y nuevo
      }
    });

    store.$onAction(({ name, store, args, after, onError }) => {
      after(() => {
        if (store.$id === 'auth') {
          console.warn(`[PINIA AUTH ACTION END] Tienda: ${store.$id}, Acción: ${name} FINALIZADA`);
          console.warn('[PINIA AUTH ACTION END] ESTADO ACTUAL DE AUTENTICACIÓN DESPUÉS DE LA ACCIÓN:', JSON.parse(JSON.stringify(store.$state)));
        }
      });
      onError((error) => {
        if (store.$id === 'auth') {
          console.error(`[PINIA AUTH ACTION ERROR] Tienda: ${store.$id}, Acción: ${name} FALLÓ con error:`, error);
          console.error('[PINIA AUTH ACTION ERROR] ESTADO ACTUAL DE AUTENTICACIÓN DESPUÉS DEL ERROR:', JSON.parse(JSON.stringify(store.$state)));
        }
      });
    });
  });
});