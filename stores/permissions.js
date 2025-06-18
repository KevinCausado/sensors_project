// stores/permissions.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const usePermissionStore = defineStore('permissions', {
  state: () => ({
    appModules: [], // Loaded from app_modules (id, name, description, icon, route)
    rolePermissions: {}, // Mapped permissions from role_module_permissions
    roles: [], // Loaded from roles table
    currentUserPermissions: {},

    // HARDCODED: Define the possible actions for each module here.
    // This replaces the missing 'permissions' column in app_modules.
    // The keys should match the `name` column of your app_modules.
    moduleActionDefinitions: {
      dashboard: ['view'], // 'view' is common for dashboard
      // locations: ['view', 'create', 'manage', 'delete'],
      sensors: ['view', 'create', 'manage', 'delete'],
      assets: ['view', 'create', 'manage', 'delete'],
      settings: ['view', 'manage'], // General settings might just be view/manage
      // reports: ['view', 'generate', 'manage_schedules'], // Specific for reports
      organization: ['view', 'create', 'manage', 'delete'],
      alerts: ['view', 'resolve'], // Example: view, create new alerts, manage existing, delete
      users: ['view', 'create', 'manage', 'delete'], // Includes users, roles, and possibly permissions management
      permissions: ['view', 'assign'], // For the permissions management itself
      messaging: ['view','generate'], // Monitor in real-time
      vibration_profiles: ['view', 'create', 'manage', 'delete'],
      parameters: ['view', 'create', 'manage', 'delete'],
      // asset_status: ['view', 'manage', 'delete'], // Assuming asset_status is its own module-    
      basic_analysis: ['view', 'create', 'manage', 'delete'], // Assuming 'analyze' is an action for your new module
    },
  }),

  getters: {
    can: (state) => (permissionString) => {
      const [moduleName, action] = permissionString.split('.');
      if (!moduleName || !action) {
        console.warn(`[Permissions Store] Invalid permission format: ${permissionString}. Must be 'module.action'.`);
        return false;
      }

      const superAdminRole = state.roles.find(role => role.id === state.currentUserPermissions.role_id);
      if (superAdminRole && superAdminRole.name === 'super-admin') {
          return true; // Super Admin has all permissions
      }

      const module = state.appModules.find(m => m.name === moduleName);
      if (!module) {
        // console.warn(`[Permissions Store] Module not found: ${moduleName}`);
        return false;
      }

      // Ensure the module is active before checking permissions
      if (!module.is_active) {
        // console.log(`[Permissions Store] Access denied: Module ${moduleName} is inactive.`);
        return false;
      }

      const modulePermissions = state.currentUserPermissions.modules?.[module.id];
      return modulePermissions?.[action] === true;
    },

    // New Getter: Get possible actions for a module by its name
    getModuleActions: (state) => (moduleName) => {
      return state.moduleActionDefinitions[moduleName] || [];
    },

    getRolePermissions: (state) => (roleId) => {
      return state.rolePermissions[roleId];
    },
    
    // Getter for active modules
    getActiveAppModules: (state) => {
      return state.appModules.filter(module => module.is_active);
    }
  },

  actions: {
    /**
     * Carga los módulos de la aplicación desde la tabla `app_modules`.
     * SOLO selecciona los módulos que tengan `is_active = true`.
     */
    async fetchAppModules() {
      try {
        console.log('[Permission Store] Fetching active app modules...');
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('app_modules')
          .select('id, name, description, route, icon, is_active, created_at, updated_at')
          .eq('is_active', true); // <<--- FILTRO APLICADO AQUÍ

        if (error) throw error;
        this.appModules = data;
        console.log('[Permission Store] Active App modules fetched:', this.appModules);
      } catch (error) {
        console.error('[Permission Store] Error loading app modules:', error.message);
        throw error;
      }
    },

    async fetchRolesAndPermissions() {
      try {
        console.log('[Permission Store] Fetching roles and permissions...');
        const { $supabase } = useNuxtApp();

        // 1. Fetch Roles from public.roles
        const { data: rolesData, error: rolesError } = await $supabase
          .from('roles')
          .select('id, name, type, description');

        if (rolesError) throw rolesError;
        this.roles = rolesData;
        console.log('[Permission Store] Roles fetched:', this.roles);

        // 2. Fetch Role Module Permissions from public.role_module_permissions
        const { data: roleModulePermissionsData, error: rmpError } = await $supabase
          .from('role_module_permissions')
          .select('role_id, module_id, permissions'); // 'permissions' column exists here!

        if (rmpError) throw rmpError;

        const tempRolePermissions = {};
        for (const rmp of roleModulePermissionsData) {
          if (!tempRolePermissions[rmp.role_id]) {
            tempRolePermissions[rmp.role_id] = {};
          }
          tempRolePermissions[rmp.role_id][rmp.module_id] = rmp.permissions;
        }
        this.rolePermissions = tempRolePermissions;
        console.log('[Permission Store] Role permissions fetched:', this.rolePermissions);

        // Handle Super Admin special case: give all explicit permissions
        if (this.appModules.length === 0) {
          // If appModules are not yet loaded (e.g., initial load), fetch them
          // No need to filter by is_active here, as super-admin has access to all modules,
          // regardless of their active status in the DB for internal logic.
          // The 'can' getter will handle the 'is_active' check for actual access.
          const { data: allModulesData, error: allModulesError } = await $supabase
            .from('app_modules')
            .select('id, name'); // Just need id and name for super-admin mapping
          if (allModulesError) throw allModulesError;
          this.appModules = allModulesData; // Temporarily update appModules with all for super-admin logic
        }

        const superAdminRole = this.roles.find(r => r.name === 'super-admin');
        if (superAdminRole && this.appModules.length > 0) {
          const superAdminPermissions = {};
          for (const module of this.appModules) {
            superAdminPermissions[module.id] = {};
            // Use the hardcoded moduleActionDefinitions here
            const possibleActions = this.moduleActionDefinitions[module.name];
            if (Array.isArray(possibleActions)) {
              for (const perm of possibleActions) {
                superAdminPermissions[module.id][perm] = true;
              }
            }
          }
          this.rolePermissions[superAdminRole.id] = superAdminPermissions;
          console.log('[Permission Store] Super Admin permissions generated:', this.rolePermissions[superAdminRole.id]);
        }

        await this.updateRoleUserCounts();

      } catch (error) {
        console.error('[Permission Store] Error loading roles and permissions:', error.message);
        throw error;
      }
    },

    async saveRolePermissions(roleId, newPermissions) {
      try {
        console.log(`[Permission Store] Saving permissions for role ${roleId}:`, newPermissions);
        const { $supabase } = useNuxtApp();

        const { error: deleteError } = await $supabase
          .from('role_module_permissions')
          .delete()
          .eq('role_id', roleId);

        if (deleteError) throw deleteError;

        const inserts = [];
        for (const moduleId in newPermissions) {
          const modulePerms = newPermissions[moduleId];
          const hasTruePermissions = Object.values(modulePerms).some(val => val === true);

          if (Object.prototype.hasOwnProperty.call(newPermissions, moduleId) && hasTruePermissions) {
            inserts.push({
              role_id: roleId,
              module_id: moduleId,
              permissions: modulePerms
            });
          }
        }

        if (inserts.length > 0) {
          const { error: insertError } = await $supabase
            .from('role_module_permissions')
            .insert(inserts);

          if (insertError) throw insertError;
        } else {
          console.log(`[Permission Store] No permissions with 'true' value to insert for role ${roleId}. Only existing ones were deleted.`);
        }

        this.setRolePermissionsLocally(roleId, newPermissions);
        console.log(`[Permission Store] Permissions saved to DB and updated locally for role ${roleId}:`, newPermissions);

        return true;
      } catch (error) {
        console.error('[Permission Store] Error saving permissions:', error.message);
        throw error;
      }
    },

    setRolePermissionsLocally(roleId, permissionsData) {
      this.rolePermissions[roleId] = permissionsData;
    },

   async updateRoleUserCounts() {
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('users') 
          .select('id, role_id');

        if (error) throw error;

        const roleCounts = {};
        for (const userProfile of data) { 
          if (userProfile.role_id) {
            roleCounts[userProfile.role_id] = (roleCounts[userProfile.role_id] || 0) + 1;
          }
        }

        this.roles = this.roles.map(role => ({
          ...role,
          users: roleCounts[role.id] || 0,
        }));
        console.log('[Permission Store] Role user counts updated:', this.roles.map(r => ({ name: r.name, users: r.users })));
      } catch (error) {
        console.error('[Permission Store] Error updating user count by role:', error.message);
      }
    },

    setCurrentUserPermissions(permissions) {
        this.currentUserPermissions = permissions;
        console.log('[Permission Store] Current user permissions set:', this.currentUserPermissions);
    },
  },
});
