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
            
            <tr v-else v-for="user in filteredUsers" :key="user.auth_id"> <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                    {{ getUserInitials(user) }}
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ user.first_name }} {{ user.last_name }} </div>
                    <div class="text-sm text-gray-500">
                      {{ user.email }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      :class="getRoleBadgeClass(user.role_name)"> {{ translateRole(user.role_name) }} </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ user.organization_name }} </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.last_login) }} </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-1">
                  <PermissionGuard moduleId="users" permission="ver">
                    <ActionButton
                      icon="eye"
                      tooltip="Ver detalles"
                      color="primary"
                      @click="router.push(`/users/${user.user_profile_id || user.auth_id}`)" /> </PermissionGuard>
                  
                  <PermissionGuard moduleId="users" permission="editar">
                    <ActionButton
                      icon="pencil"
                      tooltip="Editar usuario"
                      color="warning"
                      @click="router.push(`/users/${user.user_profile_id || user.auth_id}/edit`)" /> </PermissionGuard>
                  
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
      :message="`¿Estás seguro que deseas eliminar al usuario '${userToDelete?.first_name} ${userToDelete?.last_name}'? Esta acción no se puede deshacer.`" @confirm="confirmDelete"
      @cancel="cancelDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue';
import { useUserStore } from '~/stores/users';
import { useOrganizationStore } from '~/stores/organizations';
import { useRouter } from 'vue-router'; // Importar useRouter si no está ya

// Icons (placeholders) - Asegúrate de que estos imports coincidan con tus librerías de iconos reales
// Si usas Heroicons, importarías directamente:
import { PlusIcon, MagnifyingGlassIcon as SearchIcon } from '@heroicons/vue/24/outline';
// Si usas otra forma (como tus defineComponent h), mantén eso:
/*
const PlusIcon = defineComponent({ render: () => h('div', { class: 'i-heroicons-plus' }) });
const SearchIcon = defineComponent({ render: () => h('div', { class: 'i-heroicons-magnifying-glass' }) });
*/

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
      (user.first_name && user.first_name.toLowerCase().includes(query)) || // Usar first_name
      (user.last_name && user.last_name.toLowerCase().includes(query)) ||   // Usar last_name
      (user.email && user.email.toLowerCase().includes(query))
    );
  }
  
  if (filterRole.value) {
    result = result.filter(user => user.role_name === filterRole.value); // CAMBIADO A user.role_name
  }
  
  if (filterOrg.value) {
    result = result.filter(user => user.organization_id === filterOrg.value); // Usar organization_id
  }
  
  return result;
});

const totalFilteredUsers = computed(() => filteredUsers.value.length);

// Métodos
const getUserInitials = (user) => {
  // Asegúrate de que first_name y last_name no sean null/undefined antes de acceder a charAt
  const first = user.first_name ? user.first_name.charAt(0) : '';
  const last = user.last_name ? user.last_name.charAt(0) : '';
  return `${first}${last}`;
};

const getRoleBadgeClass = (roleName) => { // Recibe roleName
  switch (roleName) { // Usar roleName
    case 'super-admin':
      return 'bg-primary-100 text-primary-800';
    case 'admin':
      return 'bg-secondary-100 text-secondary-800';
    case 'technician':
      return 'bg-warning-100 text-warning-800';
    case 'viewer':
      return 'bg-info-100 text-info-800'; // Añadido para viewer si no lo tenías antes
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const translateRole = (roleName) => { // Recibe roleName
  const roles = {
    'super-admin': 'Super Administrador',
    'admin': 'Administrador',
    'technician': 'Técnico',
    'viewer': 'Visualizador'
  };
  return roles[roleName] || roleName; // Usar roleName
};

// ***** FUNCIÓN FORMATDATE ACTUALIZADA *****
const formatDate = (date) => {
  if (!date) return 'N/A'; // Agrega esta comprobación para evitar errores si la fecha es nula/undefined
  return new Date(date).toLocaleString('es-ES');
};
// *****************************************

const handlePageChange = (page) => {
  currentPage.value = page;
};

const showDeleteConfirm = (user) => {
  userToDelete.value = user;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  try {
    // Si tienes un user_profile_id, elimina de public.users
    // Si no, considera qué quieres eliminar (solo el auth.users o ambos)
    // Para esta función de borrar en el store, asumo que borra el perfil y luego el auth.user (si es un cascade)
    // o que el deleteUser del store ya maneja la lógica compleja.
    // Por simplicidad, si userToDelete.value.user_profile_id existe, lo usamos, sino usamos auth_id
    const idToDelete = userToDelete.value.user_profile_id || userToDelete.value.auth_id;
    
    await userStore.deleteUser(idToDelete); // Asegúrate que deleteUser en el store maneje el ID correcto
    showDeleteModal.value = false;
    userToDelete.value = null;
    // Opcional: recargar los usuarios para reflejar el cambio inmediatamente
    // userStore.fetchUsers();
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