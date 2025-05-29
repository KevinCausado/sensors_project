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
          <!-- <button 
            @click="saveOrganization" 
            class="btn btn-primary flex items-center"
            :disabled="saving">
            <CheckIcon class="h-5 w-5 mr-2" />
            {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
          </button> -->
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
import { useOrganizationStore } from '~/stores/organizations';

// Icons (placeholder)
const CheckIcon = defineComponent({
  render: () => h('div')
});

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const router = useRouter();
const organizationStore = useOrganizationStore();

// Estado
const loading = ref(true);
const saving = ref(false);
const organization = ref(null);
const form = ref({
  name: '',
  address: '',
  contactEmail: '',
  contactPhone: ''
});

// Métodos
const loadOrganization = async () => {
  try {
    const org = await organizationStore.organizations.find(o => o.id === route.params.id);
    if (!org) {
      throw new Error('Organización no encontrada');
    }
    organization.value = org;
    form.value = { ...org };
  } catch (error) {
    console.error('Error al cargar organización:', error);
    router.push('/organizations');
  }
};

const saveOrganization = async () => {
  try {
    saving.value = true;
    await organizationStore.updateOrganization(route.params.id, form.value);
    router.push('/organizations');
  } catch (error) {
    console.error('Error al guardar organización:', error);
  } finally {
    saving.value = false;
  }
};

// Cargar datos
onMounted(async () => {
  try {
    await loadOrganization();
  } finally {
    loading.value = false;
  }
});
</script>