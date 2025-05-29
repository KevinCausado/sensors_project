<template>
  <div>
    <PageHeader
      title="Detalles del Usuario"
      :subtitle="`${user?.firstName} ${user?.lastName}`"
    >
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink
            to="/users"
            class="btn btn-secondary"
          >
            Volver
          </NuxtLink>
          <!-- <PermissionGuard moduleId="users" permission="editar">
            <NuxtLink
              :to="`/users/${route.params.id}/edit`"
              class="btn btn-primary"
            >
              Editar Usuario
            </NuxtLink>
          </PermissionGuard> -->
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="!user" class="text-center py-8 text-gray-500">
      Usuario no encontrado
    </div>

    <div v-else class="max-w-3xl mx-auto space-y-6">
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Información Personal</h2>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-500">Nombre</label>
            <p class="mt-1 text-sm text-gray-900">{{ user.firstName }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Apellido</label>
            <p class="mt-1 text-sm text-gray-900">{{ user.lastName }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Correo Electrónico</label>
            <p class="mt-1 text-sm text-gray-900">{{ user.email }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Rol</label>
            <span class="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getRoleBadgeClass(user.role)">
              {{ translateRole(user.role) }}
            </span>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Organización</label>
            <p class="mt-1 text-sm text-gray-900">{{ user.organizationName }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Último Acceso</label>
            <p class="mt-1 text-sm text-gray-900">
              {{ formatDate(user.lastLogin) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '~/stores/users';

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const userStore = useUserStore();

// Estado
const loading = ref(true);
const user = ref(null);

// Métodos
const getRoleBadgeClass = (role) => {
  switch (role) {
    case 'super-admin':
      return 'bg-primary-100 text-primary-800';
    case 'admin':
      return 'bg-secondary-100 text-secondary-800';
    case 'technician':
      return 'bg-warning-100 text-warning-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const translateRole = (role) => {
  const roles = {
    'super-admin': 'Super Admin',
    'admin': 'Administrador',
    'technician': 'Técnico',
    'viewer': 'Visualizador'
  };
  return roles[role] || role;
};

const formatDate = (date) => {
  if (!date) return 'Nunca';
  // Ajusta la configuración regional si no es 'es-ES' o si prefieres un formato diferente
  return new Date(date).toLocaleString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Cargar datos
onMounted(async () => {
  try {
    // *** CAMBIO CLAVE AQUÍ: Llama a fetchUser en lugar de getUserById ***
    user.value = await userStore.fetchUser(route.params.id);
  } catch (error) {
    console.error('Error al cargar usuario:', error);
    // Opcional: Redirigir o mostrar un mensaje de error si el usuario no se carga
    // router.push('/users');
  } finally {
    loading.value = false;
  }
});
</script>