import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const useCustomVibrationProfileStore = defineStore('customVibrationProfiles', {
  state: () => ({
    profiles: [],
    rigidityTypes: [],
    loading: false,
    error: null,
  }),


    getters: {    
    getProfileById: (state) => (id) => {
      if (!id || !state.profiles) return null;
      return state.profiles.find(profile => profile.id === id);
    },
  },

  actions: {
    async fetchSupportData() {
        if (this.rigidityTypes.length > 0) return;
        this.loading = true;
        try {
            const { $supabase } = useNuxtApp();
            const { data, error } = await $supabase.from('rigidity_types').select('id, name');
            if (error) throw error;
            this.rigidityTypes = data;
        } catch (e) {
            this.error = e.message;
        } finally {
            this.loading = false;
        }
    },
    
    async fetchProfiles() {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('custom_vibration_profiles')
          .select(`*, rigidity_name:rigidity_types(name), assigned_assets_count:assets_base(count), ranges:custom_vibration_ranges(*)`)
          .order('name', { ascending: true });

        if (error) throw error;
        
        this.profiles = data.map(p => ({
          ...p,
          rigidity_name: p.rigidity_name?.name || 'N/A',
          assigned_assets_count: p.assigned_assets_count[0]?.count || 0,
          ranges: p.ranges.sort((a, b) => a.severity.localeCompare(b.severity))
        }));
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    async fetchProfileById(id) {
        this.loading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();
            const { data, error } = await $supabase
                .from('custom_vibration_profiles')
                .select('*, ranges:custom_vibration_ranges(*)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (e) {
            this.error = e.message;
            return null;
        } finally {
            this.loading = false;
        }
    },
    
    async createProfileWithRanges(profileData) {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { error } = await $supabase.rpc('create_custom_profile_with_ranges', {
          profile_name: profileData.name,
          profile_description: profileData.description,
          rigidity_id: profileData.rigidity_type_id,
          ranges_data: Object.entries(profileData.ranges).map(([severity, range]) => ({
              severity: severity,
              condition_name: range.condition_name,
              min_value: range.min_value,
              max_value: range.max_value
          }))
        });
        if (error) throw error;
        await this.fetchProfiles();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
   
    async updateProfileWithRanges(id, profileData) {
        this.loading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();

           
            const { error: updateError } = await $supabase.rpc('update_custom_profile_with_ranges', {
                profile_id: id,
                profile_name: profileData.name,
                profile_description: profileData.description,
                rigidity_id: profileData.rigidity_type_id,
                ranges_data: Object.entries(profileData.ranges).map(([severity, range]) => ({
                    severity: severity,
                    min_value: range.min_value,
                    max_value: range.max_value
                }))
            });

            if (updateError) throw updateError;
            
            // console.log(`Sincronizando sensores para el perfil ${id}...`);
            const { error: syncError } = await $supabase.rpc('sync_sensors_for_profile', {
                p_profile_id: id
            });

            if (syncError) {                
                console.error('Error al sincronizar los umbrales de los sensores:', syncError);                
                throw new Error(`El perfil se actualizó correctamente, pero falló la sincronización de los sensores asociados: ${syncError.message}`);
            }
            
            // console.log('¡Sincronización de sensores completada!');
            
            await this.fetchProfiles();

        } catch (e) {         
            this.error = e.message;
        } finally {
            this.loading = false;
        }
    },
    
    async deleteProfile(id) {
        this.loading = true;
        this.error = null;
        try {
            const { $supabase } = useNuxtApp();
            const { error } = await $supabase.from('custom_vibration_profiles').delete().eq('id', id);
            if (error) throw error;
            await this.fetchProfiles();
        } catch(e) {
            this.error = e.message;
        } finally {
            this.loading = false;
        }
    }
  }
});
