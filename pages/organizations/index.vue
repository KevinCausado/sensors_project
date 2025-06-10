<template>
  <div>
    <PageHeader 
      title="Organizaciones" 
      subtitle="Gestionar organizaciones del sistema">
      <template #actions>
        <PermissionGuard moduleId="organization" permission="crear">
          <NuxtLink 
            to="/organizations/new"
            class="btn btn-primary flex items-center">
            <PlusIcon class="h-5 w-5 mr-2" />
            Nueva Organización
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
            placeholder="Buscar organizaciones..."
          />
          <SearchIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <!-- Nuevo Selector: Filtrar por Estado -->
        <div class="w-full sm:w-64">
          <label for="status-filter" class="sr-only">Filtrar por Estado</label>
          <select
            id="status-filter"
            v-model="selectedStatus"
            class="form-select"
          >
            <option :value="null">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organización
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dirección
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ubicación Geográfica
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Creación
              </th>
              <th class="px-6 py-3 bg-gray-50"></th>
            </tr>
          </thead>
         <tbody class="bg-white divide-y divide-gray-200">
    <tr v-if="organizationStore.isLoading">
        <td colspan="7" class="px-6 py-4 text-center text-gray-500">Cargando organizaciones...</td> 
    </tr>
    <tr v-else-if="organizationStore.error">
        <td colspan="7" class="px-6 py-4 text-center text-error-600">Error: {{ organizationStore.error }}</td>
    </tr>
    <tr v-else-if="paginatedOrganizations.length === 0"> <!-- Usar paginatedOrganizations aquí -->
        <td colspan="7" class="px-6 py-4 text-center text-gray-500">No se encontraron organizaciones.</td> 
    </tr>
    
    <tr v-else v-for="org in paginatedOrganizations" :key="org.id" class="hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
         <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700"> 
            {{ getOrgInitials(org.name) }}
          </div>
          <div class="ml-4">
            <div class="text-sm font-medium text-gray-900">{{ org.name }}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">{{ org.contact_email }}</div>
        <div class="text-sm text-gray-500">{{ org.phone_number }}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {{ org.address }}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <template v-if="org.city">{{ org.city }}</template>
        <template v-if="org.state">
          <span v-if="org.city">, </span>{{ org.state }}
        </template>
        <template v-if="org.country">
          <span v-if="org.city || org.state">, </span>{{ org.country }}
        </template>
        <span v-if="!org.city && !org.state && !org.country">N/A</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', getOrganizationStatusClass(org.is_active)]">
          {{ translateOrganizationStatus(org.is_active) }}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {{ formatDate(org.created_at) }}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div class="flex justify-end space-x-1">
          <PermissionGuard moduleId="organization" permission="ver">
            <ActionButton
              icon="eye" 
              tooltip="Ver detalles" 
              color="primary" 
              @click="router.push(`/Organizations/${org.id}`)" /> 
          </PermissionGuard>
    
          <PermissionGuard moduleId="organization" permission="editar">
            <ActionButton 
              icon="pencil" 
              tooltip="Editar organización" 
              color="warning" 
              @click="router.push(`/Organizations/${org.id}/edit`)" /> 
          </PermissionGuard>
      
          <PermissionGuard moduleId="organization" permission="eliminar">
            <ActionButton 
              icon="trash" 
              tooltip="Eliminar organización" 
              color="error" 
              @click="showDeleteConfirm(org)" /> 
          </PermissionGuard>
        </div>
      </td>
    </tr>
</tbody>
        </table>
      </div>

      <div class="mt-4">
        <Pagination 
          :total-items="totalFilteredOrganizations" 
          :current-page="currentPage"
          :items-per-page="itemsPerPage"
          @page-change="handlePageChange" />
      </div>
    </div>

    <ConfirmModal
      v-if="showDeleteModal"
      title="Eliminar Organización"
      :message="`¿Estás seguro que deseas eliminar la organización '${orgToDelete?.name}'? Esta acción no se puede deshacer.`"
      @confirm="confirmDelete"
      @cancel="cancelDelete" 
      :is-loading="deleting"
      :error-message="organizationStore.error"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue';
