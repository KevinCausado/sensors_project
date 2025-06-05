<template>
  <div>
    <PageHeader
      title="Nuevo Usuario"
      subtitle="Crear un nuevo usuario en el sistema">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink
            to="/users"
            class="btn btn-secondary">
            Volver
          </NuxtLink>
          <!-- <button
            @click="saveUser"
            class="btn btn-primary flex items-center"
            :disabled="saving">
            <CheckIcon class="h-5 w-5 mr-2" />
            {{ saving ? 'Guardando...' : 'Guardar Usuario' }}
          </button> -->
        </div>
      </template>
    </PageHeader>

    <div class="max-w-3xl mx-auto">
      <div class="card">
        <form @submit.prevent="saveUser" class="space-y-6">
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Nombre</label>
              <input
                v-model="form.firstName"
                type="text"
                required
                class="form-input" />
            </div>

            <div>
              <label class="form-label">Apellido</label>
              <input
                v-model="form.lastName"
                type="text"
                required
                class="form-input" />
            </div>
          </div>

          <div>
            <label class="form-label">Correo Electrónico</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="form-input" />
          </div>

          <div>
            <label class="form-label">Contraseña</label>
            <input
              v-model="form.password"
              type="password"
              required
              class="form-input" />
            <p class="mt-1 text-sm text-gray-500">
              La contraseña debe tener al menos 8 caracteres
            </p>
          </div>

          <div>
            <label class="form-label">Rol</label>
            <select
              v-model="form.role"
              required
              class="form-input">
              <option value="" disabled>Selecciona un rol</option>
              <option
                v-for="roleOption in authStore.availableRoles"
                :key="roleOption.id"
                :value="roleOption.id">
                {{ roleOption.name }}
              </option>
            </select>
          </div>

         <div>
            <label class="form-label">Organización</label>
            <select
              v-model="form.organizationId"
              required
              class="form-input">
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
            <NuxtLink
              to="/users"
              class="btn btn-secondary">
              Cancelar
            </NuxtLink>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="saving">
              {{ saving ? 'Guardando...' : 'Guardar Usuario' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router'; // Importa useRouter
import { useUserStore } from '~/stores/users';
import { useOrganizationStore } from '~/stores/organizations';
import { useAuthStore } from '~/stores/auth'; // Importa el authStore

// Icons (Esto es solo un placeholder, asegúrate de que tus iconos estén configurados correctamente)
import { defineComponent, h } from 'vue';
const CheckIcon = defineComponent({
  render: () => h('div') // Esto renderiza un div vacío para el icono
});

// Define el middleware para la página
definePageMeta({
  // middleware: ['auth']
});

// Instancia los stores y el router
const router = useRouter();
const userStore = useUserStore();
const organizationStore = useOrganizationStore();
const authStore = useAuthStore();

// --- Estado reactivo del formulario ---
const saving = ref(false);
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: '', // Esto almacenará el ID (UUID) del rol seleccionado por el usuario
  organizationId: ''
});

// --- Propiedades computadas ---
const organizations = computed(() => organizationStore.organizations);

// --- Métodos del componente ---
const saveUser = async () => {
  try {
    saving.value = true;

    // 1. Encuentra el objeto de rol completo usando el ID (UUID) seleccionado
    // form.value.role contiene el ID (UUID) del rol que el usuario seleccionó.
    const selectedRoleObject = authStore.availableRoles.find(
      (r) => r.id === form.value.role
    );

    // Maneja el caso en que el rol seleccionado no se encuentre (ej. si la lista no cargó bien)
    if (!selectedRoleObject) {
      console.error('Error: El rol seleccionado no se encontró en la lista de roles disponibles.');
      throw new Error('Por favor, selecciona un rol válido.');
    }

    // 2. Prepara el objeto de datos que vas a enviar a `userStore.createUser`.
    // ¡Aquí convertimos el ID del rol a su NOMBRE (string ENUM) para la base de datos!
    const userDataToSave = {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      email: form.value.email,
      password: form.value.password, // La contraseña es necesaria para la creación de un nuevo usuario
      role: selectedRoleObject.name, // <-- ¡ESTA ES LA CLAVE! Enviamos el nombre del ENUM
      organizationId: form.value.organizationId,
    };

    // Opcional: Para depuración, puedes ver qué se va a enviar
    console.log('Datos preparados para crear usuario:', userDataToSave);

    // 3. Llama a la acción `createUser` del store con los datos preparados
    await userStore.createUser(userDataToSave);

    // 4. Redirige al usuario a la lista de usuarios después de una creación exitosa
    router.push('/users');
  } catch (error) {
    console.error('Error al guardar usuario:', error);
    // Aquí puedes implementar una notificación de error para el usuario, si lo deseas.
    // Por ejemplo: useToast().error(error.message || 'Error al crear el usuario.');
  } finally {
    saving.value = false; // Desactiva el estado de guardado
  }
};

// --- Carga de datos iniciales al montar el componente ---
onMounted(async () => {
  try {
    // Carga las organizaciones si no están ya en el store
    if (organizationStore.organizations.length === 0) {
      await organizationStore.fetchOrganizations();
    }
    // Asigna una organización por defecto si no hay una seleccionada y hay organizaciones disponibles
    if (organizations.value.length > 0 && !form.value.organizationId) {
      form.value.organizationId = organizations.value[0].id;
    }

    // Carga los roles disponibles si no están ya en el store
    // Esto es vital para que el dropdown de roles funcione
    if (authStore.availableRoles.length === 0) {
      await authStore.fetchAvailableRoles();
    }

    // Asigna un rol por defecto si no hay uno seleccionado y hay roles disponibles
    // Puedes elegir un rol específico por su nombre (ej. 'viewer') o el primer rol de la lista.
    if (authStore.availableRoles.length > 0 && !form.value.role) {
      const defaultRole = authStore.availableRoles.find(r => r.name === 'viewer'); // O el rol que consideres por defecto
      if (defaultRole) {
        form.value.role = defaultRole.id; // Asigna el ID del rol por defecto al formulario
      } else if (authStore.availableRoles.length > 0) {
        form.value.role = authStore.availableRoles[0].id; // Si 'viewer' no existe, toma el primer rol
      }
    }
  } catch (error) {
    console.error('Error al cargar datos iniciales en new.vue:', error);
    // Aquí puedes manejar errores si la carga inicial falla (ej. mostrar un mensaje al usuario).
  }
});
</script>
