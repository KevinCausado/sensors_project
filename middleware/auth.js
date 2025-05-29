// middleware/auth.js
import { useAuthStore } from '~/stores/auth';
import { navigationItems } from '~/utils/navigation'; // Importa aquí también

export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore();

  console.log(`[Auth Middleware] Navigating to: ${to.path}, from: ${from.path}`);
  console.log(`[Auth Middleware] Initial authStore.isLoading: ${authStore.isLoading}, authStore.isAuthenticated: ${authStore.isAuthenticated}`);

  // 1. Esperar a que el estado de autenticación termine de cargar (isLoading === false)
  if (authStore.isLoading) {
    console.log('[Auth Middleware] Waiting for auth state to load (via isLoading)...');
    await new Promise(resolve => {
      const unsubscribe = authStore.$subscribe((mutation, state) => {
        if (!state.isLoading) {
          console.log('[Auth Middleware] isLoading is now false.');
          unsubscribe(); 
          resolve();
        }
      });
      if (!authStore.isLoading) {
        unsubscribe();
        resolve();
      }
    });
    console.log('[Auth Middleware] Auth state finished loading. Current isAuthenticated:', authStore.isAuthenticated);
  }

  // 2. Si la ruta requiere autenticación y el usuario NO está autenticado
  const requiresAuth = to.meta.middleware?.includes('auth') || to.matched.some(record => record.meta.requiresAuth); 
  
  if (requiresAuth && !authStore.isAuthenticated) {
    console.log('[Auth Middleware] Route requires auth, but isAuthenticated is false. Waiting for authentication...');
    await new Promise(resolve => {
      const unsubscribe = authStore.$subscribe((mutation, state) => {
        if (state.isAuthenticated) {
          console.log('[Auth Middleware] isAuthenticated is now true.');
          unsubscribe();
          resolve();
        }
      });
      if (authStore.isAuthenticated) {
        unsubscribe();
        resolve();
      }
    });
    console.log('[Auth Middleware] Authentication status determined. Final isAuthenticated:', authStore.isAuthenticated);
  }

  // 3. Redirección basada en el estado de autenticación y permisos
  if (!authStore.isAuthenticated && to.path !== '/auth/login' && to.path !== '/auth/register' && to.path !== '/auth/forgot-password' && to.path !== '/auth/update-password') {
    // Añade aquí todas tus rutas públicas para evitar bucles de redirección
    console.log('[Auth Middleware] Not authenticated, redirecting to /auth/login');
    return navigateTo('/auth/login');
  } else if (authStore.isAuthenticated && (to.path === '/auth/login' || to.path === '/auth/register' || to.path === '/auth/forgot-password' || to.path === '/auth/update-password')) {
    // Si ya está autenticado y trata de ir a una página de auth, redirige a la primera ruta permitida
    console.log('[Auth Middleware] Authenticated and trying to access an auth page. Determining redirect path...');
    
    // Asegúrate de que los roles y permisos del usuario estén cargados
    if (!authStore.userProfile || Object.keys(authStore.permissions).length === 0) {
      // Necesitas tener el `user` de Supabase Auth para llamar a `ensureUserProfileExists`
      const { $supabase } = useNuxtApp();
      const { data: { user } } = await $supabase.auth.getUser();
      if (user) {
        authStore.user = user; // Asegúrate de que el user de Supabase esté en el store
        await authStore.ensureUserProfileExists(user.id);
      } else {
        // Esto podría indicar un problema, ya que se supone que está autenticado
        console.error('[Auth Middleware] Authenticated, but no Supabase user found. Redireting to login.');
        return navigateTo('/auth/login');
      }
    }

    let redirectToPath = '/'; 
    for (const item of navigationItems) {
      if (item.children && item.children.length > 0) {
        for (const childItem of item.children) {
          const moduleId = childItem.moduleId;
          const permissionAction = childItem.permissionAction || 'view';
          if (childItem.to && authStore.can(moduleId + '.' + permissionAction)) {
            redirectToPath = childItem.to;
            break;
          }
        }
        if (redirectToPath !== '/') {
          break;
        }
      } else {
        const moduleId = item.moduleId;
        const permissionAction = item.permissionAction || 'view';
        if (item.to && authStore.can(moduleId + '.' + permissionAction)) {
          redirectToPath = item.to;
          break;
        }
      }
    }

    console.log('[Auth Middleware] Authenticated, redirecting from auth page to:', redirectToPath);
    return navigateTo(redirectToPath);
  }

  // APLICA LA LÓGICA DE PERMISOS PARA CUALQUIER RUTA PROTEGIDA
  if (requiresAuth && authStore.isAuthenticated) {
    const requiredModuleId = to.meta.moduleId;
    const requiredPermissionAction = to.meta.permissionAction;

    if (requiredModuleId && requiredPermissionAction) {
        // Asegúrate de que los permisos estén cargados antes de verificar
        if (!authStore.userProfile || Object.keys(authStore.permissions).length === 0) {
             const { $supabase } = useNuxtApp();
             const { data: { user } } = await $supabase.auth.getUser();
             if (user) {
                authStore.user = user;
                await authStore.ensureUserProfileExists(user.id);
             } else {
                console.error('[Auth Middleware] Authenticated but user data missing during permission check.');
                return navigateTo('/auth/login'); // Fallback si no se puede obtener el user
             }
        }

        if (!authStore.can(requiredModuleId + '.' + requiredPermissionAction)) { // Usar authStore.can
            console.log(`[Auth Middleware] User does not have permission for ${to.path}. Redirecting to /unauthorized`);
            return navigateTo('/unauthorized'); 
        }
    }
  }

  console.log('[Auth Middleware] Navigation allowed.');
});