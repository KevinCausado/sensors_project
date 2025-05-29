<template>
  <div>
    <PageHeader
      title="Editar Usuario"
      :subtitle="`Editar usuario ${user?.firstName} ${user?.lastName}`"
    >
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/users" class="btn btn-secondary">
            Volver
          </NuxtLink>
          <!-- <button
            @click="saveUser"
            class="btn btn-primary flex items-center"
            :disabled="saving"
          >
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
              v-model="form.role"
              required
              class="form-input"
            >
              <option value="" disabled>Selecciona un rol</option> <option
                v-for="roleOption in authStore.availableRoles" :key="roleOption.id"
                :value="roleOption.id"
              >
                {{ roleOption.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="form-label">Organización</label>
            <select
              v-model="form.organizationId"
              required
              class="form-input"
            >
              <option value="" disabled>Selecciona una organización</option> <option v-for="org in organizationStore.organizations"
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
import { useUserStore } from '~/stores/users';
import { useOrganizationStore } from '~/stores/organizations';
import { useAuthStore } from '~/stores/auth'; // <--- 1. IMPORTA EL AUTH STORE

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
const organizationStore = useOrganizationStore();
const authStore = useAuthStore(); // <--- 2. INSTANCIA EL AUTH STORE

// Estado
const loading = ref(true);
const saving = ref(false);
const user = ref(null);
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  role: '', // Asegúrate de que 'role' esté en el estado del formulario
  organizationId: '' // Asegúrate de que 'organizationId' esté en el estado del formulario
});

// Computed
const organizations = computed(() => organizationStore.organizations);

// Métodos
const loadUser = async () => {
    try {
        const fetchedUser = await userStore.fetchUser(route.params.id);
        if (fetchedUser) {
            user.value = fetchedUser;

            // ***** CAMBIO CLAVE AQUÍ *****
            // fetchedUser.role contiene el NOMBRE del rol (ej: "viewer")
            // Necesitamos encontrar el ID de ese rol en authStore.availableRoles
            const userRoleId = authStore.availableRoles.find(
                (roleOption) => roleOption.name === fetchedUser.role
            )?.id; // El ?.id es para manejar el caso si no se encuentra el rol

            form.value = {
                firstName: fetchedUser.firstName || '',
                lastName: fetchedUser.lastName || '',
                email: fetchedUser.email || '',
                role: userRoleId || '', // <--- ¡Ahora asignamos el ID del rol!
                organizationId: fetchedUser.organizationId || ''
            };
            console.log('Valor asignado a form.role (ID):', form.value.role, 'Tipo:', typeof form.value.role);
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

    // PASO 1: Encuentra el objeto de rol COMPLETO
    // `form.value.role` debería contener el UUID del rol seleccionado en el `<select>`
    const selectedRoleObject = authStore.availableRoles.find(
      (r) => r.id === form.value.role
    );

    // Si por alguna razón no encuentra el rol (quizás la lista no se cargó bien, etc.)
    if (!selectedRoleObject) {
      console.error('El rol seleccionado no se encontró en la lista de roles disponibles.');
      throw new Error('Rol no válido seleccionado.');
    }

    // PASO 2: Prepara el objeto de datos que vas a enviar a Supabase.
    // AQUÍ ES DONDE TE ASEGURAS DE ENVIAR EL `name` DEL ROL.
    const userDataToSave = {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      email: form.value.email, // El email está deshabilitado, pero aún se envía
      role: selectedRoleObject.name, // <<<< ¡¡¡ESTA LÍNEA ES LA CLAVE!!! <<<<
                                    // Aquí `selectedRoleObject.name` DEBE ser 'viewer', 'admin', etc.
      organizationId: form.value.organizationId,
      // Si estás en `create.vue` para crear un nuevo usuario,
      // probablemente necesites añadir la contraseña aquí:
      // password: form.value.password,
    };

    // Puedes añadir un `console.log` aquí para verificar justo antes de enviar
    console.log('Datos enviados a Supabase para actualización:', userDataToSave);

    // PASO 3: Llama a la acción del store para actualizar el usuario
    await userStore.updateUser(route.params.id, userDataToSave);

    router.push('/users'); // Redirige después de guardar
  } catch (error) {
    console.error('Error al guardar usuario:', error);
    // Aquí puedes usar una notificación para el usuario, por ejemplo, un toast.
  } finally {
    saving.value = false;
  }
};

// Cargar datos al montar el componente
onMounted(async () => {
    try {
        loading.value = true;
        await Promise.all([
            // Primero carga los roles disponibles
            authStore.availableRoles.length === 0 ? authStore.fetchAvailableRoles() : Promise.resolve(),
            // Luego carga las organizaciones
            organizationStore.organizations.length === 0 ? organizationStore.fetchOrganizations() : Promise.resolve()
        ]);
        // Una vez que los roles están cargados, puedes cargar el usuario
        await loadUser();
    } finally {
        loading.value = false;
    }
});
</script>