import { useOrganizationStore } from '~/stores/organizations';
import { useRouter } from 'vue-router'; // Importar useRouter

// Componentes
import PageHeader from '~/components/PageHeader.vue';
import ActionButton from '~/components/ActionButton.vue'; 
import Pagination from '~/components/Pagination.vue';     
import ConfirmModal from '~/components/ConfirmModal.vue'; 
import PermissionGuard from '~/components/PermissionGuard.vue';

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
  // middleware: ['auth'],
  permission: 'organizations.ver',
});

const organizationStore = useOrganizationStore();
const router = useRouter();

// Estado
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10); // Añadido para la paginación
const showDeleteModal = ref(false);
const orgToDelete = ref(null);
const deleting = ref(false); // Estado para la carga de eliminación

// Nuevo ref para el filtro de estado
const selectedStatus = ref(null); // null para "Todos", 'active' para Activo, 'inactive' para Inactivo

// Computed
const organizations = computed(() => organizationStore.organizations);

const filteredOrganizations = computed(() => {
  let result = [...organizations.value];
  
  // Filtrado por búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(org => 
      org.name.toLowerCase().includes(query) ||
      (org.address && org.address.toLowerCase().includes(query)) ||
      (org.contact_email && org.contact_email.toLowerCase().includes(query)) ||
      (org.city && org.city.toLowerCase().includes(query)) ||
      (org.state && org.state.toLowerCase().includes(query)) ||
      (org.country && org.country.toLowerCase().includes(query))
    );
  }

  // Filtrado por estado (is_active)
  if (selectedStatus.value !== null) {
    result = result.filter(org => {
      if (selectedStatus.value === 'active') {
        return org.is_active === true;
      } else if (selectedStatus.value === 'inactive') {
        return org.is_active === false;
      }
      return true; // Si selectedStatus.value es null, no aplica este filtro
    });
  }

  return result;
});

const totalFilteredOrganizations = computed(() => filteredOrganizations.value.length);
const totalPages = computed(() => Math.ceil(totalFilteredOrganizations.value / itemsPerPage.value)); // Añadido para paginación

const paginatedOrganizations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredOrganizations.value.slice(start, end);
});


// Métodos
const getOrgInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-ES');
};
const handlePageChange = (page) => {
  currentPage.value = page;
};
const showDeleteConfirm = (org) => {
  orgToDelete.value = org;
  showDeleteModal.value = true;
};
const confirmDelete = async () => {
  deleting.value = true; // Activar estado de carga
  organizationStore.error = null; // Limpiar errores previos
  try {
    await organizationStore.deleteOrganization(orgToDelete.value.id);
    showDeleteModal.value = false;
    orgToDelete.value = null;
  } catch (error) {
    console.error('Error al eliminar organización:', error);
    organizationStore.error = error.message; // Establecer el error en el store para el modal
  } finally {
    deleting.value = false; // Desactivar estado de carga
  }
};
const cancelDelete = () => {
  showDeleteModal.value = false;
  orgToDelete.value = null;
  organizationStore.error = null; // Limpiar error al cancelar
};

// Function to get the badge class based on is_active status
const getOrganizationStatusClass = (isActive) => {
  return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

// Function to translate the boolean status to a display string
const translateOrganizationStatus = (isActive) => {
  return isActive ? 'Activo' : 'Inactivo';
};

// Cargar datos
onMounted(async () => {
  await organizationStore.fetchOrganizations();
});
</script>

<style scoped>
/* Estilos para badges */
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.bg-green-100 { background-color: #D1FAE5; }
.text-green-800 { color: #065F46; }
.bg-red-100 { background-color: #FEE2E2; }
.text-red-800 { color: #991B1B; }

/* Estilos de tabla y formulario */
.card {
  @apply bg-white shadow rounded-lg p-6;
}
.form-input {
  @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
}
.form-select {
  @apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2;
}
.btn {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors;
}
.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700;
}
.btn-secondary {
  @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
}
</style>
