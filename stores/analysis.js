import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { useSensorStore } from './sensors';
import { useAssetStore } from './assets';

export const useAnalysisStore = defineStore('analysis', {
    state: () => ({
        analysisResults: [],
        isLoading: false,
        error: null,
        analysisSubscription: null,
        currentPage: 1,
        itemsPerPage: 10,
        filterByStatus: '',
        filterByAssetId: '',
        searchQuery: '',
    }),

    getters: {
        getFilteredAndGroupedResults(state) {
            const assetStore = useAssetStore();
            const sensorStore = useSensorStore();

            if (!state.analysisResults.length) {
                return [];
            }

            // 1. Agrupar todas las mediciones por asset_id
            const resultsByAsset = state.analysisResults.reduce((acc, result) => {
                const assetId = result.asset_id;
                if (!acc[assetId]) {
                    const asset = assetStore.assets.find(a => a.id === assetId);
                    acc[assetId] = {
                        asset_id: assetId,
                        asset_name: asset ? asset.name : 'Activo Desconocido',
                        sensor_readings: []
                    };
                }
                const sensor = sensorStore.sensors.find(s => s.id === result.sensor_id);
                acc[assetId].sensor_readings.push({
                    ...result,
                    sensor_name: sensor ? sensor.name : 'Sensor Desconocido',
                    sensor_type: sensor ? sensor.type : 'N/A',
                    sensor_unit: sensor ? sensor.unit : 'N/A'
                });
                return acc;
            }, {});

            // 2. Procesar cada grupo para calcular estado general y última fecha
            const statusSeverity = { 'Crítico': 5, 'critico': 5, 'Peligro': 4, 'Precaucion': 3, 'Precaución': 3, 'Alerta': 2, 'Normal': 1, 'No Definido': 0 };
            let processedAssets = Object.values(resultsByAsset).map(assetGroup => {
                assetGroup.sensor_readings.sort((a, b) => new Date(b.analysis_timestamp) - new Date(a.analysis_timestamp));
                
                let overallStatus = 'No Definido';
                let maxSeverity = -1;

                assetGroup.sensor_readings.forEach(reading => {
                    const severity = statusSeverity[reading.final_status] || 0;
                    if (severity > maxSeverity) {
                        maxSeverity = severity;
                        overallStatus = reading.final_status;
                    }
                });

                return {
                    ...assetGroup,
                    latest_timestamp: assetGroup.sensor_readings[0]?.analysis_timestamp,
                    overall_status: overallStatus,
                };
            });
            
            // 3. Aplicar filtros
            if (state.filterByStatus) {
                processedAssets = processedAssets.filter(asset => asset.overall_status === state.filterByStatus);
            }
            if (state.filterByAssetId) {
                processedAssets = processedAssets.filter(asset => asset.asset_id === state.filterByAssetId);
            }
            if (state.searchQuery) {
                const query = state.searchQuery.toLowerCase();
                processedAssets = processedAssets.filter(asset =>
                    asset.asset_name.toLowerCase().includes(query) ||
                    asset.sensor_readings.some(r => r.sensor_name.toLowerCase().includes(query))
                );
            }

            // 4. Ordenar activos
            processedAssets.sort((a, b) => new Date(b.latest_timestamp) - new Date(a.latest_timestamp));

            return processedAssets;
        },

        getPaginatedResults(state) {
            const results = this.getFilteredAndGroupedResults;
            const startIndex = (state.currentPage - 1) * state.itemsPerPage;
            return results.slice(startIndex, startIndex + state.itemsPerPage);
        },

        getTotalResults(state) {
            return this.getFilteredAndGroupedResults.length;
        },

        getTotalPages(state) {
            return Math.ceil(this.getTotalResults / state.itemsPerPage);
        }
    },

    actions: {
        async fetchAnalysisResults() {
            this.isLoading = true;
            this.error = null;
            try {
                const { $supabase } = useNuxtApp();
                const sensorStore = useSensorStore();
                const assetStore = useAssetStore();
                if (sensorStore.sensors.length === 0) await sensorStore.fetchSensors();
                if (assetStore.assets.length === 0) await assetStore.fetchAssets();

                const { data, error } = await $supabase
                    .from('analysis_results')
                    .select('*')
                    .order('analysis_timestamp', { ascending: false });

                if (error) throw error;
                this.analysisResults = data || [];
            } catch (e) {
                this.error = e.message;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Maneja una actualización en tiempo real de Supabase.
         * @param {Object} payload - El payload del evento de Supabase.
         */
        handleRealtimeUpdate(payload) {
            console.log('Realtime update received:', payload);
            const { eventType, new: newRecord, old: oldRecord } = payload;

            if (eventType === 'INSERT') {
                // Añade el nuevo registro al principio de la lista para que aparezca inmediatamente.
                this.analysisResults.unshift(newRecord);
            } 
            else if (eventType === 'UPDATE') {
                // Busca el índice del registro a actualizar.
                const index = this.analysisResults.findIndex(r => r.id === newRecord.id);
                if (index !== -1) {
                    // Reemplaza el registro antiguo con el nuevo.
                    this.analysisResults[index] = newRecord;
                } else {
                    // Si no lo encuentra, lo añade. Puede pasar si el registro no estaba en la carga inicial.
                    this.analysisResults.unshift(newRecord);
                }
            } 
            else if (eventType === 'DELETE') {
                // Filtra el registro eliminado de la lista.
                this.analysisResults = this.analysisResults.filter(r => r.id !== oldRecord.id);
            }
        },

        /**
         * Se suscribe a los cambios en la tabla 'analysis_results'.
         */
        subscribeToAnalysisResults() {
            // Si ya hay una suscripción, no hacer nada.
            if (this.analysisSubscription) return;

            const { $supabase } = useNuxtApp();
            this.analysisSubscription = $supabase
                .channel('custom-analysis-channel')
                .on(
                    'postgres_changes', 
                    { event: '*', schema: 'public', table: 'analysis_results' }, 
                    (payload) => {
                        // Llama a la nueva acción para manejar el cambio.
                        this.handleRealtimeUpdate(payload);
                    }
                )
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('Successfully subscribed to analysis_results channel!');
                    }
                    if (status === 'CHANNEL_ERROR') {
                        console.error(`Error subscribing to channel:`, err);
                    }
                });
        },

        /**
         * Cancela la suscripción al canal de realtime.
         */
        unsubscribeFromAnalysisResults() {
            if (this.analysisSubscription) {
                const { $supabase } = useNuxtApp();
                $supabase.removeChannel(this.analysisSubscription);
                this.analysisSubscription = null;
                console.log('Unsubscribed from analysis_results channel.');
            }
        },

        // Otras acciones...
        setSearchQuery(query) { this.searchQuery = query; this.currentPage = 1; },
        setFilterByStatus(status) { this.filterByStatus = status; this.currentPage = 1; },
        setFilterByAssetId(assetId) { this.filterByAssetId = assetId; this.currentPage = 1; },
        setCurrentPage(page) { this.currentPage = page; },

        translateStatus(status) {
            if (!status) return 'N/A';
            const translations = { 'Precaucion': 'Precaución', 'Critico': 'Crítico', 'critico': 'Crítico' };
            return translations[status] || status;
        },
    }
});
