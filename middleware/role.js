export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore();
  
  if (!authStore.isAuthenticated) {
    return;
  }
  
  // Check if route requires specific role
  if (to.meta.requiredRole && !authStore.hasRole(to.meta.requiredRole)) {
    return navigateTo('/unauthorized');
  }
});