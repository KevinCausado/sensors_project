// stores/users.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const useUserStore = defineStore('users', {
  state: () => ({
    users: [],
    currentUser: null, // Agregamos esto para almacenar el usuario actual si lo necesitas
    loading: false,
    error: null,
  }),

  getters: {
    getUsers: (state) => state.users,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    // Eliminamos getUserById de aquí, porque será una acción
    // Si aún necesitas un getter para buscar en el estado local después de que se cargue,
    // puedes tener algo como: findUserInStateById: (state) => (id) => state.users.find(user => user.id === id)
  },

  actions: {
    async fetchUsers() {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase.rpc('get_app_users'); // O directamente .from('Users').select(...)

        if (error) {
          throw error;
        }

        // Mapear los datos si get_app_users no los devuelve aplanados
        const mappedUsers = data.map(user => {
            const newUser = { ...user };
            // Si tu RPC ya devuelve organizationName y organizationId en camelCase, estas líneas no son estrictamente necesarias
            // pero es buena práctica tenerlas para robustez o si cambias el RPC.
            if (newUser.Organizations && newUser.Organizations.name) {
                newUser.organizationName = newUser.Organizations.name;
            }
            if (newUser.OrganizationId !== undefined) {
                newUser.organizationId = newUser.OrganizationId;
                delete newUser.OrganizationId; // Eliminar la versión PascalCase
            }
            delete newUser.Organizations; // Eliminar el objeto anidado
            return newUser;
        });

        this.users = mappedUsers;
      } catch (error) {
        console.error('Error fetching users:', error);
        this.error = error.message || 'Error al cargar usuarios.';
      } finally {
        this.loading = false;
      }
    },

    // --- ¡NUEVA ACCIÓN: fetchUser! (Antes era un getter) ---
    async fetchUser(id) {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        // Carga un solo usuario por ID, incluyendo la relación con Organizations
        const { data, error } = await $supabase
          .from('Users')
          .select('*, Organizations(name)') // Incluimos Organizations para obtener el nombre
          .eq('id', id)
          .single(); // Para obtener un solo registro

        if (error) {
          throw error;
        }

        // Mapear los datos para aplanar 'organizationName' y corregir 'organizationId'
        const mappedData = { ...data };
        if (mappedData.Organizations && mappedData.Organizations.name) {
          mappedData.organizationName = mappedData.Organizations.name;
        } else {
          mappedData.organizationName = 'N/A'; // Si no hay organización asociada
        }
        delete mappedData.Organizations; // Eliminar el objeto anidado

        if (mappedData.OrganizationId !== undefined) {
          mappedData.organizationId = mappedData.OrganizationId;
          delete mappedData.OrganizationId;
        }

        this.currentUser = mappedData; // Almacena el usuario cargado en el estado
        return mappedData; // Retorna el usuario mapeado
      } catch (error) {
        console.error(`Error fetching user with ID ${id}:`, error);
        this.error = error.message || 'Error al cargar el usuario.';
        throw error; // Re-lanza el error para que el componente lo capture
      } finally {
        this.loading = false;
      }
    },

    async createUser(userData) {
        this.loading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();
            
            // Mapear 'organizationId' del frontend a 'OrganizationId' para la inserción en Supabase
            const dataToInsert = { ...userData };
            if (dataToInsert.organizationId !== undefined) {
                dataToInsert.OrganizationId = dataToInsert.organizationId;
                delete dataToInsert.organizationId;
            }
            if (dataToInsert.organizationName) { // Asegúrate de no enviar esto si no es una columna real
                delete dataToInsert.organizationName;
            }
            
            // Primero, crea el usuario en Supabase Auth
            const { data: authData, error: authError } = await $supabase.auth.signUp({
                email: dataToInsert.email,
                password: dataToInsert.password, // Asegúrate de que userData incluya la contraseña
            });

            if (authError) throw authError;

            // Si el registro de auth fue exitoso, inserta los datos adicionales en public."Users"
            if (authData.user) {
                const { error: profileError } = await $supabase.from('Users').insert({
                    id: authData.user.id, // El ID de public."Users" es el mismo que auth.users.id
                    "firstName": dataToInsert.firstName,
                    "lastName": dataToInsert.lastName,
                    email: dataToInsert.email,
                    role: dataToInsert.role,
                    "OrganizationId": dataToInsert.OrganizationId, // Usar el nombre de columna correcto para Supabase
                    // Supabase debería gestionar createdAt y updatedAt si los configuraste con DEFAULT now()
                    // "lastLogin": authData.user.last_sign_in_at || null, // last_sign_in_at puede ser nulo en el momento de creación
                    // "createdAt": authData.user.created_at,
                    // "updatedAt": authData.user.updated_at
                }).select(); // Agrega .select() para obtener los datos insertados

                if (profileError) throw profileError;

                // Después de insertar, puedes refrescar la lista o agregar el usuario localmente
                // Para simplificar, podrías simplemente llamar a fetchUsers() de nuevo
                await this.fetchUsers();
                return dataToInsert; // O el usuario recién creado si profileError no ocurrió
            }
        } catch (error) {
            console.error('Error creating user:', error);
            this.error = error.message || 'Error al crear usuario.';
            throw error;
        } finally {
            this.loading = false;
        }
    },


    async updateUser(id, updates) {
        this.loading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();

            // Mapear 'organizationId' del frontend a 'OrganizationId' para la actualización en Supabase
            const dataToUpdate = { ...updates };
            if (dataToUpdate.organizationId !== undefined) {
                dataToUpdate.OrganizationId = dataToUpdate.organizationId;
                delete dataToUpdate.organizationId;
            }
            if (dataToUpdate.organizationName) { // Asegúrate de no enviar esto si no es una columna real
                delete dataToUpdate.organizationName;
            }
            if (dataToUpdate.email) { // El email no se puede cambiar directamente aquí
                delete dataToUpdate.email;
            }

            const { data, error } = await $supabase
                .from('Users')
                .update(dataToUpdate) // Usar el objeto mapeado
                .eq('id', id)
                .select('*, Organizations(name)'); // Seleccionar el nombre de la organización al actualizar para el estado local

            if (error) throw error;

            // Mapear los datos devueltos para la consistencia del estado local
            const mappedData = { ...data[0] };
            if (mappedData.Organizations && mappedData.Organizations.name) {
                mappedData.organizationName = mappedData.Organizations.name;
            } else {
                mappedData.organizationName = 'N/A';
            }
            delete mappedData.Organizations;

            if (mappedData.OrganizationId !== undefined) {
                mappedData.organizationId = mappedData.OrganizationId;
                delete mappedData.OrganizationId;
            }

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
            const { error } = await $supabase.from('Users').delete().eq('id', id);
            if (error) throw error;
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