// stores/permissions.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const usePermissionStore = defineStore('permissions', {
  state: () => ({
    appModules: [], 
    rolePermissions: {},
    roles: [],
    currentUserPermissions: {},

    // Definición de acciones por módulo.
    moduleActionDefinitions: {
      dashboard: ['view'],
      reports: ['view'], 
      report_schedules: ['view', 'create', 'manage', 'delete', 'generate'],
      report_configurations: ['view', 'create', 'manage', 'delete'],
      sensors: ['view', 'create', 'manage', 'delete'],
      assets: ['view', 'create', 'manage', 'delete'],
      settings: ['view', 'manage'],
      organization: ['view', 'create', 'manage', 'delete'],
      alerts: ['view', 'resolve'],
      users: ['view', 'create', 'manage', 'delete'],
      permissions: ['view', 'assign'],
      messaging: ['view','generate'],
      vibration_profiles: ['view', 'create', 'manage', 'delete'],
      parameters: ['view', 'create', 'manage', 'delete'],
      asset_status: ['view'],
      basic_analysis: ['view'],
    },
  }),

  getters: {
    // NUEVO GETTER: Convierte la lista plana de módulos en una estructura de árbol.
    hierarchicalModules: (state) => {
      const modules = JSON.parse(JSON.stringify(state.appModules));
      const moduleMap = {};
      const result = [];

      modules.forEach(module => {
        module.children = [];
        moduleMap[module.id] = module;
      });

      modules.forEach(module => {
        if (module.parent_id && moduleMap[module.parent_id]) {
          moduleMap[module.parent_id].children.push(module);
        } else {
          result.push(module); // Módulos de nivel superior
        }
      });
      return result;
    },

    can: (state) => (permissionString) => {
      const [moduleName, action] = permissionString.split('.');
      if (!moduleName || !action) return false;

      const superAdminRole = state.roles.find(role => role.id === state.currentUserPermissions.role_id);
      if (superAdminRole?.name === 'super-admin') return true;

      const module = state.appModules.find(m => m.name === moduleName);
      if (!module || !module.is_active) return false;

      const modulePermissions = state.currentUserPermissions.modules?.[module.id];
      return modulePermissions?.[action] === true;
    },

    getModuleActions: (state) => (moduleName) => {
      return state.moduleActionDefinitions[moduleName] || [];
    },

    getRolePermissions: (state) => (roleId) => {
      return state.rolePermissions[roleId];
    },
    
    getActiveAppModules: (state) => {
      return state.appModules.filter(module => module.is_active);
    }
  },

  actions: {
    async fetchAppModules() {
      try {
        const { $supabase } = useNuxtApp();
        // MODIFICADO: Ahora también pide el 'parent_id'.
        const { data, error } = await $supabase
          .from('app_modules')
          .select('id, name, description, route, icon, is_active, parent_id')
          .eq('is_active', true);

        if (error) throw error;
        this.appModules = data;
      } catch (error) {
        console.error('[Permission Store] Error loading app modules:', error.message);
        throw error;
      }
    },
    
    // El resto de las acciones no necesitan cambios.
    async fetchRolesAndPermissions() {
      try {
        const { $supabase } = useNuxtApp();

        const { data: rolesData, error: rolesError } = await $supabase
          .from('roles')
          .select('id, name, type, description');

        if (rolesError) throw rolesError;
        this.roles = rolesData;

        const { data: roleModulePermissionsData, error: rmpError } = await $supabase
          .from('role_module_permissions')
          .select('role_id, module_id, permissions');

        if (rmpError) throw rmpError;

        const tempRolePermissions = {};
        for (const rmp of roleModulePermissionsData) {
          if (!tempRolePermissions[rmp.role_id]) {
            tempRolePermissions[rmp.role_id] = {};
          }
          tempRolePermissions[rmp.role_id][rmp.module_id] = rmp.permissions;
        }
        this.rolePermissions = tempRolePermissions;

        if (this.appModules.length === 0) {
          await this.fetchAppModules();
        }

        const superAdminRole = this.roles.find(r => r.name === 'super-admin');
        if (superAdminRole && this.appModules.length > 0) {
          const superAdminPermissions = {};
          for (const module of this.appModules) {
            superAdminPermissions[module.id] = {};
            const possibleActions = this.moduleActionDefinitions[module.name];
            if (Array.isArray(possibleActions)) {
              for (const perm of possibleActions) {
                superAdminPermissions[module.id][perm] = true;
              }
            }
          }
          this.rolePermissions[superAdminRole.id] = superAdminPermissions;
        }

        await this.updateRoleUserCounts();

      } catch (error) {
        console.error('[Permission Store] Error loading roles and permissions:', error.message);
        throw error;
      }
    },

    async saveRolePermissions(roleId, newPermissions) {
      try {
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
        }

        this.setRolePermissionsLocally(roleId, newPermissions);
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
      } catch (error) {
        console.error('[Permission Store] Error updating user count by role:', error.message);
      }
    },

    setCurrentUserPermissions(permissions) {
        this.currentUserPermissions = permissions;
    },
  },
});
