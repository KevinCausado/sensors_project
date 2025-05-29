// stores/auth.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Objeto de usuario de Supabase Auth (auth.users)
    userProfile: null, // Objeto de perfil desde tu tabla 'Users'
    role: null, // El rol personalizado del usuario (ej: 'super-admin', 'viewer')
    permissions: {}, // Estado para almacenar los permisos (objeto de permisos agrupados por módulo)
    isLoading: false, // Indicador general de carga para operaciones de auth
    error: null, // Para almacenar mensajes de error de autenticación
    availableRoles: [], // Lista de roles disponibles desde la tabla 'Roles'
    authListenerUnsubscribe: null, // Para guardar la función de desuscripción del listener de Supabase Auth
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

    // Comprueba si el usuario tiene un permiso específico (ej: 'users.read', 'products.create')
    can: (state) => (permissionPath) => {
      console.log(`[AUTH-CAN-DEBUG] Evaluando permiso para: ${permissionPath}`);
      console.log(`[AUTH-CAN-DEBUG] userProfile actual (dentro de can):`, JSON.parse(JSON.stringify(state.userProfile)));
      console.log(`[AUTH-CAN-DEBUG] userProfile?.role actual (dentro de can):`, state.userProfile?.role);
      console.log(`[AUTH-CAN-DEBUG] Objeto de permisos (dentro de can):`, JSON.parse(JSON.stringify(state.permissions)));

      // Los super-admin tienen acceso total
      if (state.userProfile?.role === 'super-admin') {
        console.log('[AUTH-DEBUG] Super-admin: Concediendo acceso total (ignorando verificación de permiso específica).');
        return true;
      }

      // Si no es super-admin y no hay permisos cargados, denegar acceso
      if (!state.permissions || Object.keys(state.permissions).length === 0) {
        console.log(`[AUTH-CAN-DEBUG] No hay permisos cargados o está vacío para un no-super-admin. Denegando ${permissionPath}.`);
        return false;
      }

      // Dividir el permiso en módulo y acción (ej: 'users.read' -> 'users', 'read')
      const parts = permissionPath.split('.');
      const moduleName = parts[0];
      const action = parts[1];

      console.log(`[AUTH-CAN-DEBUG] No-super-admin: Verificando permiso: ${permissionPath}`);
      console.log(`[AUTH-CAN-DEBUG] No-super-admin: Nombre del Módulo: "${moduleName}", Acción: "${action}"`);
      console.log(`[AUTH-CAN-DEBUG] No-super-admin: Permisos del usuario para "${moduleName}":`, state.permissions[moduleName]);

      // Comprobar si el módulo existe y si la acción está incluida en sus permisos
      if (state.permissions[moduleName] && Array.isArray(state.permissions[moduleName])) {
        const hasAction = state.permissions[moduleName].includes(action);
        console.log(`[AUTH-CAN-DEBUG] No-super-admin: Resultado para ${permissionPath}: ${hasAction}`);
        return hasAction;
      }

      // Si el módulo no se encuentra o no es un array de acciones, denegar
      console.log(`[AUTH-CAN-DEBUG] No-super-admin: Módulo "${moduleName}" no encontrado o no es un array. Denegando ${permissionPath}.`);
      return false;
    },
  },

  actions: {
    // Establece el estado de carga
    setLoading(status) {
      this.isLoading = status;
    },
    // Establece un mensaje de error
    setError(message) {
      this.error = message;
    },

    // Inicia sesión de un usuario con email y contraseña
    async login({ email, password }) {
      this.isLoading = true;
      this.error = null;

      try {
        const { $supabase } = useNuxtApp();
        const { data, error: authError } = await $supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (authError) {
          throw authError;
        }

        this.user = data.user;
        if (this.user) {
          // Una vez autenticado con Supabase Auth, asegura que el perfil de tu tabla 'Users' exista
          await this.ensureUserProfileExists(this.user.id);
        }

        console.log('[Auth Store] Inicio de sesión exitoso. Usuario:', this.user);
        return this.user;
      } catch (err) {
        console.error('[Auth Store] Error de inicio de sesión:', err);
        this.error = err.message || 'Error al iniciar sesión.';
        this.user = null;
        this.userProfile = null;
        this.role = null;
        this.permissions = {};
        throw err; // Re-lanza el error para que el componente de la UI lo maneje
      } finally {
        this.isLoading = false;
      }
    },

    // Cierra la sesión del usuario
    async logout() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        // Limpiar el estado del store ANTES de cerrar sesión en Supabase.
        // Esto evita mostrar datos de un usuario que está a punto de desautenticarse.
        this.user = null;
        this.userProfile = null;
        this.permissions = {};
        this.role = null;

        // Cerrar sesión en Supabase
        const { error } = await $supabase.auth.signOut();

        if (error) {
          console.error('[Auth Store] Error al cerrar sesión en Supabase:', error.message);
          throw error;
        }

        console.log('[Auth Store] Sesión cerrada en Supabase y store limpiado. Redirigiendo...');
        // Redirige usando navigateTo. Esto activará el middleware, que ahora está corregido.
        await navigateTo('/auth/login');
      } catch (error) {
        this.error = error.message;
        console.error('[Auth Store] Error al cerrar sesión (catch):', error.message);
        // Asegúrate de que, incluso con un error, el usuario sea redirigido si no está en la página de login.
        if (useNuxtApp().$router.currentRoute.value.path !== '/auth/login') {
          await navigateTo('/auth/login');
        }
      } finally {
        this.isLoading = false;
        console.log('[Auth Store] Acción de logout finalizada.');
      }
    },

    // Verifica el estado de autenticación al cargar la aplicación o al refrescar
    async checkAuth() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        console.log('[Auth Store - checkAuth] 1. Intentando obtener sesión de Supabase...'); // LOG 1

         await new Promise(resolve => setTimeout(resolve, 300));

        const { data: { session }, error: sessionError } = await $supabase.auth.getSession();

        if (sessionError) {
          console.error('[Auth Store - checkAuth] 2. Error al obtener sesión de Supabase:', sessionError); // LOG 2
          throw sessionError;
        }

        if (session && session.user) {
          this.user = session.user;
          console.log('[Auth Store - checkAuth] 3. Sesión de Supabase encontrada. ID de usuario:', this.user.id); // LOG 3

          // Cargar/asegurar el perfil de usuario y permisos
          await this.ensureUserProfileExists(this.user.id);
          console.log('[Auth Store - checkAuth] 4. Perfil de usuario y permisos cargados.'); // LOG 4

        } else {
          // No hay sesión activa o usuario nulo desde Supabase, limpiar el store
          this.user = null;
          this.userProfile = null;
          this.role = null;
          this.permissions = {};
          console.log('[Auth Store - checkAuth] 5. No se encontró sesión activa de Supabase. Limpiando estado local.'); // LOG 5
        }
        return !!this.user; // Devuelve true si hay usuario, false si no
      } catch (err) {
        console.error('[Auth Store - checkAuth] 6. Ocurrió un error durante la verificación de autenticación:', err); // LOG 6
        // En caso de error, asegurarse de que el store esté limpio
        this.user = null;
        this.userProfile = null;
        this.role = null;
        this.permissions = {};
        this.error = err.message || 'Error al verificar sesión.';
        return false;
      } finally {
        this.isLoading = false;
        console.log(`[Auth Store - checkAuth] 7. checkAuth finalizado. ¿Autenticado?: ${!!this.user}`); // LOG 7
      }
    },

    // *** ACCIÓN PRINCIPAL PARA CARGAR PERFIL Y PERMISOS USANDO RPC (Corregida) ***
    async ensureUserProfileExists(authId) {
      console.log('[Auth Store] Ensuring user profile exists for authId:', authId);
      try {
        const { $supabase } = useNuxtApp();
        const DEFAULT_ROLE_NAME = 'viewer';
        let roleToAssign = DEFAULT_ROLE_NAME;
        let defaultRoleId = null;

        // Cargar roles disponibles si no están ya cargados
        if (this.availableRoles.length === 0) {
          await this.fetchAvailableRoles();
        }

        const defaultViewerRole = this.availableRoles.find(r => r.name === DEFAULT_ROLE_NAME);
        if (defaultViewerRole) {
          defaultRoleId = defaultViewerRole.id;
        } else {
          console.warn(`[Auth Store] Default role '${DEFAULT_ROLE_NAME}' not found in available roles.`);
        }

        // --- Intento 1: Buscar el perfil existente con permisos vía RPC ---
        let profileData = null;
        let profileFetchError = null;

        try {
          const { data, error } = await $supabase
            .rpc('get_user_profile_with_permissions', { p_auth_id: authId })
            .single();
          profileData = data;
          profileFetchError = error;
        } catch (err) {
          // Captura errores de red u otros que no sean de Supabase PostgREST
          profileFetchError = err;
        }

        // --- Lógica de creación/actualización si no se encontró el perfil ---
        // Solo si hubo un error PGRST116 (no row found) procedemos a intentar crear
        if (profileFetchError && profileFetchError.code === 'PGRST116') {
          console.log('[Auth Store] No existing profile found via RPC. Attempting to create/upsert new one.');

          const userEmail = this.user?.email || (await $supabase.auth.getUser()).data.user?.email;
          if (!userEmail) {
            throw new Error('Authenticated user email not available for profile creation.');
          }

          // Realizar el UPSERT para crear o actualizar el perfil
          const { data: newProfile, error: upsertError } = await $supabase
            .from('Users')
            .upsert([
              {
                auth_id: authId,
                id: authId, // Mantener id igual a authId para consistencia
                email: userEmail,
                role: roleToAssign,
                "RoleId": defaultRoleId, // Asegúrate de que tu tabla 'Users' tenga una columna 'RoleId'
                firstName: 'Nuevo',
                lastName: 'Usuario',
                preferences: { language: 'es', timezone: 'Europe/Madrid', emailNotifications: true, alertNotifications: true },
              }
            ], {
              onConflict: 'auth_id' // <--- Especifica la columna de conflicto para upsert
            })
            .select('id, firstName, lastName, role, email, preferences') // Seleccionar las columnas que te interesan
            .single();

          if (upsertError) {
            console.error('[Auth Store] Error during profile UPSERT:', upsertError);
            throw upsertError;
          }
          console.log('[Auth Store] Profile upserted successfully. Now refetching with RPC for full data and permissions.');

          // Después del UPSERT, volver a intentar obtener el perfil con el RPC para los permisos
          try {
            const { data, error } = await $supabase
              .rpc('get_user_profile_with_permissions', { p_auth_id: authId })
              .single();
            profileData = data;
            profileFetchError = error; // Esto debería ser null o un error si algo salió mal en la re-búsqueda
          } catch (err) {
            profileFetchError = err; // Captura errores de red, etc.
          }

          if (profileFetchError) {
            console.error('[Auth Store] Error refetching profile after upsert via RPC:', profileFetchError);
            throw profileFetchError; // Re-lanza si hay error en la re-búsqueda
          }

        } else if (profileFetchError) {
          // Si hubo un error que NO sea "no row found" (PGRST116), lo tratamos como un error grave
          console.error('[Auth Store] Error fetching existing profile via RPC:', profileFetchError);
          throw profileFetchError;
        }

        // --- Asignar el perfil y permisos al store si se obtuvo exitosamente ---
        if (profileData) {
          this.userProfile = profileData;
          this.role = profileData.role;
          this.permissions = profileData.permissions || {}; // Asegúrate de que `permissions` sea un objeto
          console.log('[Auth Store] User profile and permissions set:', JSON.parse(JSON.stringify(this.userProfile)));
        } else {
          // Si después de todos los intentos no hay profileData, limpiar el estado del store
          console.warn('[Auth Store] No user profile data available after all attempts. Clearing profile state.');
          this.userProfile = null;
          this.role = null;
          this.permissions = {};
        }

        console.log('[Auth Store] Final User Role in store (after ensuring profile):', this.role);
        console.log('[Auth Store] Loaded User Permissions:', this.permissions);

      } catch (err) {
        console.error('[Auth Store] Error in ensureUserProfileExists (catch block):', err);
        // En caso de cualquier error, asegurar que los datos del perfil estén limpios
        this.userProfile = null;
        this.role = null;
        this.permissions = {};
        // Re-lanza el error para que sea manejado por checkAuth o login
        throw err;
      }
    },

    // Acción para actualizar el perfil del usuario en la tabla 'Users'
    async updateProfile({ firstName, lastName, preferences }) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const userIdToUpdate = this.user?.id;
        if (!userIdToUpdate) {
          throw new Error('No user is currently authenticated to update profile.');
        }

        const updateData = {
          firstName,
          lastName,
          preferences: preferences || {},
          updatedAt: new Date().toISOString(),
        };

        const { data, error } = await $supabase
          .from('Users')
          .update(updateData)
          .eq('id', userIdToUpdate)
          .select('id, firstName, lastName, role, email, preferences')
          .single();
        if (error) throw error;

        if (data) {
          this.userProfile = data;
          this.role = data.role;
          // Aquí no actualizamos `this.permissions` directamente.
          // Idealmente, un update de perfil no cambiaría los permisos del rol,
          // y estos se recargarían con `ensureUserProfileExists` al siguiente login/check.
        } else {
          console.warn('Supabase update returned no data for the updated profile.');
        }
        return this.userProfile;
      } catch (error) {
        this.error = error;
        console.error('Error updating profile:', error.message);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // Acción para cambiar la contraseña del usuario autenticado
    async changePassword(newPassword) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { error } = await $supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;

        return true;
      } catch (error) {
        this.error = error;
        console.error('Error changing password:', error.message);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // Acción para cargar todos los roles disponibles (incluyendo sus permisos)
    async fetchAvailableRoles() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('Roles')
          .select('id, name, permissions') // Asegúrate de que 'permissions' esté en tu tabla Roles
          .order('name', { ascending: true });
        if (error) throw error;

        this.availableRoles = data;
        return data;
      } catch (error) {
        this.error = error;
        console.error('Error fetching available roles:', error.message);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // Acción para registrar un nuevo usuario y crear su perfil
    async register({ firstName, lastName, email, password, organization }) {
      this.isLoading = true;
      this.error = null;

      try {
        const { $supabase } = useNuxtApp();
        // 1. Registrar usuario en Supabase Auth
        const { data: authData, error: authError } = await $supabase.auth.signUp({
          email: email,
          password: password,
        });

        if (authError) {
          throw authError;
        }

        this.user = authData.user;
        // Si el registro de auth fue exitoso, creamos el perfil en nuestra tabla Users
        if (this.user) {
          let organizationId = null;
          // 2. Buscar la organización (opcional: crearla si no existe, o manejar la lógica de asignación)
          if (organization) {
            const { data: orgData, error: orgError } = await $supabase
              .from('Organizations')
              .select('id')
              .eq('name', organization)
              .single();
            if (orgError && orgError.code !== 'PGRST116') { // PGRST116 es "no row found"
              console.error('Error buscando organización:', orgError);
              throw orgError;
            }

            if (orgData) {
              organizationId = orgData.id;
            } else {
              console.warn(`Organización "${organization}" no encontrada. Creando usuario sin asociación a organización.`);
            }
          }

          // 3. Obtener el ID del rol por defecto 'viewer'
          if (this.availableRoles.length === 0) {
            await this.fetchAvailableRoles();
          }
          const DEFAULT_ROLE_NAME = 'viewer';
          const defaultViewerRole = this.availableRoles.find(r => r.name === DEFAULT_ROLE_NAME);
          let defaultRoleId = null;
          if (defaultViewerRole) {
            defaultRoleId = defaultViewerRole.id;
          } else {
            console.warn(`[Auth Store] Default role '${DEFAULT_ROLE_NAME}' not found during registration. Proceeding without RoleId.`);
          }


          // 4. Crear el perfil en la tabla Users (usando onConflict para mayor robustez)
          // Usamos upsert para "insertar o actualizar si ya existe", por si un trigger ya creó el perfil
          const { data: profileData, error: profileError } = await $supabase
            .from('Users')
            .upsert({
              auth_id: this.user.id,
              id: this.user.id, // Usar el ID del usuario de Supabase Auth
              firstName: firstName,
              lastName: lastName,
              email: email, // El email de la tabla Users debería coincidir con auth.users
              role: 'viewer', // Rol por defecto: 'viewer'
              "OrganizationId": organizationId, // Asignar el ID de la organización
              "RoleId": defaultRoleId, // Asignar el ID del rol por defecto
              preferences: { language: 'es', timezone: 'Europe/Madrid', emailNotifications: true, alertNotifications: true },
            }, {
              onConflict: 'auth_id' // Conflicto en auth_id: si ya existe, actualiza
            })
            .select('*')
            .single();

          if (profileError) {
            console.error('[Auth Store] Error creating/upserting user profile:', profileError);
            // Si falla la creación del perfil por algo que no sea duplicado,
            // puedes considerar borrar el usuario de auth.users también para mantener la consistencia.
            // await $supabase.auth.admin.deleteUser(this.user.id);
            throw profileError;
          }
          console.log('[Auth Store] Profile upserted for new registration:', profileData);


          // Después de la inserción/upsert, recargar el perfil completo con el RPC
          // para asegurar que tenemos los permisos cargados correctamente.
          await this.ensureUserProfileExists(this.user.id);
          console.log('Usuario registrado y perfil creado/asegurado:', this.userProfile);
        }

        return this.user;
      } catch (err) {
        console.error('Error durante el registro:', err);
        this.error = err.message || 'Error al registrarse. Por favor, verifica tus datos.';
        this.user = null;
        this.userProfile = null;
        this.role = null;
        this.permissions = {};
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    // Inicia el listener de cambios de estado de autenticación de Supabase
    // Este listener puede ser llamado en el app.vue o layout principal para reaccionar a cambios
    // como expiración de token o cierre de sesión desde otras pestañas.
    async initAuthListener() {
        // Si ya hay un listener activo, lo desuscribimos para evitar duplicados
        if (this.authListenerUnsubscribe) {
            this.authListenerUnsubscribe();
            console.log('[Auth Store - Listener] Desuscripto del listener anterior.');
        }

        const { $supabase } = useNuxtApp();
        console.log('[Auth Store - Listener] Inicializando listener de onAuthStateChange...');
        const { data: { subscription } } = $supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[Auth Store - Listener] Evento de Auth recibido: ${event}`);
            if (session) {
                // Solo actualizar si el usuario ha cambiado o si no hay usuario en el store
                if (!this.user || this.user.id !== session.user.id) {
                    this.user = session.user;
                    console.log('[Auth Store - Listener] Sesión actualizada (evento):', session.user.id);
                    await this.ensureUserProfileExists(this.user.id); // Asegura que el perfil y permisos se carguen
                } else {
                    console.log('[Auth Store - Listener] Sesión confirmada, mismo usuario.');
                }
            } else {
                console.log('[Auth Store - Listener] Sesión cerrada (evento) o expirada. Limpiando store.');
                this.user = null;
                this.userProfile = null;
                this.role = null;
                this.permissions = {};
                // Opcional: Podrías redirigir aquí, pero el middleware ya se encargará si la ruta lo requiere.
                // const currentPath = useNuxtApp().$router.currentRoute.value.path;
                // const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/update-password'];
                // if (!publicRoutes.includes(currentPath)) {
                //     await navigateTo('/auth/login');
                // }
            }
        });
        // Guarda la función de desuscripción para poder limpiarla después
        this.authListenerUnsubscribe = subscription.unsubscribe;
        console.log('[Auth Store - Listener] Listener de Auth configurado.');
    },
  },
});