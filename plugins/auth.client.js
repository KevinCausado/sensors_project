// plugins/auth.client.js
import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore();

  // Solo si el store no tiene usuario o perfil, intenta cargar la sesión
  if (!authStore.user || !authStore.userProfile) {
    console.log('[Auth Plugin] Initializing Auth Store on client startup...');
    authStore.isLoading = true; // Indicar que hay una carga en progreso

    try {
      // Intenta obtener la sesión de Supabase
      const { $supabase } = nuxtApp; // Accede a la instancia de Supabase
      const { data: { session }, error: sessionError } = await $supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (session && session.user) {
        authStore.user = session.user;
        console.log('[Auth Plugin] Supabase session user loaded:', session.user.id);
        // Asegúrate de que el perfil y los permisos estén cargados
        if (!authStore.userProfile) {
            console.log('[Auth Plugin] Ensuring user profile exists after session load.');
            await authStore.ensureUserProfileExists(session.user.id);
        }
      } else {
        authStore.user = null;
        authStore.userProfile = null;
        authStore.permissions = {};
        console.log('[Auth Plugin] No active Supabase session.');
      }
    } catch (error) {
      console.error('[Auth Plugin] Error during auth store initialization:', error);
      authStore.user = null;
      authStore.userProfile = null;
      authStore.permissions = {};
    } finally {
      authStore.isLoading = false; // Finalizar carga
      console.log('[Auth Plugin] Auth Store initialization complete.');
    }
  }

  // Devolver el store o cualquier otra cosa que pueda ser necesaria
  return {
    provide: {
      authStore: authStore
    }
  };
});