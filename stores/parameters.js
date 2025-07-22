// stores/parameters.js
import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const useParameterStore = defineStore('parameters', {
  state: () => ({
    parameters: [], // Para almacenar todos los parámetros de la tabla 'parameters'
    isLoading: false,
    error: null,
  }),

  getters: {
    // CAMBIO IMPORTANTE AQUÍ:
    // Este getter ahora extrae valores únicos de la columna 'unit'
    // directamente de los parámetros cargados, ya que no hay una columna 'type'
    // para filtrar por 'unit'.
  getUnitParameters: (state) => {
      const uniqueUnits = new Set();
      // Filtra los parámetros cuya 'category' es 'units'
      state.parameters.forEach(param => {
        if (param.category === 'units' && param.value) { // Asegúrate que 'value' no sea nulo
          uniqueUnits.add(param.value); // Añade el 'value' (ej. 'mm/s') al Set
        }
      });
      // Mapea los valores únicos a un formato { unit: 'mm/s', name: 'mm/s' }
      // para que el v-for en tu template funcione correctamente.
      return Array.from(uniqueUnits).map(unitValue => ({
        unit: unitValue,
        name: unitValue, // Muestra el valor de la unidad tal cual (ej. "mm/s")
      }));
    },

    // Aquí pueden ir otros getters si los necesitas (ej. getParametersByName, etc.)
    // getParametersByName: (state) => (name) => {
    //   return state.parameters.filter(p => p.name === name);
    // },
  },

  actions: {
  async fetchParameters() {
      this.isLoading = true;
      this.error = null;
      try {
        const { data, error } = await useNuxtApp().$supabase
          .from('parameters') // Nombre de tu tabla en Supabase
          .select('*'); // Selecciona todas las columnas

        if (error) throw error;
        this.parameters = data;
        // console.log('Fetched parameters (actual data):', this.parameters); // Revisa este log en tu consola
      } catch (e) {
        this.error = 'Failed to fetch parameters: ' + e.message;
        console.error('Error fetching parameters:', e);
      } finally {
        this.isLoading = false;
      }
    },

    // Tus otras acciones (createParameter, updateParameter, deleteParameter, fetchParameterById)
    // que ya tenías definidas, deben ir aquí abajo sin cambios.
    async createParameter(parameterData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('parameters')
          .insert([parameterData])
          .select();

        if (error) throw error;
        this.parameters.push(data[0]);
        // console.log('[Parameter Store] Parámetro creado:', data[0]);
        return data[0];
      } catch (error) {
        this.error = error.message;
        console.error('Error al crear parámetro:', error.message);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async updateParameter(id, parameterData) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('parameters')
          .update(parameterData)
          .eq('id', id)
          .select();

        if (error) throw error;
        const index = this.parameters.findIndex(p => p.id === id);
        if (index !== -1) {
          this.parameters[index] = data[0];
        }
        // console.log('[Parameter Store] Parámetro actualizado:', data[0]);
        return data[0];
      } catch (error) {
        this.error = error.message;
        console.error('Error al actualizar parámetro:', error.message);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteParameter(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { error } = await $supabase
          .from('parameters')
          .delete()
          .eq('id', id);

        if (error) throw error;
        this.parameters = this.parameters.filter(p => p.id !== id);
        // console.log('[Parameter Store] Parámetro eliminado:', id);
        return true;
      } catch (error) {
        this.error = error.message;
        console.error('Error al eliminar parámetro:', error.message);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchParameterById(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const { $supabase } = useNuxtApp();
        const { data, error } = await $supabase
          .from('parameters')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        // console.log(`[Parameter Store] Parámetro con ID ${id} cargado:`, data);
        return data;
      } catch (error) {
        this.error = error.message;
        console.error(`Error al cargar parámetro con ID ${id}:`, error.message);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
  },
});