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

          
            const statusSeverity = { 'Crítico': 5, 'critico': 5, 'Peligro': 4, 'Precaucion': 3, 'Precaución': 3, 'Alerta': 2, 'Normal': 1, 'No Definido': 0 };
            
          
            const getCorrectedVibrationStatus = (reading) => {
                const profile = sensorStore.getVibrationProfileFromCache(reading.asset_id);
                if (!profile || !profile.ranges || profile.ranges.length === 0) {
                    return reading.final_status; // Fallback al estado de la DB
                }

                const highestValue = Math.max(
                    parseFloat(reading.axes_values?.x) || 0,
                    parseFloat(reading.axes_values?.y) || 0,
                    parseFloat(reading.axes_values?.z) || 0
                );

                const sortedRanges = [...profile.ranges].sort((a, b) => a.min_value - b.min_value);
              
                if (highestValue < sortedRanges[0].min_value) {
                    return `${sortedRanges[0].condition_name} (Zona ${sortedRanges[0].severity})`;
                }

                let determinedRange = null;                
                for (const range of sortedRanges) {
                    if (highestValue >= range.min_value) {
                        determinedRange = range;
                    } else {
                        break;
                    }
                }

                if (determinedRange) {
                    return `${determinedRange.condition_name} (Zona ${determinedRange.severity})`;
                }

                return 'No Definido';
            };

            let processedAssets = Object.values(resultsByAsset).map(assetGroup => {
              
                const correctedReadings = assetGroup.sensor_readings.map(reading => {
                    let corrected_status = reading.final_status;
                    if (reading.sensor_type === 'vibration' && reading.axes_values) {
                        corrected_status = getCorrectedVibrationStatus(reading);
                    }
                    return { ...reading, corrected_status };
                });               
          
                const severityMap = {
                    'crítico': 4, 'inaceptable': 4, 'extrema': 4, 'peligro': 4,
                    'advertencia': 3, 'insatisfactoria': 3, 'precaución': 3, 'precaucion': 3,
                    'satisfactoria': 2, 'normal': 1, 'no definido': 0, 'alerta': 2
                };

                let maxSeverity = 0;
                correctedReadings.forEach(reading => {
                    const status = (reading.corrected_status || 'No Definido').split(' (')[0].toLowerCase();
                    const level = severityMap[status] ?? 0;
                    if (level > maxSeverity) {
                        maxSeverity = level;
                    }
                });

                let overallStatus;
                if (maxSeverity >= 4) {
                    overallStatus = 'Crítico';
                } else if (maxSeverity === 3) {
                    overallStatus = 'Advertencia';
                } else if (maxSeverity > 0) {
                    overallStatus = 'Normal';
                } else {
                    overallStatus = 'No Definido';
                }
                
               
                correctedReadings.sort((a, b) => new Date(b.analysis_timestamp) - new Date(a.analysis_timestamp));

                return {
                    ...assetGroup,
                    sensor_readings: correctedReadings, 
                    latest_timestamp: correctedReadings[0]?.analysis_timestamp,
                    overall_status: overallStatus, // Se asigna el estado definitivo para el filtro.
                };
            });
          
            // Este filtro ahora funcionará correctamente.
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
                    .rpc('get_complete_analysis_results');

                if (error) throw error;
                this.analysisResults = data || [];
            } catch (e) {
                this.error = e.message;
            } finally {
                this.isLoading = false;
            }
        },

       handleRealtimeUpdate(payload) {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            const sensorStore = useSensorStore();

            if (eventType === 'INSERT') {
                this.analysisResults.unshift(newRecord);
                return;
            } 
            
            if (eventType === 'DELETE') {
                this.analysisResults = this.analysisResults.filter(r => r.id !== oldRecord.id);
                return;
            }

            if (eventType === 'UPDATE') {
                const index = this.analysisResults.findIndex(r => r.id === newRecord.id);
                
                if (index !== -1) {                  
                    const existingRecord = this.analysisResults[index];
                    const sensor = sensorStore.getSensorById(newRecord.sensor_id);
                 
                    if (sensor && sensor.type === 'vibration' && newRecord.axes_values) {
                        
                  
                        const mergedAxes = {
                            ...existingRecord.axes_values,
                            ...newRecord.axes_values
                        };                        
                      
                        const finalRecord = {
                            ...newRecord,
                            axes_values: mergedAxes
                        };                        
                      
                        this.analysisResults[index] = finalRecord;
                        
                    } else {
                        
                        this.analysisResults[index] = newRecord;
                    }
                   
                } else {
                    
                    this.analysisResults.unshift(newRecord);
                }
            } 
        },

        subscribeToAnalysisResults() {
            if (this.analysisSubscription) return;

            const { $supabase } = useNuxtApp();
            this.analysisSubscription = $supabase
                .channel('custom-analysis-channel')
                .on(
                    'postgres_changes', 
                    { event: '*', schema: 'public', table: 'analysis_results' }, 
                    (payload) => {
                        this.handleRealtimeUpdate(payload);
                    }
                )
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        // console.log('Successfully subscribed to analysis_results channel!');
                    }
                    if (status === 'CHANNEL_ERROR') {
                        console.error(`Error subscribing to channel:`, err);
                    }
                });
        },

        unsubscribeFromAnalysisResults() {
            if (this.analysisSubscription) {
                const { $supabase } = useNuxtApp();
                $supabase.removeChannel(this.analysisSubscription);
                this.analysisSubscription = null;
            }
        },

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
