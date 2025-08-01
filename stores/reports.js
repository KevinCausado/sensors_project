import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';

export const useReportStore = defineStore('reports', {
    state: () => ({
        configurations: [],
        schedules: [],
        isLoading: false,
        error: null,
    }),
    actions: {
        // --- Acciones para Configuraciones de Correo ---
        async fetchConfigurations() {
            this.isLoading = true;
            this.error = null;
            try {
                const { $supabase } = useNuxtApp();                
                const { data, error } = await $supabase.from('report_configurations').select('id, name, sender_email, host, port, secure').order('name');
                if (error) throw error;
                this.configurations = data;
            } catch (e) {
                this.error = e.message;
                console.error("Error fetching configurations:", e);
            } finally {
                this.isLoading = false;
            }
        },
        
      
        async createConfiguration(configData, password) {
            this.isLoading = true;
            this.error = null;
            try {
                const { $supabase } = useNuxtApp();
                
                const { data: newConfig, error } = await $supabase.from('report_configurations').insert(configData).select().single();
                if (error) throw error;

               
                if (newConfig && password) {                   
                    const { error: rpcError } = await $supabase.rpc('set_encrypted_smtp_password', {
                        p_configuration_id: newConfig.id,
                        p_plain_password: password
                    });
                    if (rpcError) throw new Error(`La configuración se guardó, pero falló al encriptar la contraseña: ${rpcError.message}`);
                }

                await this.fetchConfigurations(); // Recargar la lista
                return newConfig;
            } catch (e) {
                this.error = e.message;
                console.error("Error creating configuration:", e);
                throw e;
            } finally {
                this.isLoading = false;
            }
        },

        async updateConfiguration(id, configData, password) {
            this.isLoading = true;
            this.error = null;
            try {
                const { $supabase } = useNuxtApp();
                
                const { data: updatedConfig, error } = await $supabase.from('report_configurations').update(configData).eq('id', id).select().single();
                if (error) throw error;

                
                if (updatedConfig && password) {                    
                    const { error: rpcError } = await $supabase.rpc('set_encrypted_smtp_password', {
                        p_configuration_id: updatedConfig.id,
                        p_plain_password: password
                    });
                    if (rpcError) throw new Error(`La configuración se actualizó, pero falló al cambiar la contraseña: ${rpcError.message}`);
                }

                const index = this.configurations.findIndex(c => c.id === id);
                if (index !== -1) this.configurations[index] = updatedConfig;
                return updatedConfig;
            } catch (e) {
                this.error = e.message;
                console.error("Error updating configuration:", e);
                throw e;
            } finally {
                this.isLoading = false;
            }
        },
       
        async deleteConfiguration(id) {
            this.isLoading = true;
            this.error = null;
            try {
                const { $supabase } = useNuxtApp();
                const { error } = await $supabase.from('report_configurations').delete().eq('id', id);
                if (error) throw error;
                this.configurations = this.configurations.filter(c => c.id !== id);
            } catch (e) {
                this.error = e.message;
                console.error("Error deleting configuration:", e);
                throw e;
            } finally {
                this.isLoading = false;
            }
        },

        // --- Acciones para Programación de Reportes ---
        async fetchSchedules() {
            this.isLoading = true;
            this.error = null;
            try {
                const { $supabase } = useNuxtApp();            
                const { data, error } = await $supabase.from('report_schedules').select('*, timezone, config:report_configurations(name)').order('name');
                if (error) throw error;
                this.schedules = data;
            } catch (e) {
                this.error = e.message;
                console.error("Error fetching schedules:", e);
            } finally {
                this.isLoading = false;
            }
        },

        async createSchedule(scheduleData) {
            this.isLoading = true;
            this.error = null;
            try {
                const { $supabase } = useNuxtApp();               
                const { data, error } = await $supabase.from('report_schedules').insert(scheduleData).select('*, timezone, config:report_configurations(name)').single();
                if (error) throw error;
                this.schedules.push(data);
                return data;
            } catch (e) {
                this.error = e.message;
                console.error("Error creating schedule:", e);
                throw e;
            } finally {
                this.isLoading = false;
            }
        },

        async updateSchedule(id, scheduleData) {
            this.isLoading = true;
            this.error = null;
            try {
                const { $supabase } = useNuxtApp();          
                const { data, error } = await $supabase.from('report_schedules').update(scheduleData).eq('id', id).select('*, timezone, config:report_configurations(name)').single();
                if (error) throw error;
                const index = this.schedules.findIndex(s => s.id === id);
                if (index !== -1) this.schedules[index] = data;
                return data;
            } catch (e) {
                this.error = e.message;
                console.error("Error updating schedule:", e);
                throw e;
            } finally {
                this.isLoading = false;
            }
        },

        async deleteSchedule(id) {
            this.isLoading = true;
            this.error = null;
            try {
                const { $supabase } = useNuxtApp();
                const { error } = await $supabase.from('report_schedules').delete().eq('id', id);
                if (error) throw error;
                this.schedules = this.schedules.filter(s => s.id !== id);
            } catch (e) {
                this.error = e.message;
                console.error("Error deleting schedule:", e);
                throw e;
            } finally {
                this.isLoading = false;
            }
        },

     
        async markScheduleAsRun(scheduleId) {
            this.error = null;
            try {
                const { $supabase } = useNuxtApp();
                
                const { error } = await $supabase.rpc('update_schedule_after_run', {
                    schedule_id: scheduleId
                });

                if (error) throw error;
               
                await this.fetchSchedules();

            } catch (e) {
                this.error = e.message;
                console.error("Error marking schedule as run:", e);
                throw e; 
            }
        }
    }
});
