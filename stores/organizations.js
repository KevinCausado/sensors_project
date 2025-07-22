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
        // Opcional: Si no hay una organización seleccionada y hay organizaciones,
        // puedes establecer una por defecto aquí, por ejemplo, la primera o "Todas" (si su ID es null)
        // if (!this.selectedOrganizationId && this.organizations.length > 0) {
        //   this.setSelectedOrganizationId(this.organizations[0].id);
        // }
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
              id, first_name,last_name, email, is_active, created_at,
              roles (
                name
              )
            ),
            assets_base!assets_base_organization_id_fkey (
              id,
              name,
              description,
              asset_code,
              city,
              state,
              country,
              assets_types!fk_assets_base_assets_types_new(name), 
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
              threshold_normal_max,
              assets_base(name) 
                                               
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

        // Post-processing: Flatten roleName, assetTypeName, and add assetName for alerts
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
           if (data.sensors) {
              data.sensors = data.sensors.map(sensor => ({
                  ...sensor,
                  thresholds: sensor.thresholds && sensor.thresholds.length > 0 ? sensor.thresholds[0] : null,
              }));
          }
          // INICIO DEL CAMBIO: Mapear el nombre del activo para las alertas
          if (data.alerts) {
            data.alerts = data.alerts.map(alert => ({
              ...alert,
              // Accede a la propiedad 'name' dentro del objeto 'assets_base' anidado que Supabase retorna.
              // 'assets_base' aquí es el nombre de la relación que Supabase te dio al hacer el .select()
              assetName: alert.assets_base ? alert.assets_base.name : 'N/A' 
            }));
          }
          // FIN DEL CAMBIO
        }
        // console.log('Organización cargada con relaciones (para depuración):', data); // Depuración crítica
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

    /**
     * Establece el ID de la organización actualmente seleccionada en el estado.
     * Esta acción es usada por componentes como el sidebar para cambiar el filtro global.
     * @param {string|null} orgId - El ID de la organización a seleccionar, o null para "Todas las organizaciones".
     */
    setSelectedOrganizationId(orgId) {
      // console.log(`[Organization Store] setSelectedOrganizationId llamado con ID: ${orgId}`);
      this.selectedOrganizationId = orgId;
    },
  },
});
