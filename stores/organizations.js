// stores/organizations.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app'; // Para acceder a $supabase

export const useOrganizationStore = defineStore('organizations', {
  state: () => ({
    organizations: [],
    selectedOrganizationId: null, // CAMBIADO: Antes currentOrganizationId. Para la organización seleccionada globalmente
    isLoading: false,
    error: null,
  }),

  getters: {
    allOrganizations: (state) => state.organizations,
    // Getter para obtener la organización seleccionada (por si se necesita el objeto completo)
    selectedOrganization: (state) => {
      if (!state.selectedOrganizationId) return null;
      return state.organizations.find(org => org.id === state.selectedOrganizationId);
    },
  },

  actions: {
    async fetchOrganizations() {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('Organizations') // Nombre de tabla confirmado
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }

        this.organizations = data;
      } catch (err) {
        console.error('Error fetching organizations:', err);
        this.error = err.message || 'Error al cargar las organizaciones.';
      } finally {
        this.isLoading = false;
      }
    },

    // SOLO UNA DEFINICIÓN DE setSelectedOrganization
    setSelectedOrganization(orgId) {
      this.selectedOrganizationId = orgId;
      // Guardar en localStorage para persistencia
      if (process.client) { // Asegura que solo se ejecute en el cliente
        if (orgId === null) {
          localStorage.removeItem('selected_org_id');
        } else {
          localStorage.setItem('selected_org_id', orgId);
        }
      }
    },

    async addOrganization(newOrgData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();

        const { data, error } = await $supabase
          .from('Organizations')
          .insert([newOrgData])
          .select();

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          this.organizations.push(data[0]);
        }
        return data[0];
      } catch (err) {
        console.error('Error adding organization:', err);
        this.error = err.message || 'Error al añadir la organización.';
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

        updatedFields.updatedAt = new Date().toISOString();

        const { data, error } = await $supabase
          .from('Organizations')
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
          .from('Organizations')
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
  }
});