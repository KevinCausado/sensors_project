<template>
  <div>
    <PageHeader 
      title="Usuarios" 
      subtitle="Gestionar usuarios del sistema">
      <template #actions>
        <NuxtLink 
          to="/users/new"
          class="btn btn-primary flex items-center">
          <PlusIcon class="h-5 w-5 mr-2" />
          Nuevo Usuario
        </NuxtLink>
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
          <select v-model="filterRole" class="form-input py-2 text-sm">
            <option value="">Todos los Roles</option>
            <option value="super-admin">Super Admin</option>
            <option value="admin">Administrador</option>
            <option value="technician">Técnico</option>
            <option value="viewer">Visualizador</option>
          </select>
          
          <select v-model="filterOrg" class="form-input py-2 text-sm">
            <option value="">Todas las Organizaciones</option>
            <option v-for="org in organizations" :key="org.id" :value="org.id">
              {{ org.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organización
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último Acceso
              </th>
              <th class="px-6 py-3 bg-gray-50"></th>
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
            
            <tr v-else v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                    {{ getUserInitials(user) }}
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ user.firstName }} {{ user.lastName }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ user.email }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      :class="getRoleBadgeClass(user.role)">
                  {{ translateRole(user.role) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ user.organizationName }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.lastLogin) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-1">
                  <PermissionGuard moduleId="users" permission="ver">
                    <ActionButton
                      icon="eye"
                      tooltip="Ver detalles"
                      color="primary"
                      @click="router.push(`/users/${user.id}`)" />
                  </PermissionGuard>
                  
                  <PermissionGuard moduleId="users" permission="editar">
                    <ActionButton
                      icon="pencil"
                      tooltip="Editar usuario"
                      color="warning"
                      @click="router.push(`/users/${user.id}/edit`)" />
                  </PermissionGuard>
                  
                  <PermissionGuard moduleId="users" permission="eliminar">
                    <ActionButton
                      icon="trash"
                      tooltip="Eliminar usuario"
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
      :message="`¿Estás seguro que deseas eliminar al usuario '${userToDelete?.firstName} ${userToDelete?.lastName}'? Esta acción no se puede deshacer.`"
      @confirm="confirmDelete"
      @cancel="cancelDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue'; // Importar h
import { useUserStore } from '~/stores/users';
import { useOrganizationStore } from '~/stores/organizations';

// Icons (placeholders)
const PlusIcon = defineComponent({
  render: () => h('div', { class: 'i-heroicons-plus' }) // Ejemplo de icono
});
const SearchIcon = defineComponent({
  render: () => h('div', { class: 'i-heroicons-magnifying-glass' }) // Ejemplo de icono
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
      user.firstName.toLowerCase().includes(query) ||
      user.lastName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  }
  
  if (filterRole.value) {
    result = result.filter(user => user.role === filterRole.value);
  }
  
  if (filterOrg.value) {
    result = result.filter(user => user.organizationId === filterOrg.value);
  }
  
  return result;
});

const totalFilteredUsers = computed(() => filteredUsers.value.length);

// Métodos
const getUserInitials = (user) => {
  if (!user.firstName || !user.lastName) return ''; // Manejar caso si faltan nombres
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
};

const getRoleBadgeClass = (role) => {
  switch (role) {
    case 'super-admin':
      return 'bg-primary-100 text-primary-800';
    case 'admin':
      return 'bg-secondary-100 text-secondary-800';
    case 'technician':
      return 'bg-warning-100 text-warning-800';
    default: // Para 'viewer' u otros roles no especificados
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
  // return new Date(date).toLocaleString('es-ES'); // Esto incluye hora
  return new Date(date).toLocaleDateString('es-ES'); // Esto solo la fecha
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
    await userStore.deleteUser(userToDelete.value.id);
    showDeleteModal.value = false;
    userToDelete.value = null;
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    // Considera añadir una notificación al usuario aquí
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