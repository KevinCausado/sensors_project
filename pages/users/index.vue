<template>
  <div>
        <PageHeader
      title="Usuarios"
      subtitle="Gestionar usuarios del sistema">
      <template #actions>        
        <PermissionGuard moduleId="users" permission="crear">
          <NuxtLink
            to="/users/new"
            class="btn btn-primary flex items-center">
            <PlusIcon class="h-5 w-5 mr-2" />
            Nuevo Usuario
          </NuxtLink>
        </PermissionGuard>
      </template>
    </PageHeader>

    <div class="card">
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            class="form-input pl-9"
            placeholder="Buscar usuarios..."
          />
          <SearchIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <div class="flex gap-2">
          <select v-model="filterRole" class="form-select">
            <option value="">Todos los Roles</option>
            <option value="super-admin">Super Administrador</option>
            <option value="Administrador Global">Administrador Global</option>
            <option value="Editor">Editor</option>
            <option value="Visor">Visor</option>
          </select>

          <select v-model="filterOrg" class="form-select">
            <option value="">Todas las Organizaciones</option>
            <option v-for="org in organizations" :key="org.id" :value="org.id">
              {{ org.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 table-fixed">
          <thead>
            <tr>
              <th class="w-4/12 px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th class="w-2/12 px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th class="w-2/12 px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organización
              </th>
              <th class="w-2/12 px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último Acceso
              </th>
              <th class="w-2/12 px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="userStore.loading">
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">Cargando usuarios...</td>
            </tr>
            <tr v-else-if="userStore.error">
                <td colspan="5" class="px-6 py-4 text-center text-error-600">Error: {{ userStore.error }}</td>
            </tr>
            <tr v-else-if="filteredUsers.length === 0">
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">No se encontraron usuarios.</td>
            </tr>

            <tr v-else v-for="user in filteredUsers" :key="user.auth_id">
              <td class="px-6 py-4 whitespace-nowrap overflow-hidden">
                <div class="flex items-center">
                  <div class="h-10 w-10 rounded-full bg-primary-100 flex-shrink-0 flex items-center justify-center text-primary-700">
                    {{ getUserInitials(user) }}
                  </div>
                  <div class="ml-4 overflow-hidden">
                    <div class="text-sm font-medium text-gray-900 truncate">
                      {{ user.first_name }} {{ user.last_name }}
                    </div>
                    <div class="text-sm text-gray-500 truncate">
                      {{ user.email }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      :class="getRoleBadgeClass(user.role_name)">
                  {{ translateRole(user.role_name) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center truncate">
                {{ user.organization_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                {{ formatDate(user.last_login) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-1">
                  <PermissionGuard moduleId="users" permission="ver">
                    <ActionButton
                      icon="eye"
                      title="Ver detalles"
                      color="primary"
                      @click="router.push(`/users/${user.user_profile_id || user.auth_id}`)" />
                  </PermissionGuard>
                  <PermissionGuard moduleId="users" permission="editar">
                    <ActionButton
                      icon="pencil"
                      title="Editar usuario"
                      color="warning"
                      @click="router.push(`/users/${user.user_profile_id || user.auth_id}/edit`)" />
                  </PermissionGuard>
                  <PermissionGuard moduleId="users" permission="eliminar">
                    <ActionButton
                      icon="trash"
                      title="Eliminar usuario"
                      color="error"
                      @click="showDeleteConfirm(user)" />
                  </PermissionGuard>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4">
        <Pagination
          :total-items="totalFilteredUsers"
          :current-page="currentPage"
          @page-change="handlePageChange" />
      </div>
    </div>

    <ConfirmModal
      v-if="showDeleteModal"
      title="Eliminar Usuario"
      :message="`¿Estás seguro que deseas eliminar al usuario '${userToDelete?.first_name} ${userToDelete?.last_name}'? Esta acción no se puede deshacer.`" @confirm="confirmDelete"
      @cancel="cancelDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue';
import { useUserStore } from '~/stores/users';
import { useOrganizationStore } from '~/stores/organizations';
import { useRouter } from 'vue-router';


// Iconos (placeholders)
const PlusIcon = defineComponent({
  render: () => h('svg', { class: 'h-5 w-5', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    h('path', { d: 'M12 4a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 12 4z' })
  ])
});

const SearchIcon = defineComponent({
  render: () => h('svg', { class: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    h('path', { d: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-8 8a10 10 0 1 1 17.32 5.92l4.68 4.68a1 1 0 0 1-1.42 1.42l-4.68-4.68A10 10 0 0 1 2 10z' })
  ])
});


definePageMeta({
  // middleware: ['auth']
});

const userStore = useUserStore();
const organizationStore = useOrganizationStore();
const router = useRouter();

// Estado
const searchQuery = ref('');
const filterRole = ref('');
const filterOrg = ref('');
const currentPage = ref(1);
const showDeleteModal = ref(false);
const userToDelete = ref(null);

// Computed
const users = computed(() => userStore.users);
const organizations = computed(() => organizationStore.organizations);

const filteredUsers = computed(() => {
  let result = [...users.value];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(user =>
      (user.first_name && user.first_name.toLowerCase().includes(query)) ||
      (user.last_name && user.last_name.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query))
    );
  }

  if (filterRole.value) {
    result = result.filter(user => user.role_name === filterRole.value);
  }

  if (filterOrg.value) {
    result = result.filter(user => user.organization_id === filterOrg.value);
  }

  return result;
});

const totalFilteredUsers = computed(() => filteredUsers.value.length);

// Métodos
const getUserInitials = (user) => {
  const first = user.first_name ? user.first_name.charAt(0) : '';
  const last = user.last_name ? user.last_name.charAt(0) : '';
  return `${first}${last}`;
};

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

const handlePageChange = (page) => {
  currentPage.value = page;
};

const showDeleteConfirm = (user) => {
  userToDelete.value = user;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  try {

    const idToDelete = userToDelete.value.user_profile_id || userToDelete.value.auth_id;

    await userStore.deleteUser(idToDelete);
    showDeleteModal.value = false;
    userToDelete.value = null;
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
  }
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  userToDelete.value = null;
};

// Cargar datos
onMounted(async () => {
  await Promise.all([
    userStore.fetchUsers(),
    organizationStore.fetchOrganizations()
  ]);
});
</script>


<style scoped>
.card {
  @apply bg-white shadow rounded-lg p-6;
}
.form-input {
  @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
}
.btn {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors;
}
.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700;
}
.text-error-600 {
  @apply text-red-600;
}

/* Estilo estandarizado para los selects */
.form-select {
  @apply block pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
}
</style>
