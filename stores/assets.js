// stores/assets.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { useOrganizationStore } from '~/stores/organizations'; 
import { useSensorStore } from '~/stores/sensors'; 

export const useAssetStore = defineStore('assets', {
  state: () => ({
    assets: [],
    assetTypes: [], 
    isoGroups: [], 
    rigidityTypes: [],
    foundationTypes: [],
    couplingTypes: [],
    vibrationProfiles: [], 
    loading: false, 
    error: null, 
    currentAsset: null, 
    _dataInitialized: false, 
  }),

  getters: {
    getAssets: (state) => state.assets,
    getAssetTypes: (state) => state.assetTypes,
    getIsoGroups: (state) => state.isoGroups,
    getRigidityTypes: (state) => state.rigidityTypes,
    getFoundationTypes: (state) => state.foundationTypes,
    getCouplingTypes: (state) => state.couplingTypes,
    getVibrationProfiles: (state) => state.vibrationProfiles, 
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getCurrentAsset: (state) => state.currentAsset,
  },

  actions: {
    async fetchAssets() {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const organizationStore = useOrganizationStore(); 
        if (!this._dataInitialized) {
            await this.initializeDataForForms();
        }
        if (organizationStore.organizations.length === 0) {
            await organizationStore.fetchOrganizations();
        }

        let query = $supabase
          .from('assets_base')
          .select(`*, vibration_profile_id, assets_vibration_config ( measurement_point, direction )`)
          .order('name', { ascending: true });

        if (organizationStore.selectedOrganizationId) {
          query = query.eq('organization_id', organizationStore.selectedOrganizationId);
        }

        const { data, error } = await query;

        if (error) throw error;

        this.assets = data.map(asset => ({
          ...asset,
          organization_name: organizationStore.organizations.find(org => org.id === asset.organization_id)?.name || 'N/A',
          assetTypeName: this.assetTypes.find(type => type.id === asset.asset_type_id)?.name || 'N/A',       
          iso_group_name: this.isoGroups.find(group => group.id === asset.iso_group_id)?.name || 'N/A',      
          rigidity_type_name: this.rigidityTypes.find(type => type.id === asset.rigidity_type_id)?.name || 'N/A', 
          foundation_type_name: this.foundationTypes.find(type => type.id === asset.foundation_type_id)?.name || 'N/A', 
          coupling_type_name: this.couplingTypes.find(type => type.id === asset.coupling_type_id)?.name || 'N/A', 
          vibration_profile_name: asset.assets_vibration_config ? 
                                  `${asset.assets_vibration_config.measurement_point} (${asset.assets_vibration_config.direction})` : 'N/A',
        }));
        console.log('[Assets Store] Activos cargados (con assetTypeName y vibration_profile_name):', this.assets);

      } catch (e) {
        console.error('Error fetching assets:', e);
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    async fetchAssetById(id) {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const organizationStore = useOrganizationStore(); 
        const sensorStore = useSensorStore();

        if (!this._dataInitialized) {
            await this.initializeDataForForms();
        }
        if (organizationStore.organizations.length === 0) {
            await organizationStore.fetchOrganizations();
        }

        const { data, error } = await $supabase
          .from('assets_base')
          .select(`*, assets_vibration_config ( id, measurement_point, direction, vibration_range_id )`)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          this.currentAsset = {
            ...data,
            organization_name: organizationStore.organizations.find(org => org.id === data.organization_id)?.name || 'N/A',
            assetTypeName: this.assetTypes.find(type => type.id === data.asset_type_id)?.name || 'N/A',
            iso_group_name: this.isoGroups.find(group => group.id === data.iso_group_id)?.name || 'N/A',
            rigidity_type_name: this.rigidityTypes.find(type => type.id === data.rigidity_type_id)?.name || 'N/A',
            foundation_type_name: this.foundationTypes.find(type => type.id === data.foundation_type_id)?.name || 'N/A',
            coupling_type_name: this.couplingTypes.find(type => type.id === data.coupling_type_id)?.name || 'N/A',
            vibration_profile_display_name: data.assets_vibration_config ? 
                                            `${data.assets_vibration_config.measurement_point} (${data.assets_vibration_config.direction})` : 'N/A',
          };
          console.log('[Assets Store] Activo individual cargado (con nombres mapeados):', this.currentAsset);
          return this.currentAsset;
        }
        return null;
      } catch (e) {
        console.error(`Error fetching asset with ID ${id}:`, e);
        this.error = e.message;
        this.currentAsset = null;
        return null;
      } finally {
        this.loading = false;
      }
    },

    async createAsset(assetData) {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('assets_base')
          .insert([assetData])
          .select()
          .single();

        if (error) throw error;
        await this.fetchAssets(); 
        return data;
      } catch (e) {
        console.error('Error creating asset:', e);
        this.error = e.message;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async updateAsset(id, assetData) {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('assets_base')
          .update(assetData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        await this.fetchAssets(); 
        if (this.currentAsset && this.currentAsset.id === id) {
          await this.fetchAssetById(id); 
        }
        return data;
      } catch (e) {
        console.error('Error updating asset:', e);
        this.error = e.message;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async deleteAsset(id) {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { error } = await $supabase
          .from('assets_base')
          .delete()
          .eq('id', id);

        if (error) throw error;
        this.assets = this.assets.filter(asset => asset.id !== id);
      } catch (e) {
        console.error('Error deleting asset:', e);
        this.error = e.message;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async initializeDataForForms() {
      if (this._dataInitialized) {
        console.log('[Assets Store] initializeDataForForms: Datos ya inicializados. Saliendo.');
        return;
      }

      this.loading = true; 
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        const [
          { data: assetsTypesData, error: assetsTypesError },
          { data: isoGroupsData, error: isoGroupsError },
          { data: rigidityTypesData, error: rigidityTypesError },
          { data: foundationTypesData, error: foundationTypesError },
          { data: couplingTypesData, error: couplingTypesError },
          { data: vibrationProfilesData, error: vibrationProfilesError },
        ] = await Promise.all([
          $supabase.from('assets_types').select('id, name'),
          $supabase.from('iso_groups').select('id, name'),
          $supabase.from('rigidity_types').select('id, name'),
          $supabase.from('foundation_types').select('id, name'),
          $supabase.from('coupling_types').select('id, name'),
          $supabase.from('assets_vibration_config').select('id, measurement_point, direction'), 
        ]);

        if (assetsTypesError) throw assetsTypesError;
        if (isoGroupsError) throw isoGroupsError;
        if (rigidityTypesError) throw rigidityTypesError;
        if (foundationTypesError) throw foundationTypesError;
        if (couplingTypesError) throw couplingTypesError;
        if (vibrationProfilesError) throw vibrationProfilesError; 

        this.assetTypes = assetsTypesData;
        this.isoGroups = isoGroupsData;
        this.rigidityTypes = rigidityTypesData;
        this.foundationTypes = foundationTypesData;
        this.couplingTypes = couplingTypesData;
        this.vibrationProfiles = vibrationProfilesData; 

        this._dataInitialized = true; 
        console.log('[Assets Store] initializeDataForForms: Datos de formularios inicializados con éxito. Perfiles de vibración cargados:', this.vibrationProfiles.length);

      } catch (error) {
        console.error('Error loading form initialization data:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
