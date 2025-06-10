// stores/vibrationProfiles.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { useOrganizationStore } from './organizations'; // Para filtrar por organización

export const useVibrationProfileStore = defineStore('vibrationProfiles', {
  state: () => ({
    vibrationProfiles: [],
    currentVibrationProfile: null,
    vibrationRanges: [], // Para los dropdowns en los formularios
    assets: [], // Para los dropdowns en los formularios (activos a los que se puede asociar)
    isLoading: false,
    error: null,
  }),

  getters: {
    // Filtra los perfiles de vibración por la organización seleccionada globalmente
    filteredVibrationProfiles: (state) => {
      const organizationStore = useOrganizationStore();
      // Si no hay una organización seleccionada, mostramos todos los perfiles cargados
      if (!organizationStore.selectedOrganizationId) {
        return state.vibrationProfiles;
      }
      // Filtramos por la organización del activo asociado al perfil
      return state.vibrationProfiles.filter(profile => {
        const associatedAsset = state.assets.find(asset => asset.id === profile.asset_id);
        return associatedAsset && associatedAsset.organization_id === organizationStore.selectedOrganizationId;
      });
    },
    // Devuelve el perfil de vibración actualmente seleccionado
    getCurrentVibrationProfile: (state) => state.currentVibrationProfile,
    // Devuelve la lista de rangos de vibración para dropdowns
    getVibrationRanges: (state) => state.vibrationRanges,
    
    /**
     * Devuelve la lista de activos disponibles para los selectores de formulario.
     * Si no hay una organización globalmente seleccionada, devuelve todos los activos.
     * Si hay una organización seleccionada, filtra los activos por esa organización.
     */
    getAvailableAssets: (state) => {
      const organizationStore = useOrganizationStore();
      if (!organizationStore.selectedOrganizationId) {
        return state.assets; // Si no hay organización seleccionada, devuelve TODOS los activos
      }
      return state.assets.filter(asset => 
        asset.organization_id === organizationStore.selectedOrganizationId
      );
    },
    // Estado de carga
    isLoadingVibrationProfiles: (state) => state.isLoading,
    // Estado de error
    getVibrationProfilesError: (state) => state.error,
  },

  actions: {
    /**
     * Inicializa los datos de referencia necesarios para los formularios
     * (rangos de vibración y activos).
     */
    async initializeDataForForms() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const organizationStore = useOrganizationStore(); // Asegurarse de tener el store de organizaciones

        // Obtener rangos de vibración
        const { data: rangesData, error: rangesError } = await $supabase
          .from('vibration_ranges')
          .select('id, name, min_value, max_value, unit')
          .order('name', { ascending: true });
        if (rangesError) throw rangesError;
        this.vibrationRanges = rangesData;

        // Obtener activos base. NO APLICAMOS EL FILTRO POR ORGANIZACIÓN AQUÍ
        // ya que el getter `getAvailableAssets` se encarga de eso.
        // Esto asegura que `state.assets` tenga todos los activos disponibles
        // y el getter los filtre dinámicamente.
        const { data: assetsData, error: assetsError } = await $supabase
          .from('assets_base')
          .select('id, name, organization_id') // Necesitamos organization_id para el filtrado del getter
          .order('name', { ascending: true });
        
        if (assetsError) throw assetsError;
        this.assets = assetsData;

        console.log('[VibrationProfiles Store] Datos de formulario inicializados:', {
          vibrationRanges: this.vibrationRanges.length,
          assets: this.assets.length
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
     * Enriqueciendo con los nombres del activo y rango de vibración.
     */
    async fetchVibrationProfiles() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        // No necesitamos el store de organización aquí para la consulta principal
        // El filtrado por organización se hace en el getter filteredVibrationProfiles

        const { data, error } = await $supabase
          .from('assets_vibration_config')
          .select(`
            id,
            asset_id,
            measurement_point,
            direction,
            thresholds,
            created_at,
            updated_at,
            vibration_range_id,
            vibration_ranges ( id, name, unit ),
            assets_base ( id, name, organization_id, asset_type_id )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Enriquecer y filtrar datos después de la consulta
        // Supabase ya hace el join y anida los datos, por lo que los mapeamos para aplanarlos
        const enrichedData = data.map(profile => ({
          ...profile,
          vibration_range_name: profile.vibration_ranges?.name || 'N/A',
          vibration_range_unit: profile.vibration_ranges?.unit || 'N/A',
          asset_name: profile.assets_base?.name || 'Activo Desconocido',
          asset_organization_id: profile.assets_base?.organization_id || null, // Necesario para el getter
          // Asegúrate de que 'thresholds' sea un objeto manejable
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
            asset_id,
            measurement_point,
            direction,
            thresholds,
            created_at,
            updated_at,
            vibration_range_id,
            vibration_ranges ( id, name, unit ),
            assets_base ( id, name, organization_id )
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
          asset_name: data.assets_base?.name || 'Activo Desconocido',
          asset_organization_id: data.assets_base?.organization_id || null,
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
     * @param {object} profileData - Los datos del nuevo perfil.
     */
    async createVibrationProfile(profileData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('assets_vibration_config')
          .insert([profileData])
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
     * @param {object} updatedData - Los datos actualizados.
     */
    async updateVibrationProfile(id, updatedData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('assets_vibration_config')
          .update(updatedData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Después de la actualización, recargar la lista
        await this.fetchVibrationProfiles();
        // Si el perfil actualizado es el current, también actualizalo
        if (this.currentVibrationProfile && this.currentVibrationProfile.id === id) {
          this.currentVibrationProfile = { ...this.currentVibrationProfile, ...updatedData };
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
