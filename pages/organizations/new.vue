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
          <!-- <button 
            @click="saveOrganization" 
            class="btn btn-primary flex items-center"
            :disabled="saving">
            <CheckIcon class="h-5 w-5 mr-2" />Pane
            {{ saving ? 'Guardando...' : 'Guardar Organización' }}
          </button> -->
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

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Correo de Contacto</label>
              <input 
                v-model="form.contactEmail"
                type="email"
                required
                class="form-input" />
            </div>

            <div>
              <label class="form-label">Teléfono de Contacto</label>
              <input 
                v-model="form.contactPhone"
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
import { ref } from 'vue';
import { useOrganizationStore } from '~/stores/organizations';

// Icons (placeholder)
const CheckIcon = defineComponent({
  render: () => h('div')
});

definePageMeta({
  middleware: ['auth']
});

const router = useRouter();
const organizationStore = useOrganizationStore();

// Estado
const saving = ref(false);
const form = ref({
  name: '',
  address: '',
  contactEmail: '',
  contactPhone: ''
});

// Métodos
const saveOrganization = async () => {
  try {
    saving.value = true;
    await organizationStore.addOrganization(form.value);
    router.push('/organizations');
  } catch (error) {
    console.error('Error al guardar organización:', error);
  } finally {
    saving.value = false;
  }
};
</script>