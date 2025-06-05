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
      } catch (err) {
        console.error('Error deleting organization:', err);
        this.error = err.message || 'Error al eliminar la organización.';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    // ----------------------------------------------------------------------
    // CRITICAL: All comments removed from inside the `select` template literal
    // ----------------------------------------------------------------------
    async fetchOrganizationWithRelations(organizationId) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

       const { data, error } = await $supabase
          .from('organizations')
          .select(`
            *,
            users (*),
            assets_base (
              id,
              name,
              description,
              location              
            )
          `)
          .eq('id', organizationId)
          .single();

        if (error) {
          console.error('Error fetching organization with relations:', error);
          throw error;
        }

        if (data && data.users) {
          data.users = data.users.map(user => ({
            ...user,
            roleName: user.roles ? user.roles.name : null
          }));
        }

        this.selectedOrganization = data;
        return data;

      } catch (err) {
        console.error('Error al cargar organización:', err);
        this.error = err.message || 'Error al cargar la organización.';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },
  },
});