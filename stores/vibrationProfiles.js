// stores/vibrationProfiles.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const useVibrationProfileStore = defineStore('vibrationProfiles', {
  state: () => ({
    vibrationProfiles: [],
    currentVibrationProfile: null,
    vibrationRanges: [], // Para los dropdowns en los formularios
    isLoading: false,
    error: null,
    searchQuery: '', // New: Search query for filtering profiles
  }),

  getters: {
    /**
     * filteredVibrationProfiles: Applies filtering based on the searchQuery.
     * @returns {Array} Array of filtered vibration profiles.
     */
    filteredVibrationProfiles: (state) => {
      let results = [...state.vibrationProfiles];

      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        results = results.filter(profile => {
          // Search in measurement_point, direction, vibration_range_name, and vibration_range_unit
          return (
            (profile.measurement_point && profile.measurement_point.toLowerCase().includes(query)) ||
            (profile.direction && profile.direction.toLowerCase().includes(query)) ||
            (profile.vibration_range_name && profile.vibration_range_name.toLowerCase().includes(query)) ||
            (profile.vibration_range_unit && profile.vibration_range_unit.toLowerCase().includes(query))
          );
        });
      }
      return results;
    },
    // Returns the currently selected vibration profile
    getCurrentVibrationProfile: (state) => state.currentVibrationProfile,
    // Returns the list of vibration ranges for dropdowns
    getVibrationRanges: (state) => state.vibrationRanges,
    // Loading state
    isLoadingVibrationProfiles: (state) => state.isLoading,
    // Error state
    getVibrationProfilesError: (state) => state.error,
  },

  actions: {
    /**
     * initializeDataForForms: Initializes reference data needed for forms
     * (only vibration ranges).
     */
    async initializeDataForForms() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        // Get vibration ranges
        const { data: rangesData, error: rangesError } = await $supabase
          .from('vibration_ranges')
          .select('id, name, min_value, max_value, unit')
          .order('name', { ascending: true });
        if (rangesError) throw rangesError;
        this.vibrationRanges = rangesData;

        // console.log('[VibrationProfiles Store] Form data initialized:', {
        //   vibrationRanges: this.vibrationRanges.length,
        // });

      } catch (e) {
        console.error('Error initializing form data for vibration profiles:', e);
        this.error = e.message || 'Error loading initial data.';
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * fetchVibrationProfiles: Loads all vibration profiles from the database.
     * Enriches them with vibration range names.
     */
    async fetchVibrationProfiles() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        // Select profiles and join only with vibration_ranges
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

        // Enrich data after the query
        const enrichedData = data.map(profile => ({
          ...profile,
          vibration_range_name: profile.vibration_ranges?.name || 'N/A',
          vibration_range_unit: profile.vibration_ranges?.unit || 'N/A',
          thresholds: profile.thresholds || {},
        }));

        this.vibrationProfiles = enrichedData;
        // console.log('[VibrationProfiles Store] Vibration profiles loaded:', this.vibrationProfiles.length);

      } catch (e) {
        console.error('Error loading vibration profiles:', e);
        this.error = e.message || 'Error loading vibration profiles.';
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * fetchVibrationProfile: Loads a specific vibration profile by its ID.
     * @param {string} id - The ID of the vibration profile.
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
          this.error = 'Vibration profile not found.';
          return null;
        }

        // Enrich the object for easier use in the form
        this.currentVibrationProfile = {
          ...data,
          vibration_range_name: data.vibration_ranges?.name || 'N/A',
          vibration_range_unit: data.vibration_ranges?.unit || 'N/A',
          thresholds: data.thresholds || {}, // Ensure it's an object
        };
        // console.log('[VibrationProfiles Store] Vibration profile loaded:', this.currentVibrationProfile);
        return this.currentVibrationProfile;

      } catch (e) {
        console.error('Error loading vibration profile by ID:', e);
        this.error = e.message || 'Error loading the vibration profile.';
        this.currentVibrationProfile = null;
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * createVibrationProfile: Creates a new vibration profile.
     * @param {object} profileData - The data for the new profile. It should not contain asset_id.
     */
    async createVibrationProfile(profileData) {
      this.isLoading = true;
      this.error = null;
      try {
        // Ensure that asset_id is not in the payload if it was passed by mistake
        const { asset_id, ...dataToInsert } = profileData;

        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('assets_vibration_config')
          .insert([dataToInsert])
          .select()
          .single();

        if (error) throw error;

        // After creation, reload the list to update the getter
        await this.fetchVibrationProfiles();
        // console.log('[VibrationProfiles Store] Vibration profile created:', data);
        return data;
      } catch (e) {
        console.error('Error creating vibration profile:', e);
        this.error = e.message || 'Error creating the vibration profile.';
        throw e; // Re-throw so the component can handle it
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * updateVibrationProfile: Updates an existing vibration profile.
     * @param {string} id - The ID of the profile to update.
     * @param {object} updatedData - The updated data. It should not contain asset_id.
     */
    async updateVibrationProfile(id, updatedData) {
      this.isLoading = true;
      this.error = null;
      try {
        // Ensure that asset_id is not in the payload if it was passed by mistake
        const { asset_id, ...dataToUpdate } = updatedData;

        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('assets_vibration_config')
          .update(dataToUpdate)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // After the update, reload the list
        await this.fetchVibrationProfiles();
        // If the updated profile is the current one, also update it
        if (this.currentVibrationProfile && this.currentVibrationProfile.id === id) {
          this.currentVibrationProfile = { ...this.currentVibrationProfile, ...dataToUpdate };
          // console.log('[VibrationProfiles Store] currentVibrationProfile updated locally');
        }
        // console.log('[VibrationProfiles Store] Vibration profile updated:', data);
        return data;
      } catch (e) {
        console.error('Error updating vibration profile:', e);
        this.error = e.message || 'Error updating the vibration profile.';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * deleteVibrationProfile: Deletes a vibration profile by its ID.
     * @param {string} id - The ID of the profile to delete.
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

        // Remove from the local list
        this.vibrationProfiles = this.vibrationProfiles.filter(profile => profile.id !== id);
        // console.log(`[VibrationProfiles Store] Vibration profile ${id} deleted.`);
      } catch (e) {
        console.error('Error deleting vibration profile:', e);
        this.error = e.message || 'Error deleting the vibration profile.';
        throw e;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * setSearchQuery: Sets the search query for filtering profiles.
     * Typically, you'd also reset pagination here if this store were directly linked to a paginated view.
     * @param {string} query - The search string.
     */
    setSearchQuery(query) {
      this.searchQuery = query;
      // console.log(`[VibrationProfiles Store] Search query set to: "${query}"`);
      // If this store directly managed pagination (e.g., currentPage), you'd reset it here:
      // this.currentPage = 1;
    },
  },
});
