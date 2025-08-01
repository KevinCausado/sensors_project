<template>
  <div>
    <PageHeader 
      title="Editar Organización" 
      :subtitle="organization?.name">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink 
            to="/organizations"
            class="btn btn-secondary">
            Volver
          </NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-500">Cargando información de la organización...</p>
    </div>

    <div v-else class="max-w-3xl mx-auto">
      <div class="card">
        <form @submit.prevent="saveOrganization" class="space-y-6">
          <div>
            <label class="form-label">Nombre</label>
            <input 
              v-model="form.name"
              type="text"
              required
              class="form-input" />
          </div>

          <div>
            <label class="form-label">Dirección</label>
            <input 
              v-model="form.address"
              type="text"
              class="form-input" />
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label class="form-label">Ciudad</label>
              <input
                v-model="form.city"
                type="text"
                class="form-input"
              />
            </div>
            <div>
              <label class="form-label">Estado</label>
              <input
                v-model="form.state"
                type="text"
                class="form-input"
              />
            </div>
            <div>
              <label class="form-label">País</label>
              <input
                v-model="form.country"
                type="text"
                class="form-input"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Correo de Contacto</label>
              <input 
                v-model="form.contact_email"
                type="email"
                required
                class="form-input" />
            </div>

            <div>
              <label class="form-label">Teléfono de Contacto</label>
              <input 
                v-model="form.phone_number"
                type="tel"
                class="form-input" />
            </div>
          </div>

          <div>
            <label class="form-label">Estado</label>
            <select
              v-model="form.is_active"
              required
              class="form-input"
            >
              <option :value="true">Activo</option>
              <option :value="false">Inactivo</option>
            </select>
          </div>
          <div class="flex justify-end gap-2">
            <NuxtLink 
              to="/organizations"
              class="btn btn-secondary">
              Cancelar
            </NuxtLink>
            <button type="submit" class="btn btn-primary flex items-center" :disabled="saving">
              <span v-if="saving" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useOrganizationStore } from '~/stores/organizations';
import { useBreadcrumbStore } from "~/stores/breadCrumb";

// Icons (placeholder)
import { defineComponent, h } from 'vue';
const CheckIcon = defineComponent({
  render: () => h('div', { class: 'i-heroicons-check' })
});

definePageMeta({
  middleware: ['auth']
});

const route = useRoute();
const router = useRouter();
const organizationStore = useOrganizationStore();
const breadcrumbStore = useBreadcrumbStore()

// Estado
const loading = ref(true);
const saving = ref(false);
const organization = ref(null);

const form = ref({
  name: '',
  address: '',
  city: '',           
  state: '',          
  country: '',        
  contact_email: '',  
  phone_number: '',  
  is_active: false,   // Default to false, will be overridden by fetched data
});

// Métodos
const loadOrganization = async () => {
  loading.value = true;
  try {
    await organizationStore.fetchOrganizations();
    const org = organizationStore.organizations.find(o => o.id === route.params.id);

    if (!org) {
      console.error('Organización no encontrada para ID:', route.params.id);
      router.push('/organizations');
      return;
    }
    
    organization.value = org;
    
    // Populate form with fetched data
    // Ensure `is_active` is populated correctly. `?? false` as a fallback.
    form.value = {
      name: org.name || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      country: org.country || '',
      contact_email: org.contact_email || '',
      phone_number: org.phone_number || '',
      is_active: org.is_active ?? false, 
    };

    breadcrumbStore.setNameForPath({
        path: `/organizations/${route.params.id}`,
        name: org.name
    });

  } catch (error) {
    console.error('Error al cargar organización:', error);
    alert('Error al cargar organización: ' + error.message);
    router.push('/organizations');
  } finally {
    loading.value = false;
  }
};

const saveOrganization = async () => {
  try {
    saving.value = true;
    await organizationStore.updateOrganization(route.params.id, form.value);
    router.push('/organizations');
  } catch (error) {
    console.error('Error al guardar organización:', error);
    alert('Error al guardar cambios: ' + error.message);
  } finally {
    saving.value = false;
  }
};

// Remover helper functions for status badge, as they are no longer needed
// const getOrganizationStatusClass = (isActive) => { ... };
// const translateOrganizationStatus = (isActive) => { ... };

// Cargar datos al montar el componente
onMounted(loadOrganization);
onUnmounted(() => {
    
});
</script>