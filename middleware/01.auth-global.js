// middleware/auth.global.js
import { useAuthStore } from '~/stores/auth';
import { navigationItems } from '~/utils/navigation'; // Asegúrate de que esta ruta sea correcta

export default defineNuxtRouteMiddleware(async (to, from) => {
    const authStore = useAuthStore();

    // console.log(`[AUTH_MW_CRITICAL] to.path: "<span class="math-inline">\{to\.path\}", from\.path\: "</span>{from.path}"`);
    // console.log(`[AUTH_MW_CRITICAL] Current authStore.isAuthenticated: ${authStore.isAuthenticated}`);

    // ----------------------------------------------------------------------
    // PUNTO CLAVE: Asegurar que el estado del store esté completamente cargado.
    // Usamos una combinación para manejar la carga inicial y posibles inconsistencias.
    // Si no hay usuario en el store O el perfil no ha sido cargado aún,
    // y no estamos YA en proceso de carga, entonces llamamos a checkAuth y esperamos.
    // Esto asegura que el middleware no proceda hasta que el store esté listo.
    if ((!authStore.user || !authStore.userProfile) && !authStore.isLoading) {
        // console.log('[Middleware] El store de autenticación no está listo. Llamando a checkAuth y esperando...');
        await authStore.checkAuth(); // <-- Espera explícitamente aquí
        // console.log('[Middleware] checkAuth en middleware completado. Estado actual:', authStore.isAuthenticated);
    } else if (authStore.isLoading) {
        // Si ya está cargando (porque el plugin 01.auth-initializer lo inició),
        // debemos esperar a que esa carga termine.
        // Una forma simple es usar un pequeño bucle de espera, o un watcher si fuera un componente.
        // Para middlewares, un bucle es más directo.
        // console.log('[Middleware] Store ya está cargando. Esperando a que finalice...');
        // let retries = 0;
        const maxRetries = 10; // Evitar bucles infinitos
        while (authStore.isLoading && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Espera 50ms
            retries++;
        }
        if (authStore.isLoading) {
            console.warn('[Middleware] Timeout esperando que checkAuth termine. Procediendo de todas formas.');
        } else {
            //  console.log('[Middleware] Espera por carga de store finalizada. Estado actual:', authStore.isAuthenticated);
        }
    }
    // ----------------------------------------------------------------------

    // Ahora, authStore.isAuthenticated y authStore.userProfile deberían ser fiables
    const isAuthenticated = authStore.isAuthenticated;
    const isProfileLoaded = !!authStore.userProfile;

    // Rutas que no requieren autenticación (ej: login, register)
    const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/update-password'];
    const isPublicRoute = publicRoutes.includes(to.path);

    // 1. Si no hay usuario autenticado y la ruta es protegida, redirige al login
    if (!isAuthenticated && !isPublicRoute) {
        // console.log(`[Middleware] No autenticado y ruta protegida (${to.path}). Redirigiendo a /auth/login.`);
        return navigateTo('/auth/login');
    }

    // 2. Si hay un usuario autenticado y la ruta es pública (excepto login/register, que permitimos para logout)
    // Esto evita que un usuario logueado acceda directamente a /auth/login o /auth/register si ya está dentro.
    if (isAuthenticated && isPublicRoute && to.path !== '/auth/login' && to.path !== '/auth/register') {
        // console.log(`[Middleware] Autenticado y ruta pública (${to.path}). Redirigiendo a /. (dashboard)`);
        return navigateTo('/');
    }

    // 3. LÓGICA DE PERMISOS PARA RUTAS PROTEGIDAS
    if (isAuthenticated && !isPublicRoute) {
        // Asegurarse de que el userProfile y los permisos estén cargados para las verificaciones de 'can'
        // Esta línea ya debería ser manejada por la lógica principal de espera, pero como doble verificación.
        if (!isProfileLoaded && authStore.user?.id) { // Solo si tenemos un user de Supabase pero no el perfil
            console.warn('[Middleware] Usuario autenticado, pero perfil no cargado. Forzando carga (segundo intento).');
            await authStore.ensureUserProfileExists(authStore.user.id);
        }

        const requiresPermission = to.meta.permission;

        if (requiresPermission) {
            const currentRole = authStore.userProfile?.role;
            if (currentRole === 'super-admin') {
                // console.log(`[Middleware] Super-admin accediendo a ruta ${to.path}. Permiso: ${requiresPermission} (concedido por rol).`);
                return;
            }

            const hasPermission = authStore.can(requiresPermission);

            if (!hasPermission) {
                console.warn(`[Middleware] Acceso denegado a ${to.path} (falta permiso: ${requiresPermission}). Buscando ruta alternativa...`);
                // Asegúrate de que navigationItems esté disponible, como discutimos antes.
                const nuxtApp = useNuxtApp();
                const navigationItems = nuxtApp.$config.public.navigationItems || []; // Acceso seguro

                for (const item of navigationItems) {
                    if (item.moduleId && item.permissionAction) {
                        const itemPermissionPath = `${item.moduleId}.${item.permissionAction}`;
                        if (authStore.can(itemPermissionPath)) {
                            // console.log(`[Middleware] Redirigiendo a la primera ruta accesible: ${item.to}`);
                            return navigateTo(item.to);
                        }
                    }
                }

                console.warn('[Middleware] No se encontraron rutas accesibles. Redirigiendo a /acceso-denegado.');
                return navigateTo('/acceso-denegado');
            }
        }
    }

    // console.log(`[Middleware] Acceso permitido a ${to.path}.`);
});