<template>
  <div>
    <PageHeader title="Detalles del Usuario" :subtitle="`${user?.first_name} ${user?.last_name}`">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/users" class="btn btn-secondary">Volver</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="!user" class="text-center py-8 text-gray-500">Usuario no encontrado</div>

    <div v-else class="max-w-3xl mx-auto space-y-6">
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Información Personal</h2>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-500">Nombre</label>
            <p class="mt-1 text-sm text-gray-900">{{ user.first_name }}</p>
            <!-- Modificado para usar first_name -->
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Apellido</label>
            <p class="mt-1 text-sm text-gray-900">{{ user.last_name }}</p>
            <!-- Modificado para usar last_name -->
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Correo Electrónico</label>
            <p class="mt-1 text-sm text-gray-900">{{ user.email }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Rol</label>
            <span class="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getRoleBadgeClass(user.role_name)">
              <!-- Modificado para usar role_name -->
              {{ translateRole(user.role_name) }}
              <!-- Modificado para usar role_name -->
            </span>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Organización</label>
            <p class="mt-1 text-sm text-gray-900">{{ user.organization_name }}</p>
            <!-- Modificado para usar organization_name -->
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Último Acceso</label>
            <p class="mt-1 text-sm text-gray-900">
              {{ formatDate(user.last_login) }}
              <!-- Modificado para usar last_login -->
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router"; // Asegúrate de importar useRoute
import { useUserStore } from "~/stores/users";
import { useBreadcrumbStore } from "~/stores/breadCrumb";

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const userStore = useUserStore();
const breadcrumbStore = useBreadcrumbStore();

// Estado
const loading = ref(true);
const user = ref(null);

// Métodos
const getRoleBadgeClass = (roleName) => {
  switch (roleName) {
    case "super-admin":
      return "bg-blue-100 text-blue-800";
    case "Administrador Global":
      return "bg-yellow-100 text-yellow-800";
    case "Editor":
      return "bg-green-100 text-green-800";
    case "Visor":
      return "bg-gray-200 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const translateRole = (roleName) => {
  const roles = {
    "super-admin": "Super Administrador",
  };  
  return roles[roleName] || roleName;
};

const formatDate = (date) => {
  if (!date) return 'N/A'; 
  return new Date(date).toLocaleString('es-ES');
};

// Cargar datos
onMounted(async () => {
  try {
    user.value = await userStore.fetchUserById(route.params.id);
    if (user.value) {
      // Registrar nombre para el breadcrumb
      breadcrumbStore.setNameForPath({
        path: route.path,
        name: `${user.value.first_name} ${user.value.last_name}`,
      });
    } else {
      console.warn(`Usuario con ID ${route.params.id} no encontrado.`);
    }
  } catch (error) {
    console.error("Error al cargar usuario:", error);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  breadcrumbStore.clearNameForPath(route.path);
});
</script>
