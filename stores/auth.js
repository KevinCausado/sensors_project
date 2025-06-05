// stores/auth.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
// Asegúrate de que useSupabaseClient esté importado correctamente para tu entorno Nuxt/Supabase

import { navigateTo } from '#app'; // Importar navigateTo si se usa explícitamente

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Objeto de usuario de Supabase Auth (auth.users)
    userProfile: null, // Objeto de perfil desde tu tabla 'users' (ANTES: 'Users' -> ahora minúsculas)
    role: null, // El rol personalizado del usuario (ej: 'super-admin', 'Visor') (ANTES: 'viewer' -> ahora 'Visor' como predeterminado en BD)
    permissions: {}, // Estado para almacenar los permisos (objeto de permisos agrupados por módulo)
    isLoading: false, // Indicador general de carga para operaciones de auth
    error: null, // Para almacenar mensajes de error de autenticación
    availableRoles: [], // Lista de roles disponibles desde la tabla 'roles' (ANTES: 'Roles' -> ahora minúsculas)
    authListenerUnsubscribe: null, // Para guardar la función de desuscripción del listener de Supabase Auth
    // New states for form management and permissions
    editMode: false,
    currentOrganizationId: null,
    editingUser: null,
    editingUserRole: null, // Stores the role ID for the editing user
    selectedOrganizationId: null, // For creating new users or filtering
    userPermissions: {}, // Permissions for the user being edited
    // For managing user list and pagination
    users: [],
    page: 1,
    limit: 10,
    totalUsers: 0,
    totalPages: 1,
    searchQuery: '', // For user search
    filterRole: '', // For role filter
    filterOrganization: '', // For organization filter
    organizations: [], // List of organizations for filters or new users
    // States related to roles management
    roles: [],
    editingRole: null,
    editingRolePermissions: {}, // Permissions for the role being edited
    rolePermissionsLoaded: false, // Flag to indicate if role permissions are loaded
    defaultPermissions: {
      read: false,
      write: false,
      create: false,
      delete: false,
      manage_users: false,
      manage_roles: false,
      manage_alerts: false,
      generate: false,
      manage_parameters: false,
    },
    appModules: [], // Stores available app modules (from the new app_modules table)
    initialPermissions: {}, // To track changes when editing a role
  }),

  getters: {
    isAuthenticated: (state) => !!state.user, // True si hay un usuario autenticado
    userRole: (state) => state.userProfile?.role || null, // Rol del userProfile

    // Comprueba si el usuario tiene un rol específico o uno de varios roles
    hasRole: (state) => (roleName) => {
      if (!state.userProfile || !state.userProfile.role) {
        return false;
      }
      if (Array.isArray(roleName)) {
        return roleName.includes(state.userProfile.role);
      }
      return state.userProfile.role === roleName;
    },

    // Comprueba si el usuario tiene un permiso específico (legacy, si lo usabas así)
     can: (state) => (permissionString) => {
      console.log('[Auth Store - can] Checking permission:', permissionString);
      console.log('[Auth Store - can] Current permissions:', state.permissions);

      if (!permissionString || typeof permissionString !== 'string') {
        // console.warn('[Auth Store - can] Invalid permission string provided. Returning false.');
        return false;
      }

      // Divide la cadena "moduleId.action" en sus partes
      const [moduleId, action] = permissionString.split('.');

      // console.log('Verificando Permisos:',[moduleId,action])

      // Asegúrate de que ambas partes existan
      if (!moduleId || !action) {
        console.warn(`[Auth Store - can] Permission string format incorrect: ${permissionString}. Expected 'moduleId.action'. Returning false.`);
        return false;
      }

      // Si no hay permisos cargados, o el objeto de permisos está vacío
      if (!state.permissions || typeof state.permissions !== 'object' || Object.keys(state.permissions).length === 0) {
        console.log(`[Auth Store - can] No permissions loaded or empty for ${permissionString}. Returning false.`);
        return false;
      }

      // Accede al módulo específico en el objeto de permisos del estado
      const modulePermissions = state.permissions[moduleId];

      // Si el módulo no existe en los permisos del usuario
      if (!modulePermissions) {
        console.log(`[Auth Store - can] Module '${moduleId}' not found in permissions. Returning false.`);
        return false;
      }

      // Finalmente, verifica si la acción específica existe para ese módulo y si su valor es 'true'
      const hasActionPermission = modulePermissions[action] === true;
      console.log(`[Auth Store - can] Result for ${permissionString}: ${hasActionPermission}`);
      return hasActionPermission;
    },

    // Getter para obtener todos los permisos (si necesitas mostrarlos o depurar)
    allPermissions: (state) => state.permissions,

    // Getters for form management
    isEditMode: (state) => state.editMode,
    getEditingUser: (state) => state.editingUser,
    getEditingUserRole: (state) => state.editingUserRole,
    getUserPermissions: (state) => state.userPermissions,

    // Getters for user list and pagination
    getUsers: (state) => state.users,
    getCurrentPage: (state) => state.page,
    getLimit: (state) => state.limit,
    getTotalUsers: (state) => state.totalUsers,
    getTotalPages: (state) => state.totalPages,
    getSearchQuery: (state) => state.searchQuery,
    getFilterRole: (state) => state.filterRole,
    getFilterOrganization: (state) => state.filterOrganization,
    getOrganizations: (state) => state.organizations,

    // Getters for roles management
    getRoles: (state) => state.roles,
    getEditingRole: (state) => state.editingRole,
    getEditingRolePermissions: (state) => state.editingRolePermissions,
    isRolePermissionsLoaded: (state) => state.rolePermissionsLoaded,
    getAppModules: (state) => state.appModules,
  },

  actions: {
    // --- Funciones de Autenticación Básicas ---
    async signUp(credentials) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase.auth.signUp(credentials);
        if (error) throw error;
        this.user = data.user;
        console.log('[Auth Store] Registro exitoso:', data.user);
        // Si el registro es exitoso, esperamos que el onAuthStateChange maneje la carga del perfil.
        // Pero podríamos precargar aquí si es necesario.
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error en el registro:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async signIn(credentials) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase.auth.signInWithPassword(credentials);
        if (error) throw error;
        this.user = data.user;
        console.log('[Auth Store] Inicio de sesión exitoso:', data.user);
        // El listener de onAuthStateChange manejará la carga del perfil después de este evento.
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error en el inicio de sesión:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async signOut() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { error } = await $supabase.auth.signOut();
        if (error) throw error;
        this.user = null;
        this.userProfile = null;
        this.role = null;
        this.permissions = {};
        console.log('[Auth Store] Sesión cerrada exitosamente.');
        navigateTo('/login'); // Redirigir al usuario al cerrar sesión
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al cerrar sesión:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async resetPassword(email) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`, // Asegúrate que esta URL exista
        });
        if (error) throw error;
        console.log('[Auth Store] Correo de restablecimiento de contraseña enviado.');
        return true; // Indica éxito
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al solicitar restablecimiento de contraseña:', e.message);
        return false; // Indica fallo
      } finally {
        this.isLoading = false;
      }
    },

    async updatePassword(newPassword) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        console.log('[Auth Store] Contraseña actualizada exitosamente.');
        this.user = data.user;
        return true;
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al actualizar contraseña:', e.message);
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    // --- Carga y Gestión del Perfil de Usuario ---
   async fetchUserProfile(userId) {
    this.isLoading = true;
    this.error = null;
    try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase.rpc('get_user_profile_with_permissions', { p_auth_id: userId });

        if (error) throw error;

        if (data && data.length > 0) {
            const profile = data[0]; // The RPC returns an array, take the first element

            this.userProfile = {
                // Ensure the RPC returns these fields
                id: profile.id,
                auth_id: userId, // CRUCIAL: Store the auth_id here
                email: profile.email,
                // --- FIX: MAPPING TO CAMELCASE NAMES FROM RPC ---
                firstName: profile.firstName, // Changed from profile.first_name
                lastName: profile.lastName,   // Changed from profile.last_name
                // -------------------------------------------------
                role: profile.role, // The role name returned by the RPC (e.g.: 'Administrador Global')
                organization_id: profile.organization_id, // If the RPC returns it
                preferences: profile.preferences || null,
                // Add any other fields your RPC returns and you need in userProfile
            };
            this.role = profile.role; // Assign the main role name to the 'role' property of the store
            this.permissions = profile.permissions || {}; // Assign the JSONB permissions object

            console.log('[Auth Store] Perfil de usuario y permisos cargados:', this.userProfile, this.permissions);
        } else {
            this.userProfile = null;
            this.role = null;
            this.permissions = {};
            console.warn('[Auth Store] No se encontró perfil de usuario para ID:', userId);
        }
    } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al cargar el perfil de usuario:', e.message);
    } finally {
        this.isLoading = false;
    }
},

     async ensureUserProfileExists(userId) {
    // Intenta cargar el perfil si no está ya cargado o si el user.id no coincide
    if (!this.userProfile || this.userProfile.auth_id !== userId) {
        console.log('[Auth Store] Asegurando que el perfil de usuario exista para:', userId);
        
        // Primero, intentar cargar el perfil existente por auth_id
        await this.fetchUserProfile(userId);

        // Si después de intentar cargar, el perfil *aún* no se encontró (o no coincide con el auth_id actual)
        // Y tenemos un usuario Supabase autenticado
        if ((!this.userProfile || this.userProfile.auth_id !== userId) && this.user && this.user.id === userId) {
            console.log('[Auth Store] Perfil de usuario no encontrado o desactualizado localmente. Verificando en DB y creando/actualizando si es necesario.');
            try {
                const { $supabase } = useNuxtApp();

                // *** PASO CLAVE: Verificar si ya existe un perfil con este auth_id en la base de datos ***
                const { data: existingProfile, error: selectError } = await $supabase
                    .from('users')
                    .select('id, auth_id, email, role_id') // Selecciona las columnas necesarias para verificar
                    .eq('auth_id', userId)
                    .single();

                if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = No rows found
                    console.error('[Auth Store] Error al verificar perfil existente:', selectError.message);
                    throw selectError; // Propagar otros errores de selección
                }

                if (existingProfile) {
                    // Si ya existe un perfil con este auth_id, significa que el fetchUserProfile inicial
                    // pudo haber fallado o el this.userProfile no se actualizó por alguna razón.
                    // No necesitamos crear uno nuevo, solo asegurarnos de que this.userProfile esté correcto.
                    console.log('[Auth Store] Perfil con auth_id ya existe en DB, actualizando el store local.');
                    // Esto es crucial: Si el perfil ya existe, lo asignamos directamente al store
                    // para evitar el intento de inserción/upsert que causaría el duplicado.
                    this.userProfile = existingProfile; 
                    // Y luego podemos re-fetch para obtener todos los detalles si es necesario
                    await this.fetchUserProfile(userId); // Re-fetch para cargar permisos y otros datos completos
                } else {
                    // Solo si NO existe un perfil con este auth_id, procedemos a crearlo
                    console.log('[Auth Store] Perfil de usuario NO encontrado por auth_id. Procediendo a CREAR uno nuevo.');

                    if (this.availableRoles.length === 0) {
                        await this.fetchAvailableRoles();
                    }

                    const defaultRole = this.availableRoles.find(r => r.name === 'Visor' || r.name === 'viewer');
                    let defaultRoleId = null;
                    if (defaultRole) {
                        defaultRoleId = defaultRole.id;
                    } else {
                        console.warn('[Auth Store] No se encontró un rol "Visor" o "viewer". No se pudo asignar un rol por defecto.');
                        throw new Error('No se pudo determinar el ID del rol por defecto para un nuevo perfil de usuario.');
                    }

                    const defaultFirstName = this.user.user_metadata?.first_name || 'Usuario';
                    const defaultLastName = this.user.user_metadata?.last_name || 'Nuevo';

                    // Insertar el nuevo perfil
                    const { data, error: insertError } = await $supabase
                        .from('users')
                        .insert({
                            auth_id: this.user.id,
                            email: this.user.email,
                            first_name: defaultFirstName,
                            last_name: defaultLastName,
                            role_id: defaultRoleId, // Este será el rol por defecto solo en la creación
                            organization_id: null,
                            is_active: true,
                        })
                        .select();

                    if (insertError) {
                        // Si llegamos aquí y hay un error, es un problema real que debe ser manejado.
                        // El error de "duplicate key value violates unique constraint "users_email_key""
                        // SOLO DEBERÍA OCURRIR si hay una inconsistencia en la BD
                        // (ej. un usuario con un email diferente al auth_id ya tiene ese email).
                        // Si ocurre aquí, es un escenario inesperado después de la verificación por auth_id.
                        console.error('[Auth Store] Error al CREAR perfil de usuario:', insertError.message);
                        throw insertError;
                    }

                    console.log('[Auth Store] Perfil de usuario creado:', data[0]);
                    this.userProfile = data[0]; // Asignar el perfil recién creado al store
                }

                // Asegúrate de que el perfil cargado en el store es el más reciente y completo
                await this.fetchUserProfile(userId);

            } catch (e) {
                console.error('[Auth Store] Error en ensureUserProfileExists (creación/verificación):', e.message);
                this.error = 'Error al procesar perfil de usuario: ' + e.message;
            }
        } else if (!this.user) {
            console.warn('[Auth Store] No hay usuario autenticado para crear o asegurar perfil.');
        }
    } else {
        console.log('[Auth Store] Perfil de usuario ya cargado y válido.');
    }
},
    // === NUEVA FUNCIÓN: checkAuth (adaptada para el error que reportaste) ===
    // Esta función se encarga de verificar la sesión actual y cargar el perfil del usuario.
    // Es probable que tu `01.auth-initializer.client.js` la esté llamando.
    async checkAuth() {
      this.isLoading = true;
      try {
        const { $supabase } = useNuxtApp();
        const { data: { session }, error } = await $supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          this.user = session.user;
          console.log('[Auth Store - checkAuth] Sesión activa, usuario:', session.user.id);
          await this.ensureUserProfileExists(session.user.id);
        } else {
          this.user = null;
          this.userProfile = null;
          this.role = null;
          this.permissions = {};
          console.log('[Auth Store - checkAuth] No hay sesión activa.');
        }
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store - checkAuth] Error al verificar autenticación:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    // --- Funciones de Gestión de Usuarios y Roles (Adaptando Consultas) ---

    async fetchAvailableRoles() {
        this.isLoading = true;
        try {
            const { $supabase } = useNuxtApp();
            // === ADAPTACIÓN DE CONSULTA: Select a la tabla 'public.roles' con sus nuevos campos ===
            const { data, error } = await $supabase
                .from('roles') // Asegúrate de que la tabla se llama 'roles' (minúsculas)
                .select('id, name, description, type, organization_id'); // Ahora incluye 'type' y 'organization_id'
            if (error) throw error;
            this.availableRoles = data;
            console.log('[Auth Store] Roles disponibles cargados:', this.availableRoles);
        } catch (e) {
            this.error = e.message;
            console.error('[Auth Store] Error al cargar roles disponibles:', e.message);
        } finally {
            this.isLoading = false;
        }
    },

    async fetchOrganizations() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        // === ADAPTACIÓN DE CONSULTA: Select a la tabla 'public.organizations' ===
        const { data, error } = await $supabase
          .from('organizations') // Asegúrate de que la tabla se llama 'organizations' (minúsculas)
          .select('id, name, slug'); // Selecciona los campos relevantes de la tabla organizations
        if (error) throw error;
        this.organizations = data;
        console.log('[Auth Store] Organizaciones cargadas:', this.organizations);
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al cargar organizaciones:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchUsers(options = {}) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { page = this.page, limit = this.limit, searchQuery = this.searchQuery, filterRole = this.filterRole, filterOrganization = this.filterOrganization } = options;

        let query = $supabase
          .from('users') // Consulta la tabla 'public.users'
          .select(`
            id,
            auth_id,
            first_name,
            last_name,
            email,
            phone_number,
            organization_id,
            role_id,
            is_active,
            last_login,
            created_at,
            updated_at,
            organization:organizations(name), // Join implícito con la tabla organizations para obtener el nombre
            role:roles(name) // Join implícito con la tabla roles para obtener el nombre del rol
          `, { count: 'exact' });

        if (searchQuery) {
          query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }
        if (filterRole) {
          query = query.eq('role_id', filterRole);
        }
        if (filterOrganization) {
          query = query.eq('organization_id', filterOrganization);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        this.users = data.map(user => ({
          ...user,
          // Mapea a tus nombres de campo en el frontend si son diferentes a los de la BD
          firstName: user.first_name,
          lastName: user.last_name,
          organization_name: user.organization ? user.organization.name : 'N/A',
          role_name: user.role ? user.role.name : 'N/A',
        }));
        this.totalUsers = count;
        this.totalPages = Math.ceil(count / limit);
        this.page = page;
        this.limit = limit;
        this.searchQuery = searchQuery;
        this.filterRole = filterRole;
        this.filterOrganization = filterOrganization;

        console.log('[Auth Store] Usuarios cargados:', this.users);
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al cargar usuarios:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async createUser(userData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        // 1. Create Supabase Auth user
        const { data: authData, error: authError } = await $supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            // data: { first_name: userData.firstName, last_name: userData.lastName } // Puedes pasar datos de usuario iniciales aquí
          }
        });

        if (authError) throw authError;

        const newAuthUser = authData.user;
        if (!newAuthUser) throw new Error('Supabase Auth user was not created.');

        // 2. Insert into your public.users table
        const { data: userProfileData, error: userProfileError } = await $supabase
          .from('users') // Cambiado a 'users' (minúsculas)
          .insert({
            auth_id: newAuthUser.id,
            email: userData.email,
            first_name: userData.firstName, // Asegúrate de que el campo coincida con tu BD
            last_name: userData.lastName,   // Asegúrate de que el campo coincida con tu BD
            organization_id: userData.organization_id,
            role_id: userData.role_id,
            phone_number: userData.phone_number || null, // Si es opcional
            is_active: userData.is_active || true, // Default to true if not provided
          })
          .select();

        if (userProfileError) {
            // If user profile insertion fails, attempt to delete the auth user
            await $supabase.auth.admin.deleteUser(newAuthUser.id); // Requires service_role key on backend for admin.deleteUser
            throw userProfileError;
        }

        console.log('[Auth Store] Usuario creado en Auth y Perfil:', userProfileData);
        // Refresh user list
        await this.fetchUsers();
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al crear usuario:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async updateUser(userId, userData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        // Update user profile in public.users table
        const { data, error } = await $supabase
          .from('users') // Cambiado a 'users' (minúsculas)
          .update({
            first_name: userData.firstName, // Asegúrate de que el campo coincida con tu BD
            last_name: userData.lastName,   // Asegúrate de que el campo coincida con tu BD
            email: userData.email,
            phone_number: userData.phone_number || null,
            organization_id: userData.organization_id,
            role_id: userData.role_id,
            is_active: userData.is_active,
            // updated_at will be set by the trigger
          })
          .eq('id', userId)
          .select(); // Return the updated row

        if (error) throw error;
        console.log('[Auth Store] Usuario actualizado:', data);

        // Actualizar el correo electrónico del usuario en auth.users si ha cambiado
        if (this.editingUser && this.editingUser.email !== userData.email) {
            const { error: authUpdateError } = await $supabase.auth.admin.updateUserById(
                this.editingUser.auth_id, // Usar auth_id para actualizar en auth.users
                { email: userData.email }
            );
            if (authUpdateError) {
                console.warn('[Auth Store] Advertencia: Falló la actualización de correo electrónico en auth.users:', authUpdateError.message);
                // No lanzar error fatal aquí, ya que el perfil en public.users ya se actualizó.
            } else {
                console.log('[Auth Store] Correo electrónico de auth.users actualizado.');
            }
        }
        await this.fetchUsers(); // Refresh user list
        this.setEditMode(false); // Exit edit mode after update
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al actualizar usuario:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async deleteUser(userId, authId) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        // 1. Delete user profile from public.users table
        const { error: profileError } = await $supabase
          .from('users') // Cambiado a 'users' (minúsculas)
          .delete()
          .eq('id', userId);

        if (profileError) throw profileError;

        // 2. Delete user from auth.users (requires service_role key on backend)
        const { error: authError } = await $supabase.auth.admin.deleteUser(authId);
        if (authError) {
            // Log a warning if auth user deletion fails, but don't stop if profile was deleted
            console.warn('[Auth Store] Advertencia: Falló la eliminación del usuario de auth.users:', authError.message);
        } else {
            console.log('[Auth Store] Usuario eliminado de Auth.');
        }

        console.log('[Auth Store] Usuario eliminado exitosamente:', userId);
        await this.fetchUsers(); // Refresh user list
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al eliminar usuario:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    setEditMode(mode, user = null) {
      this.editMode = mode;
      this.editingUser = user;
      if (user) {
        this.editingUserRole = user.role_id; // Set the role_id of the user being edited
        // Deep copy userPermissions to ensure reactivity and independence from original object
        this.userPermissions = JSON.parse(JSON.stringify(user.permissions || {}));
      } else {
        this.editingUserRole = null;
        this.userPermissions = {};
      }
      this.error = null; // Clear any previous errors
    },

    setSearchQuery(query) {
      this.searchQuery = query;
    },
    setFilterRole(roleId) {
      this.filterRole = roleId;
    },
    setFilterOrganization(orgId) {
      this.filterOrganization = orgId;
    },
    setPage(page) {
      this.page = page;
    },

    // --- Funciones para Gestión de Roles y Permisos ---

    async fetchRoles() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        // === ADAPTACIÓN DE CONSULTA: Select a la tabla 'public.roles' ===
        // Aquí no necesitas join con role_module_permissions si solo quieres la lista de roles.
        const { data, error } = await $supabase
          .from('roles') // Cambiado a 'roles' (minúsculas)
          .select('id, name, description, type, organization_id, created_at, updated_at') // Incluye los nuevos campos
          .order('name', { ascending: true });

        if (error) throw error;
        this.roles = data;
        console.log('[Auth Store] Roles cargados:', this.roles);
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al cargar roles:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchAppModules() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        // === ADAPTACIÓN DE CONSULTA: Select a la tabla 'public.app_modules' ===
        const { data, error } = await $supabase
          .from('app_modules') // Asegúrate de que la tabla se llama 'app_modules'
          .select('id, name, description, permissions_schema'); // Selecciona los campos relevantes
        if (error) throw error;
        this.appModules = data;
        console.log('[Auth Store] Módulos de aplicación cargados:', this.appModules);
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al cargar módulos de aplicación:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchRolePermissions(roleId) {
      this.isLoading = true;
      this.error = null;
      this.rolePermissionsLoaded = false;
      this.editingRolePermissions = {}; // Reset permissions

      if (!roleId) {
        console.warn('[Auth Store] roleId es nulo o indefinido en fetchRolePermissions.');
        this.isLoading = false;
        return;
      }

      try {
        const { $supabase } = useNuxtApp();
        // === ADAPTACIÓN DE CONSULTA: Usar RPC para obtener permisos de rol ===
        // Tu función RPC `get_role_permissions_by_id` debe devolver el objeto de permisos por módulo.
        const { data, error } = await $supabase.rpc('get_role_permissions_by_id', { p_role_id: roleId });

        if (error) throw error;

        // La RPC devuelve un array de objetos, donde el primer elemento tiene la columna 'permissions'
        if (data && data.length > 0 && data[0].permissions) {
          this.editingRolePermissions = data[0].permissions;
          this.initialPermissions = JSON.parse(JSON.stringify(data[0].permissions)); // Store for tracking changes
          console.log('[Auth Store] Permisos del rol cargados:', this.editingRolePermissions);
        } else {
          this.editingRolePermissions = {};
          this.initialPermissions = {};
          console.warn('[Auth Store] No se encontraron permisos para el rol o el formato es incorrecto:', roleId);
        }
        this.rolePermissionsLoaded = true;
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al cargar permisos del rol:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async createRole(roleData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        // === ADAPTACIÓN DE CONSULTA: Insertar en public.roles ===
        // 'permissions' ya NO es un campo directo de 'roles'.
        // Insertamos el rol sin permisos iniciales, o con un valor predeterminado si es necesario en BD.
        const { data: newRole, error: roleError } = await $supabase
          .from('roles') // Cambiado a 'roles'
          .insert({
            name: roleData.name,
            description: roleData.description,
            type: roleData.type, // Nuevo campo 'type'
            organization_id: roleData.organization_id || null, // Nuevo campo 'organization_id'
          })
          .select('id'); // Solo necesitamos el ID del nuevo rol para los permisos

        if (roleError) throw roleError;
        const newRoleId = newRole[0].id;

        // === ADAPTACIÓN DE CONSULTA: Insertar permisos en public.role_module_permissions ===
        // Ahora necesitamos insertar en la tabla intermedia.
        // Asume que roleData.permissions es un objeto con el formato adecuado { "Modulo": { "read": true, ... } }
        const permissionsToInsert = [];
        for (const moduleName in roleData.permissions) {
          const module = this.appModules.find(m => m.name === moduleName);
          if (module) {
            permissionsToInsert.push({
              role_id: newRoleId,
              module_id: module.id,
              permissions: roleData.permissions[moduleName]
            });
          }
        }

        if (permissionsToInsert.length > 0) {
          const { error: permError } = await $supabase
            .from('role_module_permissions') // Nueva tabla
            .insert(permissionsToInsert);

          if (permError) throw permError;
        }

        console.log('[Auth Store] Rol y permisos creados:', newRole);
        await this.fetchRoles(); // Refresh role list
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al crear rol:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async updateRole(roleId, roleData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        // === ADAPTACIÓN DE CONSULTA: Actualizar en public.roles (sin permisos) ===
        // Los permisos se gestionan en una tabla separada.
        const { error: roleError } = await $supabase
          .from('roles') // Cambiado a 'roles'
          .update({
            name: roleData.name,
            description: roleData.description,
            type: roleData.type, // Nuevo campo
            organization_id: roleData.organization_id || null, // Nuevo campo
            // updated_at será manejado por un trigger
          })
          .eq('id', roleId);

        if (roleError) throw roleError;

        // === ADAPTACIÓN DE CONSULTA: Actualizar permisos en public.role_module_permissions ===
        // Borra los permisos existentes para el rol y luego inserta los nuevos.
        const { error: deletePermError } = await $supabase
          .from('role_module_permissions')
          .delete()
          .eq('role_id', roleId);

        if (deletePermError) throw deletePermError;

        const permissionsToInsert = [];
        for (const moduleName in roleData.permissions) {
          const module = this.appModules.find(m => m.name === moduleName);
          if (module) {
            permissionsToInsert.push({
              role_id: roleId,
              module_id: module.id,
              permissions: roleData.permissions[moduleName]
            });
          }
        }

        if (permissionsToInsert.length > 0) {
          const { error: insertPermError } = await $supabase
            .from('role_module_permissions')
            .insert(permissionsToInsert);

          if (insertPermError) throw insertPermError;
        }

        console.log('[Auth Store] Rol y permisos actualizados:', roleId);
        await this.fetchRoles(); // Refresh role list
        this.setEditingRole(null); // Exit editing mode
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al actualizar rol:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    async deleteRole(roleId) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        // === ADAPTACIÓN DE CONSULTA: Eliminar en public.roles ===
        // Si tienes ON DELETE CASCADE en role_id en users y role_module_permissions,
        // esto debería eliminar automáticamente los usuarios y permisos asociados.
        // Si no tienes CASCADE, deberías borrar primero en role_module_permissions y luego en users.
        const { error } = await $supabase
          .from('roles') // Cambiado a 'roles'
          .delete()
          .eq('id', roleId);

        if (error) throw error;
        console.log('[Auth Store] Rol eliminado:', roleId);
        await this.fetchRoles(); // Refresh role list
      } catch (e) {
        this.error = e.message;
        console.error('[Auth Store] Error al eliminar rol:', e.message);
      } finally {
        this.isLoading = false;
      }
    },

    setEditingRole(role = null) {
      this.editingRole = role;
      this.error = null;
      this.editingRolePermissions = {};
      this.rolePermissionsLoaded = false;
      if (role) {
        this.fetchRolePermissions(role.id);
      } else {
        this.initialPermissions = {}; // Clear initial permissions when not editing
      }
    },

    // Toggle permission for a module
    togglePermission(moduleName, permissionType) {
      if (!this.editingRolePermissions[moduleName]) {
        this.editingRolePermissions[moduleName] = { ...this.defaultPermissions };
      }
      this.editingRolePermissions[moduleName][permissionType] = !this.editingRolePermissions[moduleName][permissionType];
    },

    // Check if a permission is enabled for a module
    isPermissionEnabled(moduleName, permissionType) {
      return this.editingRolePermissions[moduleName] && this.editingRolePermissions[moduleName][permissionType];
    },

    // --- Listeners de Supabase Auth (sin cambios, ya que operan sobre la sesión de Supabase Auth) ---
    initAuthListener() {
            // Desuscribe cualquier listener anterior para evitar duplicados
            if (this.authListenerUnsubscribe) {
                this.authListenerUnsubscribe();
                console.log('[Auth Store - Listener] Desuscripto del listener anterior.');
            }

            const { $supabase } = useNuxtApp();
            console.log('[Auth Store - Listener] Inicializando listener de onAuthStateChange...');

            // Configura el nuevo listener y guarda la función de desuscripción
            const { data: { subscription } } = $supabase.auth.onAuthStateChange(async (event, session) => {
                console.log(`[Auth Store - Listener] Evento de Auth recibido: ${event}`);

                if (session) {
                    // Siempre actualiza el objeto de usuario de Supabase Auth en el store
                    this.user = session.user;
                    console.log('[Auth Store - Listener] Sesión activa. Intentando cargar perfil de usuario de la aplicación.');

                    // Llama a ensureUserProfileExists para cargar/verificar el perfil de la aplicación
                    // Esto es clave para obtener el rol de la aplicación.
                    await this.ensureUserProfileExists(this.user.id);

                } else {
                    // Si no hay sesión, significa que el usuario ha cerrado sesión o la sesión ha expirado
                    console.log('[Auth Store - Listener] Sesión cerrada (evento) o expirada. Limpiando store.');
                    this.user = null; // Limpia el objeto de usuario de Supabase Auth
                    this.userProfile = null; // Limpia el perfil de la aplicación
                    this.role = null;       // Limpia el rol de la aplicación
                    this.permissions = {};  // Limpia los permisos
                }
            });
            this.authListenerUnsubscribe = subscription.unsubscribe;
            console.log('[Auth Store - Listener] Listener de Auth configurado.');
        },
  },
});