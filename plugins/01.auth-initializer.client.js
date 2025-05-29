// plugins/01.auth-initializer.client.js

import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore();

  // Solo ejecuta checkAuth si la aplicación no está en modo SSR (servidor)
  if (process.client) {
    // Si no hay usuario cargado y no estamos ya en un estado de carga,
    // o si el usuario no está completamente autenticado (ej. solo el user de Supabase, no el perfil)
    // Forzamos la carga inicial.
    // Esto es CRÍTICO para que el store esté listo antes de que los middlewares evalúen las rutas.
    if (!authStore.isAuthenticated || !authStore.userProfile) {
        console.log('[Auth Initializer Plugin] Realizando checkAuth inicial para hidratar el store.');
        await authStore.checkAuth(); // Espera a que checkAuth complete
        console.log('[Auth Initializer Plugin] checkAuth inicial completado.');
    } else {
        console.log('[Auth Initializer Plugin] Store de autenticación ya hidratado.');
    }

    // Inicia el listener de Supabase Auth UNA SOLA VEZ
    // (Este es para reaccionar a cambios posteriores como logout en otra pestaña)
    if (!authStore.authListenerUnsubscribe) { // Evita iniciar el listener múltiples veces
        authStore.initAuthListener();
        console.log('[Auth Initializer Plugin] Listener de Auth iniciado.');
    }
  }
});