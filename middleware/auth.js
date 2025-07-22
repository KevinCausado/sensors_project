// middleware/auth.js
import { useAuthStore } from '~/stores/auth';
import { navigationItems } from '~/utils/navigation'; // Importa aquí también

export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore();

 
  // 1. Esperar a que el estado de autenticación termine de cargar (isLoading === false)
  if (authStore.isLoading) {
    
    await new Promise(resolve => {
      const unsubscribe = authStore.$subscribe((mutation, state) => {
        if (!state.isLoading) {        
          unsubscribe(); 
          resolve();
        }
      });
      if (!authStore.isLoading) {
        unsubscribe();
        resolve();
      }
    });
  
  }

  // 2. Si la ruta requiere autenticación y el usuario NO está autenticado
  const requiresAuth = to.meta.middleware?.includes('auth') || to.matched.some(record => record.meta.requiresAuth); 
  
  if (requiresAuth && !authStore.isAuthenticated) {    
    await new Promise(resolve => {
      const unsubscribe = authStore.$subscribe((mutation, state) => {
        if (state.isAuthenticated) {         
          unsubscribe();
          resolve();
        }
      });
      if (authStore.isAuthenticated) {
        unsubscribe();
        resolve();
      }
    });    
  }

  // 3. Redirección basada en el estado de autenticación y permisos
  if (!authStore.isAuthenticated && to.path !== '/auth/login' && to.path !== '/auth/register' && to.path !== '/auth/forgot-password' && to.path !== '/auth/update-password') {
    
    return navigateTo('/auth/login');
  } else if (authStore.isAuthenticated && (to.path === '/auth/login' || to.path === '/auth/register' || to.path === '/auth/forgot-password' || to.path === '/auth/update-password')) {
      
    // Asegúrate de que los roles y permisos del usuario estén cargados
    if (!authStore.userProfile || Object.keys(authStore.permissions).length === 0) {
      // Necesitas tener el `user` de Supabase Auth para llamar a `ensureUserProfileExists`
      const { $supabase } = useNuxtApp();
      const { data: { user } } = await $supabase.auth.getUser();
      if (user) {
        authStore.user = user; // Asegúrate de que el user de Supabase esté en el store
        await authStore.ensureUserProfileExists(user.id);
      } else {        
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

        if (!authStore.can(requiredModuleId + '.' + requiredPermissionAction)) {           
            return navigateTo('/unauthorized'); 
        }
    }
  }
  
});