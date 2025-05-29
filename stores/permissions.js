// stores/permissions.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app'; // Necesitamos esto para acceder a $supabase

export const usePermissionStore = defineStore('permissions', {
  state: () => ({
    // 'permissions' no parece usarse, puedes considerar quitarlo si no tiene un propósito
    permissions: [],
    rolePermissions: {}, // Aquí guardaremos los permisos cargados de los roles
    modules: [
      // ... tus módulos ...
      {
        id: 'dashboard',
        name: 'Dashboard',
        permissions: ['ver']
      },
      {
        id: 'sensors',
        name: 'Sensores',
        permissions: ['ver', 'crear', 'editar', 'eliminar']
      },
      {
        id: 'alerts',
        name: 'Alertas',
        permissions: ['ver', 'resolver']
      },
      {
        id: 'organizations',
        name: 'Organizaciones',
        permissions: ['ver', 'crear', 'editar', 'eliminar']
      },
      {
        id: 'users',
        name: 'Usuarios',
        permissions: ['ver', 'crear', 'editar', 'eliminar']
      },
      {
        id: 'roles', // Este módulo es para "Roles y Permisos"
        name: 'Roles y Permisos',
        permissions: ['ver', 'asignar']
      },
      {
        id: 'parameters',
        name: 'Parámetros',
        permissions: ['ver', 'crear', 'editar', 'eliminar']
      },
      {
        id: 'settings',
        name: 'Configuración',
        permissions: ['ver', 'editar']
      }
    ],
    roles: [], // Aquí se guardarán los roles con su conteo de usuarios
  }),

  getters: {
    getModulePermissions: (state) => (moduleId) => {
      return state.modules.find(m => m.id === moduleId)?.permissions || [];
    },

    // Este getter asume que rolePermissions ya está populado con los permisos
    hasPermission: (state) => (roleId, moduleId, permission) => {
      // Si el rol es 'super-admin' (basado en el ID, pero podrías usar el nombre si es más robusto)
      if (state.roles.find(r => r.id === roleId)?.name === 'super-admin') return true;

      const rolePerms = state.rolePermissions[roleId] || {};
      const modulePerms = rolePerms[moduleId] || [];
      return modulePerms.includes(permission);
    },

    getRolePermissions: (state) => (roleId) => {
      // Para el 'super-admin', siempre devuelve todos los permisos definidos en `modules`
      if (state.roles.find(r => r.id === roleId)?.name === 'super-admin') {
        const superAdminPerms = {};
        state.modules.forEach(module => {
          superAdminPerms[module.id] = [...module.permissions];
        });
        return superAdminPerms;
      }
      return state.rolePermissions[roleId] || {};
    }
  },

  actions: {
    // Acción para cargar roles y su conteo de usuarios
    async fetchRoles() {
      try {
        const { $supabase } = useNuxtApp();

        // 1. Obtener todos los roles
        const { data: rolesData, error: rolesError } = await $supabase
          .from('Roles') // Nombre de tu tabla de roles
          .select('id, name, description, permissions'); // Selecciona 'permissions' que es JSONB

        if (rolesError) throw rolesError;

        // 2. Para cada rol, contar los usuarios asociados
        const rolesWithCounts = await Promise.all(rolesData.map(async (role) => {
          const { count, error: countError } = await $supabase
            .from('Users') // ¡La tabla de usuarios es 'Users'!
            .select('id', { count: 'exact', head: true }) // Optimizado para solo contar
            .eq('role', role.name); // <--- ¡¡¡AHORA USANDO 'role' COMO NOMBRE DE LA COLUMNA!!!

          if (countError) {
            console.error(`Error al contar usuarios para el rol ${role.name}:`, countError);
            return { ...role, users: 0 }; // Retorna 0 si hay error
          }
          return { ...role, users: count };
        }));

        this.roles = rolesWithCounts;
        console.log('Roles cargados con conteo de usuarios:', this.roles);

        // 3. Inicializa rolePermissions con los datos de la base de datos
        const tempRolePermissions = {};
        rolesWithCounts.forEach(role => {
          tempRolePermissions[role.id] = role.permissions || {};
        });
        this.rolePermissions = tempRolePermissions;
        console.log('Permisos de roles inicializados:', this.rolePermissions);

      } catch (error) {
        console.error('Error fetching roles and user counts:', error.message);
        this.roles = []; // Limpia los roles en caso de error
        this.rolePermissions = {}; // Limpia los permisos en caso de error
        throw error;
      }
    },

    setRolePermissions(roleId, permissions) {
      this.rolePermissions[roleId] = permissions;
    },

    async saveRolePermissions(roleId, newPermissions) {
      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('Roles')
          .update({ permissions: newPermissions })
          .eq('id', roleId)
          .select('id, name, description, permissions')
          .single();

        if (error) {
          console.error('Error al guardar permisos en Supabase:', error);
          throw error;
        }

        if (data) {
          this.setRolePermissions(roleId, data.permissions);

          const index = this.roles.findIndex(r => r.id === roleId);
          if (index !== -1) {
            this.roles[index] = { ...this.roles[index], permissions: data.permissions };
          }
        }

        return true;
      } catch (error) {
        console.error('Error al guardar permisos:', error);
        throw error;
      }
    }
  }
});