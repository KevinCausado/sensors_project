// stores/users.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const useUserStore = defineStore('users', {
  state: () => ({
    users: [],
    currentUser: null,
    loading: false,
    error: null,
    roles: [],
    organizations: [],
  }),

  getters: {
    getUsers: (state) => state.users,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getRoles: (state) => state.roles,
    getOrganizations: (state) => state.organizations,
    findUserInStateById: (state) => (id) => state.users.find(user => user.id === id),
  },

  actions: {
    async fetchUsers() {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data: usersData, error: usersError } = await $supabase.rpc('get_app_users');
        if (usersError) throw usersError;

        this.users = usersData.map(user => ({
          ...user,
          id: user.user_profile_id,
        }));

      } catch (error) {
        console.error('Error fetching users:', error);
        this.error = error.message || 'Error al cargar usuarios.';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchRoles() {
        this.loading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();
            const { data, error } = await $supabase.from('roles').select('id, name');
            if (error) throw error;
            this.roles = data;
        } catch (error) {
            console.error('Error fetching roles:', error);
            this.error = error.message || 'Error al cargar roles.';
            throw error;
        } finally {
            this.loading = false;
        }
    },

    async fetchOrganizations() {
        this.loading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();
            const { data, error } = await $supabase.from('organizations').select('id, name');
            if (error) throw error;
            this.organizations = data;
        } catch (error) {
            console.error('Error fetching organizations:', error);
            this.error = error.message || 'Error al cargar organizaciones.';
            throw error;
        } finally {
            this.loading = false;
        }
    },

    async fetchUserById(id) {
        this.loading = true;
        this.error = null;
        try {
            
            const userFromState = this.users.find(u => u.id === id);
            if (userFromState && userFromState.last_login) {
                this.currentUser = userFromState;
                return this.currentUser;
            }            
            const { $supabase } = useNuxtApp();
            const { data: usersData, error: usersError } = await $supabase.rpc('get_app_users');
            if (usersError) throw usersError;

            const userData = usersData.find(u => u.user_profile_id === id);

            if (userData) {                
                this.currentUser = {
                    ...userData,
                    id: userData.user_profile_id,
                };
            } else {
                this.currentUser = null;
            }
            return this.currentUser;

        } catch (error) {
            console.error('Error fetching user by ID:', error);
            this.error = error.message || 'Error al cargar usuario.';
            throw error;
        } finally {
            this.loading = false;
        }
    },

    async createUser(userData) {
        this.loading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();

            // 1. Registrar el usuario en la autenticación de Supabase
            const { data: authData, error: authError } = await $supabase.auth.signUp({
                email: userData.email,
                password: userData.password
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                     throw new Error('Este email ya está registrado. Por favor, usa uno diferente o edita el usuario existente.');
                }
                throw authError;
            }

            // 2. Obtener el ID del usuario de autenticación
            const authUserId = authData.user?.id;
            if (!authUserId) {
                throw new Error('No se pudo obtener el ID del usuario de autenticación después del registro.');
            }

            // 3. Preparar el objeto de datos para insertar en la tabla 'users'
            // Asegúrate de incluir 'auth_id' con el ID del usuario de autenticación.
            // La columna 'id' en tu tabla 'users' puede ser una PK auto-generada
            // o puede ser la misma que 'auth_id'. Aquí asumimos que 'auth_id' es una columna separada y requerida.
            const userToInsert = {
                auth_id: authUserId, // <--- CAMBIO CLAVE: Asignar el ID de autenticación a 'auth_id'
                email: userData.email,
                first_name: userData.firstName,
                last_name: userData.lastName,
                role_id: userData.role_id, // Espera el ID del rol (UUID)
                organization_id: userData.organization_id, // Espera el ID de la organización (UUID)
                is_active: userData.is_active !== undefined ? userData.is_active : true,
            };

            // 4. Insertar el perfil del usuario en la tabla 'users'
            const { data: newUserProfile, error: insertError } = await $supabase
                .from('users')
                .insert([userToInsert])
                .select(`
                    id,
                    auth_id,
                    email,
                    first_name,
                    last_name,
                    is_active,
                    last_login,
                    organization_id,
                    role_id,
                    roles(name),
                    organizations(name)
                `)
                .single();

            if (insertError) throw insertError;

            // 5. Mapear los datos para el estado del store
            const mappedUser = {
                ...newUserProfile,
                role_name: newUserProfile.roles?.name || 'N/A',
                organization_name: newUserProfile.organizations?.name || 'N/A',
            };
            delete mappedUser.roles;
            delete mappedUser.organizations;

            // 6. Actualizar el estado del store
            this.users.push(mappedUser);
            return mappedUser;

        } catch (error) {
            console.error('Error creating user:', error);
            this.error = error.message || 'Error al crear usuario.';
            throw error;
        } finally {
            this.loading = false;
        }
    },

    async updateUser(id, userData) {
        this.loading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();

            const updates = {
                first_name: userData.firstName,
                last_name: userData.lastName,
                is_active: userData.is_active,
                role_id: userData.role_id,
                organization_id: userData.organization_id,
            };

            const { data, error: updateError } = await $supabase
                .from('users')
                .update(updates)
                .eq('id', id)
                .select(`
                    id,
                    email,
                    first_name,
                    last_name,
                    is_active,
                    last_login,
                    organization_id,
                    role_id,
                    roles(name),
                    organizations(name)
                `)
                .single();

            if (updateError) throw updateError;

            const mappedData = {
                ...data,
                role_name: data.roles?.name || 'N/A',
                organization_name: data.organizations?.name || 'N/A',
            };
            delete mappedData.roles;
            delete mappedData.organizations;

            const index = this.users.findIndex(u => u.id === id);
            if (index !== -1) {
                Object.assign(this.users[index], mappedData);
            }
            if (this.currentUser?.id === id) {
                this.currentUser = mappedData;
            }
            return mappedData;
        } catch (error) {
            console.error('Error updating user:', error);
            this.error = error.message || 'Error al actualizar usuario.';
            throw error;
        } finally {
            this.loading = false;
        }
    },

    async deleteUser(id) {
        this.loading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();

            const { error: deleteProfileError } = await $supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (deleteProfileError) throw deleteProfileError;

            this.users = this.users.filter(u => u.id !== id);
            if (this.currentUser?.id === id) {
                this.currentUser = null;
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.error = error.message || 'Error al eliminar usuario.';
            throw error;
        } finally {
            this.loading = false;
        }
    },
  },
});