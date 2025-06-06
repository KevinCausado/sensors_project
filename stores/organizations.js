// stores/organizations.js

import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const useOrganizationStore = defineStore('organizations', {
  state: () => ({
    organizations: [],
    selectedOrganizationId: null,
    selectedOrganization: null,
    isLoading: false,
    error: null,
  }),

  getters: {
    allOrganizations: (state) => state.organizations,
    currentSelectedOrganization: (state) => state.selectedOrganization,
  },

  actions: {
    async fetchOrganizations() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('organizations')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }

        this.organizations = data;
      } catch (err) {
        console.error('Error fetching organizations:', err);
        this.error = err.message || 'Error al cargar las organizaciones.';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async createOrganization(newOrganization) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('organizations')
          .insert(newOrganization)
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          this.organizations.push(data);
        }
        return data;
      } catch (err) {
        console.error('Error creating organization:', err);
        this.error = err.message || 'Error al crear la organización.';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async updateOrganization(id, updatedFields) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        updatedFields.updated_at = new Date().toISOString();

        const { data, error } = await $supabase
          .from('organizations')
          .update(updatedFields)
          .eq('id', id)
          .select();

        if (error) {
          throw error;
        }

        const index = this.organizations.findIndex(org => org.id === id);
        if (index !== -1 && data && data.length > 0) {
          this.organizations[index] = { ...this.organizations[index], ...data[0] };
          if (this.selectedOrganization && this.selectedOrganization.id === id) {
            this.selectedOrganization = { ...this.selectedOrganization, ...data[0] };
          }
        }
        return data[0];
      } catch (err) {
        console.error('Error updating organization:', err);
        this.error = err.message || 'Error al actualizar la organización.';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteOrganization(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        const { error } = await $supabase
          .from('organizations')
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }

        this.organizations = this.organizations.filter(org => org.id !== id);
        if (this.selectedOrganization && this.selectedOrganization.id === id) {
          this.selectedOrganization = null;
        }
      } catch (err) {
        console.error('Error deleting organization:', err);
        this.error = err.message || 'Error al eliminar la organización.';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchOrganizationWithRelations(organizationId) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('organizations')
          .select(`
            id,
            name,            
            contact_email,
            phone_number,
            address,
            city,
            state,
            country,
            created_at,
            updated_at,
            logo_url,
            is_active,
            users (
              *,
              roles (
                name
              )
            ),
            assets_base (
              id,
              name,
              description,
              asset_code,
              location,
              assets_types(name),
              is_active,
              created_at,
              updated_at
            ),
            sensors (
              id,
              name,          
              location_description,  
              status,
              created_at,
              updated_at
            ),
            alerts (
              id,
              type,          
              priority,
              status,
              title,         
              description,  
              alert_time,    
              resolved_time, 
              asset_id,
              sensor_id,            
              threshold_normal_min,
              threshold_normal_max
            )
          `)
          .eq('id', organizationId)
          .single();

        if (error) {
          console.error('Error fetching organization with relations:', error);
          if (error.code === 'PGRST116' || error.message.includes('Row not found')) {
              console.warn(`Organización con ID ${organizationId} no encontrada en la base de datos.`);
              this.selectedOrganization = null;
              return null;
          }
          throw error;
        }

        // Post-processing: Flatten roleName and assetTypeName for easier access
        if (data) {
          if (data.users) {
            data.users = data.users.map(user => ({
              ...user,
              roleName: user.roles ? user.roles.name : null
            }));
          }
          if (data.assets_base) {
            data.assets_base = data.assets_base.map(asset => ({
              ...asset,
              assetTypeName: asset.assets_types ? asset.assets_types.name : null
            }));
          }
        }

        this.selectedOrganization = data;
        return data;

      } catch (err) {
        console.error('Error al cargar organización:', err);
        this.error = err.message || 'Error al cargar la organización.';
        this.selectedOrganization = null;
        throw err;
      } finally {
        this.isLoading = false;
      }
    },
  },
});