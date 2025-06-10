// stores/assets.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { useOrganizationStore } from '~/stores/organizations'; // Importar el store de organizaciones

export const useAssetStore = defineStore('assets', {
  state: () => ({
    assets: [],
    assetTypes: [], // List of asset types from assets_types table
    isoGroups: [], // List of ISO groups from iso_groups table
    rigidityTypes: [],
    foundationTypes: [],
    couplingTypes: [],
    loading: false, // General loading state for the store
    error: null, // General error state for the store
    currentAsset: null, // For when a single asset is edited/viewed
  }),

  getters: {
    getAssets: (state) => state.assets,
    getAssetTypes: (state) => state.assetTypes,
    getIsoGroups: (state) => state.isoGroups,
    getRigidityTypes: (state) => state.rigidityTypes,
    getFoundationTypes: (state) => state.foundationTypes,
    getCouplingTypes: (state) => state.couplingTypes,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getCurrentAsset: (state) => state.currentAsset,
  },

  actions: {
    // --- CRUD Operations for Assets (Main List) ---
    async fetchAssets() {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const organizationStore = useOrganizationStore(); // Obtener instancia del store de organizaciones

        // Seleccionar todas las columnas de assets_base. No usar uniones explícitas aquí para evitar el error de caché.
        const { data, error } = await $supabase
          .from('assets_base')
          .select(`*`)
          .order('name', { ascending: true });

        if (error) throw error;

        // Mapear los datos para incluir nombres legibles buscando en los arrays pre-cargados
        this.assets = data.map(asset => ({
          ...asset,
          // Buscar el nombre de la organización usando el ID y el array `organizations` del store
          organization_name: organizationStore.organizations.find(org => org.id === asset.organization_id)?.name || 'N/A',
          asset_type_name: this.assetTypes.find(type => type.id === asset.asset_type_id)?.name || 'N/A',       
          iso_group_name: this.isoGroups.find(group => group.id === asset.iso_group_id)?.name || 'N/A',         
          rigidity_type_name: this.rigidityTypes.find(type => type.id === asset.rigidity_type_id)?.name || 'N/A', 
          foundation_type_name: this.foundationTypes.find(type => type.id === asset.foundation_type_id)?.name || 'N/A', 
          coupling_type_name: this.couplingTypes.find(type => type.id === asset.coupling_type_id)?.name || 'N/A', 
        }));
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
        const organizationStore = useOrganizationStore(); // Obtener instancia del store de organizaciones

        // CÓDIGO CORREGIDO: Seleccionar todas las columnas (*) y mapear manualmente.
        // Esto evita el error de "relationship not found" en la vista de detalle.
        const { data, error } = await $supabase
          .from('assets_base')
          .select(`*`) // Seleccionar todas las columnas de assets_base
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          // Mapear para incluir nombres legibles buscando en los arrays pre-cargados
          this.currentAsset = {
            ...data,
            organization_name: organizationStore.organizations.find(org => org.id === data.organization_id)?.name || 'N/A',
            asset_type_name: this.assetTypes.find(type => type.id === data.asset_type_id)?.name || 'N/A',
            iso_group_name: this.isoGroups.find(group => group.id === data.iso_group_id)?.name || 'N/A',
            rigidity_type_name: this.rigidityTypes.find(type => type.id === data.rigidity_type_id)?.name || 'N/A',
            foundation_type_name: this.foundationTypes.find(type => type.id === data.foundation_type_id)?.name || 'N/A',
            coupling_type_name: this.couplingTypes.find(type => type.id === data.coupling_type_id)?.name || 'N/A',
          };
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
          .insert(assetData)
          .select()
          .single();

        if (error) throw error;
        await this.fetchAssets(); // Refresh the main list
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
        await this.fetchAssets(); // Refresh the main list
        return data;
      } catch (e) {
        console.error(`Error updating asset with ID ${id}:`, e);
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
        console.error(`Error deleting asset with ID ${id}:`, e);
        this.error = e.message;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async initializeDataForForms() {
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
        ] = await Promise.all([
          $supabase.from('assets_types').select('id, name'),
          $supabase.from('iso_groups').select('id, name'),
          $supabase.from('rigidity_types').select('id, name'),
          $supabase.from('foundation_types').select('id, name'),
          $supabase.from('coupling_types').select('id, name'),
        ]);

        if (assetsTypesError) throw assetsTypesError;
        if (isoGroupsError) throw isoGroupsError;
        if (rigidityTypesError) throw rigidityTypesError;
        if (foundationTypesError) throw foundationTypesError;
        if (couplingTypesError) throw couplingTypesError;

        this.assetTypes = assetsTypesData;
        this.isoGroups = isoGroupsData;
        this.rigidityTypes = rigidityTypesData;
        this.foundationTypes = foundationTypesData;
        this.couplingTypes = couplingTypesData;

      } catch (error) {
        console.error('Error loading form initialization data:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
  },
});
