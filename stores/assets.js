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
     getAssetById: (state) => (id) => {
      return state.assets.find(asset => asset.id === id);
    },
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
          .select(`
            *,
            iso_group:iso_groups!assets_base_iso_group_id_fkey(name),
            custom_profile:custom_vibration_profiles(name)
          `)
          .order('name', { ascending: true });

        if (organizationStore.selectedOrganizationId) {
          query = query.eq('organization_id', organizationStore.selectedOrganizationId);
        }

        const { data, error } = await query;

        if (error) throw error;

              this.assets = data.map(asset => {
          const isoGroupName = asset.iso_group?.name || 'N/A';
          const customProfileName = asset.custom_profile?.name || null;

          return {
            ...asset,
            organization_name: organizationStore.organizations.find(org => org.id === asset.organization_id)?.name || 'N/A',
            assetTypeName: this.assetTypes.find(type => type.id === asset.asset_type_id)?.name || 'N/A',         
            profileDisplayName: customProfileName ? customProfileName : isoGroupName,            
            isCustomProfile: !!customProfileName 
          };
        });
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

        if (!this._dataInitialized) {
            await this.initializeDataForForms();
        }
        if (organizationStore.organizations.length === 0) {
            await organizationStore.fetchOrganizations();
        }

       
        const { data, error } = await $supabase
          .from('assets_base')
          .select(`
            *,
            iso_group:iso_groups!assets_base_iso_group_id_fkey(name),
            custom_profile:custom_vibration_profiles(name)
          `)
          .eq('id', id)
          .single();
       
        if (error) throw error;

        if (data) {
          const isoGroupName = data.iso_group?.name || 'N/A';
          const customProfileName = data.custom_profile?.name || null;

          this.currentAsset = {
            ...data,
            organization_name: organizationStore.organizations.find(org => org.id === data.organization_id)?.name || 'N/A',
            assetTypeName: this.assetTypes.find(type => type.id === data.asset_type_id)?.name || 'N/A',            
            iso_group_name: isoGroupName,
            rigidity_type_name: this.rigidityTypes.find(type => type.id === data.rigidity_type_id)?.name || 'N/A',
            foundation_type_name: this.foundationTypes.find(type => type.id === data.foundation_type_id)?.name || 'N/A',
            coupling_type_name: this.couplingTypes.find(type => type.id === data.coupling_type_id)?.name || 'N/A',            
            profileDisplayName: customProfileName ? customProfileName : isoGroupName,
            isCustomProfile: !!customProfileName 
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
       
        const dataToUpdate = { ...assetData };

        // Definimos una lista de claves que son calculadas o relacionales y no deben enviarse en la actualización.
        const computedOrRelationKeys = [
            'organization_name',
            'assetTypeName',
            'iso_group_name',
            'rigidity_type_name',
            'foundation_type_name',
            'coupling_type_name',
            'vibration_profile_name',
            'vibration_profile_display_name',
            'assets_vibration_config' // Es una relación, no una columna de 'assets_base'
        ];

        // Eliminamos las claves no deseadas del objeto que se enviará a Supabase.
        computedOrRelationKeys.forEach(key => delete dataToUpdate[key]);
      

        const { data, error } = await $supabase
          .from('assets_base')
          .update(dataToUpdate) // Usamos el objeto "limpio".
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
        console.log('[Assets Store] Datos de formulario ya inicializados.');
        return;
      }

      this.loading = true; 
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        // Cargar todas las tablas de configuración en paralelo
        const [
          assetsTypesRes,
          isoGroupsRes,
          rigidityTypesRes,
          foundationTypesRes,
          couplingTypesRes,
        ] = await Promise.all([
          $supabase.from('assets_types').select('id, name'),
          $supabase.from('iso_groups').select('id, name'), // Traemos los grupos ISO
          $supabase.from('rigidity_types').select('id, name'),
          $supabase.from('foundation_types').select('id, name'),
          $supabase.from('coupling_types').select('id, name'),
        ]);

        // Manejo de errores para cada consulta
        if (assetsTypesRes.error) throw assetsTypesRes.error;
        if (isoGroupsRes.error) throw isoGroupsRes.error;
        if (rigidityTypesRes.error) throw rigidityTypesRes.error;
        if (foundationTypesRes.error) throw foundationTypesRes.error;
        if (couplingTypesRes.error) throw couplingTypesRes.error;

        // Asignar los datos al estado del store
        this.assetTypes = assetsTypesRes.data;
        this.isoGroups = isoGroupsRes.data;
        this.rigidityTypes = rigidityTypesRes.data;
        this.foundationTypes = foundationTypesRes.data;
        this.couplingTypes = couplingTypesRes.data;

        this._dataInitialized = true; 
        console.log('[Assets Store] Datos de formularios inicializados con éxito.');

      } catch (error) {
        console.error('Error al cargar datos de inicialización de formularios:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
