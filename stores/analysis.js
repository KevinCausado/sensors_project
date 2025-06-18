import { defineStore } from 'pinia';
// ¡CORRECCIÓN AQUÍ! Accede a useNuxtApp para obtener la instancia de Supabase provista por tu plugin.
import { useNuxtApp } from '#app'; // Importa useNuxtApp de Nuxt 3

// Importar stores de soporte necesarias para el mapeo de nombres de activos y sensores.
import { useSensorStore } from './sensors'; // Asume que tienes una store 'sensors'
import { useAssetStore } from './assets';   // Asume que tienes una store 'assets'

export const useAnalysisStore = defineStore('analysis', {
    state: () => ({
        analysisResults: [],      // Array that will store all fetched analysis results.
        isLoading: false,         // Loading indicator.
        error: null,              // To store error messages.
        analysisSubscription: null, // Reference for the Supabase real-time subscription.

        // Variables for pagination and filters in the frontend.
        currentPage: 1,           // Current page of the table.
        itemsPerPage: 10,         // Number of items per page.
        filterByStatus: null,     // Filter by the final analysis status (e.g., 'Normal', 'Alerta', 'Peligro').
        filterByAssetId: null,    // Filter by a specific asset ID.
        filterBySensorId: null,   // Filter by a specific sensor ID.
        searchQuery: '',          // New: Search query for general text search.
    }),

    getters: {
        /**
         * getFilteredAndSortedAnalysisResults: Applies filters and sorts results
         * before pagination. This is used internally to calculate 'totalFilteredResults'.
         * Now includes a search filter based on searchQuery.
         * @returns {Array} Array of filtered and sorted analysis results.
         */
        getFilteredAndSortedAnalysisResults: (state) => {
            let filteredResults = [...state.analysisResults];

            // Apply filter by final status if selected.
            if (state.filterByStatus) {
                filteredResults = filteredResults.filter(result => result.final_status === state.filterByStatus);
            }
            // Apply filter by asset ID if selected.
            if (state.filterByAssetId) {
                filteredResults = filteredResults.filter(result => result.asset_id === state.filterByAssetId);
            }
            // Apply filter by sensor ID if selected.
            if (state.filterBySensorId) {
                filteredResults = filteredResults.filter(result => result.sensor_id === state.filterBySensorId);
            }

            // Apply search query filter if present.
            if (state.searchQuery) {
                const query = state.searchQuery.toLowerCase();
                const sensorStore = useSensorStore(); // Get instance inside getter
                const assetStore = useAssetStore();   // Get instance inside getter

                filteredResults = filteredResults.filter(result => {
                    const sensor = sensorStore.sensors.find(s => s.id === result.sensor_id);
                    const asset = assetStore.assets.find(a => a.id === result.asset_id);

                    // Check various fields for the search query
                    return (
                        (result.measured_value && result.measured_value.toString().toLowerCase().includes(query)) ||
                        (result.iso_status && result.iso_status.toLowerCase().includes(query)) ||
                        (result.profile_status && result.profile_status.toLowerCase().includes(query)) ||
                        (result.final_status && result.final_status.toLowerCase().includes(query)) ||
                        (sensor && sensor.name.toLowerCase().includes(query)) ||
                        (asset && asset.name.toLowerCase().includes(query))
                    );
                });
            }


            // Sort results by analysis timestamp in descending order (most recent first).
            filteredResults.sort((a, b) => new Date(b.analysis_timestamp) - new Date(a.analysis_timestamp));

            return filteredResults;
        },

        /**
         * getPaginatedAnalysisResults: Gets results after applying filters, sorting, and pagination.
         * Also maps sensor and asset IDs to their corresponding names for display.
         * @returns {Array} Array of analysis results ready for the UI table.
         */
        getPaginatedAnalysisResults: (state) => {
            const filteredAndSorted = state.getFilteredAndSortedAnalysisResults;
            const startIndex = (state.currentPage - 1) * state.itemsPerPage;
            const endIndex = startIndex + state.itemsPerPage;
            const paginated = filteredAndSorted.slice(startIndex, endIndex);

            // To display sensor and asset names instead of just their IDs.
            // These stores should ideally be already loaded by onMounted in the component.
            const sensorStore = useSensorStore();
            const assetStore = useAssetStore();

            return paginated.map(result => {
                const sensor = sensorStore.sensors.find(s => s.id === result.sensor_id);
                const asset = assetStore.assets.find(a => a.id === result.asset_id);
                return {
                    ...result,
                    sensor_name: sensor ? sensor.name : 'Sensor Desconocido',
                    asset_name: asset ? asset.name : 'Activo Desconocido',
                    sensor_type: sensor ? sensor.type : 'N/A', // Assuming 'type' is the type in your 'sensors' table
                    sensor_unit: sensor ? sensor.unit : 'N/A' // Assuming 'unit' is in your 'sensors' table
                };
            });
        },

        /**
         * getTotalFilteredResults: Calculates the total number of results after applying filters (including search).
         * Used for pagination.
         * @returns {number} Total number of filtered results.
         */
        getTotalFilteredResults: (state) => {
            return state.getFilteredAndSortedAnalysisResults.length;
        },

        /**
         * getTotalPages: Calculates the total number of pages based on filtered results and items per page.
         * @returns {number} Total number of pages.
         */
        getTotalPages: (state) => {
            return Math.ceil(state.getTotalFilteredResults / state.itemsPerPage);
        }
    },

    actions: {
        /**
         * fetchAnalysisResults: Fetches all analysis results from the Supabase database.
         * Also preloads sensor and asset stores if not already loaded, for name mapping.
         */
        async fetchAnalysisResults() {
            this.isLoading = true;
            this.error = null;
            // ¡CORRECCIÓN AQUÍ! Obtén la instancia de Supabase de `useNuxtApp()`
            const { $supabase } = useNuxtApp();

            try {
                // Ensure supporting stores are loaded for name mapping getters to work.
                const sensorStore = useSensorStore();
                const assetStore = useAssetStore();
                if (sensorStore.sensors.length === 0) {
                    await sensorStore.fetchSensors();
                }
                if (assetStore.assets.length === 0) {
                    await assetStore.fetchAssets();
                }

                // Query the 'analysis_results' table.
                const { data, error } = await $supabase // Use $supabase aquí
                    .from('analysis_results')
                    .select('*')
                    .order('analysis_timestamp', { ascending: false });

                if (error) {
                    throw error;
                }
                this.analysisResults = data || [];
            } catch (e) {
                this.error = e.message;
                console.error("Error fetching analysis results:", e.message);
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * setSearchQuery: Sets the search query for filtering results.
         * Resets pagination to the first page.
         * @param {string} query - The search string.
         */
        setSearchQuery(query) {
            this.searchQuery = query;
            this.currentPage = 1;
        },

        /**
         * setFilterByStatus: Sets the filter by final analysis status.
         * Resets pagination to the first page.
         * @param {string | null} status - The status to filter by (e.g., 'Normal', 'Alerta', 'Peligro') or null to clear the filter.
         */
        setFilterByStatus(status) {
            this.filterByStatus = status;
            this.currentPage = 1;
        },

        /**
         * setFilterByAssetId: Sets the filter by a specific asset ID.
         * Resets pagination to the first page.
         * @param {string | null} assetId - The asset ID to filter by or null to clear the filter.
         */
        setFilterByAssetId(assetId) {
            this.filterByAssetId = assetId;
            this.currentPage = 1;
        },

        /**
         * setFilterBySensorId: Sets the filter by a specific sensor ID.
         * Resets pagination to the first page.
         * @param {string | null} sensorId - The sensor ID to filter by or null to clear the filter.
         */
        setFilterBySensorId(sensorId) {
            this.filterBySensorId = sensorId;
            this.currentPage = 1;
        },

        /**
         * setCurrentPage: Updates the current page of pagination.
         * @param {number} page - The page number to go to.
         */
        setCurrentPage(page) {
            if (page >= 1 && page <= this.getTotalPages) {
                this.currentPage = page;
            }
        },

        /**
         * setItemsPerPage: Updates the number of items to display per page.
         * Resets pagination to the first page.
         * @param {number} count - The number of items per page.
         */
        setItemsPerPage(count) {
            this.itemsPerPage = count;
            this.currentPage = 1;
        },

        /**
         * subscribeToAnalysisResults: Subscribes to real-time changes in the 'analysis_results' table from Supabase.
         */
        subscribeToAnalysisResults() {
            const { $supabase } = useNuxtApp(); // Use $supabase aquí
            this.unsubscribeFromAnalysisResults();

            this.analysisSubscription = $supabase // Use $supabase aquí
                .channel('analysis_results_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'analysis_results' }, payload => {
                    console.log('Cambio detectado en analysis_results (tiempo real):', payload);
                    this.fetchAnalysisResults();
                })
                .subscribe();
            console.log('Suscrito a cambios en tiempo real en analysis_results.');
        },

        /**
         * unsubscribeFromAnalysisResults: Unsubscribes the Supabase client from real-time changes.
         */
        unsubscribeFromAnalysisResults() {
            const { $supabase } = useNuxtApp(); // Use $supabase aquí
            if (this.analysisSubscription) {
                $supabase.removeChannel(this.analysisSubscription); // Use $supabase aquí
                this.analysisSubscription = null;
                console.log('Desuscrito de cambios en tiempo real en analysis_results.');
            }
        },

        /**
         * translateStatus: Helper to translate analysis statuses to a user-friendly format for the UI.
         */
        translateStatus(status) {
            switch (status) {
                case 'Normal': return 'Normal';
                case 'Alerta': return 'Alerta';
                case 'Precaucion': return 'Precaución';
                case 'Peligro': return 'Peligro';
                case 'No Definido': return 'No Definido';
                default: return status;
            }
        },

        /**
         * getStatusBadgeClass: Returns Tailwind CSS classes for a 'badge' based on the analysis status.
         */
        getStatusBadgeClass(status) {
            switch (status) {
                case 'Normal': return 'bg-green-100 text-green-800';
                case 'Alerta': return 'bg-yellow-100 text-yellow-800';
                case 'Precaucion': return 'bg-orange-100 text-orange-800';
                case 'Peligro': return 'bg-red-100 text-red-800';
                case 'No Definido': return 'bg-gray-100 text-gray-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        }
    }
});
