<template>
  <div>
    <PageHeader 
      title="Nueva Organización" 
      subtitle="Crear una nueva organización en el sistema">
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

    <div class="max-w-3xl mx-auto">
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

          <div class="flex justify-end gap-2">
            <NuxtLink 
              to="/organizations"
              class="btn btn-secondary">
              Cancelar
            </NuxtLink>
            <button 
              type="submit" 
              class="btn btn-primary"
              :disabled="saving">
              {{ saving ? 'Guardando...' : 'Guardar Organización' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineComponent, h } from 'vue'; // Ensure h is imported if used by CheckIcon or similar
import { useRouter } from 'vue-router'; // Necessary for router.push
import { useOrganizationStore } from '~/stores/organizations';

// Icons (placeholder) - Only include if these components are actually used.
// If CheckIcon is not visually present due to the is_active checkbox removal, it can be removed.
const CheckIcon = defineComponent({
  render: () => h('div', { class: 'i-heroicons-check' }) // Placeholder for a generic check icon from heroicons
});


definePageMeta({
  middleware: ['auth']
});

const router = useRouter(); // Initialize useRouter
const organizationStore = useOrganizationStore();

// Estado
const saving = ref(false);
const form = ref({
  name: '',
  address: '',
  // NEW: Added city, state, country, and is_active with default true
  city: '',          
  state: '',         
  country: '',       
  contact_email: '',
  phone_number: '',
  is_active: true,   // Default to true as confirmed
});

// Métodos (NOT MODIFIED AS PER INSTRUCTION)
const saveOrganization = async () => {
  try {
    saving.value = true;
    await organizationStore.createOrganization({
      ...form.value,
      // The addOrganization action in your store should be set up to receive these new fields.
    });
    router.push("/organizations");
  } catch (error) {
    console.error("Error al guardar organización:", error);
    alert('Error al guardar organización: ' + error.message);
  } finally {
    saving.value = false;
  }
};
</script>