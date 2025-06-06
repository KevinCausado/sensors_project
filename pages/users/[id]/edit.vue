<template>
  <div>
    <PageHeader
      title="Editar Usuario"
      :subtitle="`Editar usuario ${user?.first_name} ${user?.last_name}`"
    >
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/users" class="btn btn-secondary">
            Volver
          </NuxtLink>
          <!-- Se eliminó el '-' problemático de aquí -->
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else class="max-w-3xl mx-auto">
      <div class="card">
        <form @submit.prevent="saveUser" class="space-y-6">
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Nombre</label>
              <input
                v-model="form.firstName"
                type="text"
                required
                class="form-input"
              />
            </div>

            <div>
              <label class="form-label">Apellido</label>
              <input
                v-model="form.lastName"
                type="text"
                required
                class="form-input"
              />
            </div>
          </div>

          <div>
            <label class="form-label">Correo Electrónico</label>
            <input
              v-model="form.email"
              type="email"
              required
              disabled
              class="form-input bg-gray-50"
            />
            <p class="mt-1 text-sm text-gray-500">
              El correo electrónico no puede ser modificado
            </p>
          </div>

          <div>
            <label class="form-label">Rol</label>
            <select
              v-model="form.role_id"
              required
              class="form-input"
            >
              <option value="" disabled>Selecciona un rol</option>
              <option
                v-for="roleOption in authStore.availableRoles"
                :key="roleOption.id"
                :value="roleOption.id"
              >
                {{ roleOption.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="form-label">Organización</label>
            <select
              v-model="form.organization_id"
              required
              class="form-input"
            >
              <option value="" disabled>Selecciona una organización</option>
              <option
                v-for="org in organizationStore.organizations"
                :key="org.id"
                :value="org.id">
                {{ org.name }}
              </option>
            </select>
          </div>

          <div class="flex justify-end gap-2">
            <NuxtLink to="/users" class="btn btn-secondary">
              Cancelar
            </NuxtLink>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="saving"
            >
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '~/stores/users';
import { useOrganizationStore } from '~/stores/organizations';
import { useAuthStore } from '~/stores/auth';

// Icons (placeholder)
import { defineComponent, h } from 'vue';
const CheckIcon = defineComponent({
  render: () => h('div')
});

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const organizationStore = useOrganizationStore(); // CORREGIDO: Añadido 'const'
const authStore = useAuthStore(); // CORREGIDO: Añadido 'const'

// Estado
const loading = ref(true);
const saving = ref(false);
const user = ref(null); // Aquí se guardará el usuario tal como viene del store
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  role_id: '',
  organization_id: ''
});

// Computed
const organizations = computed(() => organizationStore.organizations);

// Métodos
const loadUser = async () => {
    try {
        const fetchedUser = await userStore.fetchUserById(route.params.id);
        if (fetchedUser) {
            user.value = fetchedUser; // Asigna el usuario completo al ref 'user'

            // Mapea los datos del usuario cargado al formulario, convirtiendo a camelCase si es necesario
            form.value = {
                firstName: fetchedUser.first_name || '', // De first_name (DB) a firstName (Form)
                lastName: fetchedUser.last_name || '',   // De last_name (DB) a lastName (Form)
                email: fetchedUser.email || '',
                role_id: fetchedUser.role_id || '',
                organization_id: fetchedUser.organization_id || ''
            };
            console.log('Usuario cargado y datos del formulario asignados:', form.value);
        } else {
            console.error('Usuario no encontrado');
            router.push('/users');
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
        router.push('/users');
    }
};

const saveUser = async () => {
  try {
    saving.value = true;

    // Prepara el objeto de datos que vas a enviar a Supabase.
    // Los nombres de propiedad deben coincidir con lo que espera updateUser en el store.
    const userDataToSave = {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      email: form.value.email, // Se envía, pero no se actualiza a través de este método en Supabase Auth
      role_id: form.value.role_id,
      organization_id: form.value.organization_id,
      is_active: user.value.is_active // Mantén el estado de activo del usuario actual
    };

    console.log('Datos enviados a Supabase para actualización:', userDataToSave);

    await userStore.updateUser(route.params.id, userDataToSave);

    router.push('/users');
  } catch (error) {
    console.error('Error al guardar usuario:', error);
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
    try {
        loading.value = true;
        await Promise.all([
            authStore.availableRoles.length === 0 ? authStore.fetchAvailableRoles() : Promise.resolve(),
            organizationStore.organizations.length === 0 ? organizationStore.fetchOrganizations() : Promise.resolve()
        ]);
        await loadUser();
    } catch (error) {
        console.error('Error al cargar datos iniciales en editUser.vue:', error);
    } finally {
        loading.value = false;
    }
});
</script>
