// stores/parameters.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const useParameterStore = defineStore('parameter', {
  state: () => ({
    parameters: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchParameters() {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('Parameters')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        this.parameters = data;
      } catch (error) {
        this.error = error.message;
        console.error('Error fetching parameters:', error.message);
      } finally {
        this.loading = false;
      }
    },

    async addParameter(newParam) {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('Parameters')
          .insert([newParam])
          .select();

        if (error) throw error;
        this.parameters.push(data[0]);
        return data[0];
      } catch (error) {
        this.error = error.message;
        console.error('Error adding parameter:', error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateParameter(id, updatedFields) {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('Parameters')
          .update(updatedFields)
          .eq('id', id)
          .select();

        if (error) throw error;
        const index = this.parameters.findIndex(p => p.id === id);
        if (index !== -1) {
          Object.assign(this.parameters[index], data[0]);
        }
        return data[0];
      } catch (error) {
        this.error = error.message;
        console.error('Error updating parameter:', error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteParameter(id) {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { error } = await $supabase
          .from('Parameters')
          .delete()
          .eq('id', id);

        if (error) throw error;
        this.parameters = this.parameters.filter(p => p.id !== id);
        return true;
      } catch (error) {
        this.error = error.message;
        console.error('Error deleting parameter:', error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchParameterById(id) {
      this.loading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('Parameters')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        this.error = error.message;
        console.error(`Error fetching parameter with ID ${id}:`, error.message);
        return null;
      } finally {
        this.loading = false;
      }
    }
  },
  // --- AÑADE ESTE GETTER AQUÍ ---
  getters: {
    // Filtra los parámetros que tienen la categoría 'units'
    getUnitParameters: (state) => {
      return state.parameters.filter(param => param.category === 'units');
    }
  }
});