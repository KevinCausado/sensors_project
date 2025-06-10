// stores/vibrationProfiles.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
// No necesitamos useOrganizationStore aquí si los perfiles son globales,
// pero la mantengo comentada por si se decide un filtro por organización en esta tabla.
// import { useOrganizationStore } from './organizations'; 

export const useVibrationProfileStore = defineStore('vibrationProfiles', {
  state: () => ({
    vibrationProfiles: [],
    currentVibrationProfile: null,
    vibrationRanges: [], // Para los dropdowns en los formularios
    isLoading: false,
    error: null,
  }),

  getters: {
    // Si los perfiles de vibración son plantillas globales, no se filtran por organización.
    // Si la tabla 'assets_vibration_config' tuviera 'organization_id', entonces se filtraría.
    // Por ahora, se asume que son globales.
    filteredVibrationProfiles: (state) => {
      // const organizationStore = useOrganizationStore();
      // Si la tabla 'assets_vibration_config' tuviera un campo 'organization_id', la lógica sería:
      // if (organizationStore.selectedOrganizationId) {
      //   return state.vibrationProfiles.filter(profile => 
      //     profile.organization_id === organizationStore.selectedOrganizationId
      //   );
      // }
      return state.vibrationProfiles; // Devuelve todos los perfiles si son globales
    },
    // Devuelve el perfil de vibración actualmente seleccionado
    getCurrentVibrationProfile: (state) => state.currentVibrationProfile,
    // Devuelve la lista de rangos de vibración para dropdowns
    getVibrationRanges: (state) => state.vibrationRanges,
    // getAvailableAssets ya no es necesario aquí, la asignación se hace en el módulo de activos.
    // Estado de carga
    isLoadingVibrationProfiles: (state) => state.isLoading,
    // Estado de error
    getVibrationProfilesError: (state) => state.error,
  },

  actions: {
    /**
     * Inicializa los datos de referencia necesarios para los formularios
     * (solo rangos de vibración).
     */
    async initializeDataForForms() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        // Obtener rangos de vibración
        const { data: rangesData, error: rangesError } = await $supabase
          .from('vibration_ranges')
          .select('id, name, min_value, max_value, unit')
          .order('name', { ascending: true });
        if (rangesError) throw rangesError;
        this.vibrationRanges = rangesData;

        // Ya no es necesario obtener activos aquí, ya que el perfil de vibración
        // es una plantilla y no se asocia directamente a un activo en este store.
        // La relación y asignación se hará desde el módulo de activos.

        console.log('[VibrationProfiles Store] Datos de formulario inicializados:', {
          vibrationRanges: this.vibrationRanges.length,
        });

      } catch (e) {
        console.error('Error al inicializar datos de formulario para perfiles de vibración:', e);
        this.error = e.message || 'Error al cargar datos iniciales.';
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Carga todos los perfiles de vibración desde la base de datos.
     * Enriqueciendo con los nombres del rango de vibración.
     */
    async fetchVibrationProfiles() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        // Seleccionar perfiles y hacer join solo con vibration_ranges
        const { data, error } = await $supabase
          .from('assets_vibration_config')
          .select(`
            id,
            measurement_point,
            direction,
            thresholds,
            created_at,
            updated_at,
            vibration_range_id,
            vibration_ranges ( id, name, unit )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Enriquecer datos después de la consulta
        const enrichedData = data.map(profile => ({
          ...profile,
          vibration_range_name: profile.vibration_ranges?.name || 'N/A',
          vibration_range_unit: profile.vibration_ranges?.unit || 'N/A',
          // asset_name y asset_organization_id ya no son parte de esta tabla
          thresholds: profile.thresholds || {}, 
        }));

        this.vibrationProfiles = enrichedData;
        console.log('[VibrationProfiles Store] Perfiles de vibración cargados:', this.vibrationProfiles.length);
        
      } catch (e) {
        console.error('Error al cargar perfiles de vibración:', e);
        this.error = e.message || 'Error al cargar los perfiles de vibración.';
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Carga un perfil de vibración específico por su ID.
     * @param {string} id - El ID del perfil de vibración.
     */
    async fetchVibrationProfile(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('assets_vibration_config')
          .select(`
            id,
            measurement_point,
            direction,
            thresholds,
            created_at,
            updated_at,
            vibration_range_id,
            vibration_ranges ( id, name, unit )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) {
          this.currentVibrationProfile = null;
          this.error = 'Perfil de vibración no encontrado.';
          return null;
        }

        // Enriquecer el objeto para facilitar el uso en el formulario
        this.currentVibrationProfile = {
          ...data,
          vibration_range_name: data.vibration_ranges?.name || 'N/A',
          vibration_range_unit: data.vibration_ranges?.unit || 'N/A',
          // asset_name y asset_organization_id ya no son parte de esta tabla
          thresholds: data.thresholds || {}, // Asegurarse de que sea un objeto
        };
        console.log('[VibrationProfiles Store] Perfil de vibración cargado:', this.currentVibrationProfile);
        return this.currentVibrationProfile;

      } catch (e) {
        console.error('Error al cargar perfil de vibración por ID:', e);
        this.error = e.message || 'Error al cargar el perfil de vibración.';
        this.currentVibrationProfile = null;
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Crea un nuevo perfil de vibración.
     * @param {object} profileData - Los datos del nuevo perfil. No debe contener asset_id.
     */
    async createVibrationProfile(profileData) {
      this.isLoading = true;
      this.error = null;
      try {
        // Asegurarse de que asset_id no esté en el payload si fue pasado por error
        const { asset_id, ...dataToInsert } = profileData; 

        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('assets_vibration_config')
          .insert([dataToInsert])
          .select()
          .single();

        if (error) throw error;

        // Después de la creación, recargar la lista para que se actualice el getter
        await this.fetchVibrationProfiles(); 
        console.log('[VibrationProfiles Store] Perfil de vibración creado:', data);
        return data;
      } catch (e) {
        console.error('Error al crear perfil de vibración:', e);
        this.error = e.message || 'Error al crear el perfil de vibración.';
        throw e; // Re-lanzar para que el componente pueda manejarlo
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Actualiza un perfil de vibración existente.
     * @param {string} id - El ID del perfil a actualizar.
     * @param {object} updatedData - Los datos actualizados. No debe contener asset_id.
     */
    async updateVibrationProfile(id, updatedData) {
      this.isLoading = true;
      this.error = null;
      try {
        // Asegurarse de que asset_id no esté en el payload si fue pasado por error
        const { asset_id, ...dataToUpdate } = updatedData;

        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('assets_vibration_config')
          .update(dataToUpdate)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Después de la actualización, recargar la lista
        await this.fetchVibrationProfiles();
        // Si el perfil actualizado es el current, también actualizalo
        if (this.currentVibrationProfile && this.currentVibrationProfile.id === id) {
          this.currentVibrationProfile = { ...this.currentVibrationProfile, ...dataToUpdate };
          console.log('[VibrationProfiles Store] currentVibrationProfile actualizado localmente');
        }
        console.log('[VibrationProfiles Store] Perfil de vibración actualizado:', data);
        return data;
      } catch (e) {
        console.error('Error al actualizar perfil de vibración:', e);
        this.error = e.message || 'Error al actualizar el perfil de vibración.';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Elimina un perfil de vibración por su ID.
     * @param {string} id - El ID del perfil a eliminar.
     */
    async deleteVibrationProfile(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { error } = await $supabase
          .from('assets_vibration_config')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Eliminar de la lista local
        this.vibrationProfiles = this.vibrationProfiles.filter(profile => profile.id !== id);
        console.log(`[VibrationProfiles Store] Perfil de vibración ${id} eliminado.`);
      } catch (e) {
        console.error('Error al eliminar perfil de vibración:', e);
        this.error = e.message || 'Error al eliminar el perfil de vibración.';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
