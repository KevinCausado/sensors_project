<template>
  <div>
    <PageHeader
      title="Parámetros"
      subtitle="Gestionar parámetros del sistema"
    >
      <template #actions>
        <PermissionGuard moduleId="parameters" permission="crear">
          <NuxtLink
            to="/parameters/new"
            class="btn btn-primary flex items-center"
          >
            <PlusIcon class="h-5 w-5 mr-2" />
            Nuevo Parámetro
          </NuxtLink>
        </PermissionGuard>
      </template>
    </PageHeader>

    <div class="card">
      <div
        class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between"
      >
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            class="form-input pl-9"
            placeholder="Buscar parámetros..."
          />
          <SearchIcon class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <div class="flex gap-2">
          <select v-model="filterCategory" class="form-input py-2 text-sm">
            <option value="">Todas las Categorías</option>
            <option value="system">Sistema</option>
            <option value="sensors">Sensores</option>
            <option value="alerts">Alertas</option>
            <option value="units">Unidades</option>
          </select>

          <select v-model="filterType" class="form-input py-2 text-sm">
            <option value="">Todos los Tipos</option>
            <option value="number">Número</option>
            <option value="text">Texto</option>
            <option value="boolean">Booleano</option>
          </select>
        </div>
      </div>

      <div v-if="parameterStore.isLoading" class="text-center py-8">
        <span class="loading loading-spinner text-primary"></span>
        <p class="text-gray-500 mt-2">Cargando parámetros...</p>
      </div>

      <div v-else-if="parameterStore.error" class="text-center py-8 text-error">
        <p>Error al cargar parámetros: {{ parameterStore.error }}</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th
                class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Nombre
              </th>
              <th
                class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Clave
              </th>
              <th
                class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Valor
              </th>
              <th
                class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Categoría
              </th>
              <th
                class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Última Actualización
              </th>
              <th class="px-6 py-3 bg-gray-50"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="param in paginatedParameters" :key="param.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ param.name }}</div>
                <div class="text-sm text-gray-500">{{ param.description }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ param.key }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ param.value }}
                  <span v-if="param.unit" class="text-gray-500">{{ param.unit }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                  :class="getCategoryBadgeClass(param.category)"
                >
                  {{ translateCategory(param.category) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(param.updated_at || param.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-1">
                  <PermissionGuard moduleId="parameters" permission="ver">
                    <ActionButton
                      icon="eye"
                      tooltip="Ver detalles"
                      color="primary"
                      @click="router.push(`/Parameters/${param.id}`)"
                    />
                  </PermissionGuard>

                  <PermissionGuard moduleId="parameters" permission="editar">
                    <ActionButton
                      icon="pencil"
                      tooltip="Editar parámetro"
                      color="warning"
                      @click="router.push(`/parameters/${param.id}/edit`)"
                    />
                  </PermissionGuard>

                  <PermissionGuard moduleId="parameters" permission="eliminar">
                    <ActionButton
                      icon="trash"
                      tooltip="Eliminar parámetro"
                      color="error"
                      @click="showDeleteConfirm(param)"
                    />
                  </PermissionGuard>
                </div>
              </td>
            </tr>
            <tr v-if="!paginatedParameters.length && !parameterStore.isLoading">
              <td colspan="6" class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                No se encontraron parámetros.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalFilteredParameters > itemsPerPage" class="mt-4">
        <Pagination
          :total-items="totalFilteredParameters"
          :current-page="currentPage"
          @page-change="handlePageChange"
        />
      </div>
    </div>
    <ConfirmModal
      v-if="showDeleteModal"
      title="Eliminar Parámetro"
      :message="`¿Estás seguro que deseas eliminar el parámetro '${paramToDelete?.key}'? Esta acción no se puede deshacer.`"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useParameterStore } from '~/stores/parameters';
import {
  PlusIcon,
  MagnifyingGlassIcon as SearchIcon,
  // ... otros íconos que uses como PencilIcon, TrashIcon
} from '@heroicons/vue/24/outline';
// Asegúrate de que estas rutas son correctas
// import ActionButton from '~/components/shared/ActionButton.vue';
// import ConfirmModal from '~/components/shared/ConfirmModal.vue';
// import Pagination from '~/components/shared/Pagination.vue';
// import PageHeader from '~/components/shared/PageHeader.vue';
// import PermissionGuard from '~/components/shared/PermissionGuard.vue';


definePageMeta({
  // middleware: ['auth'],
  permission: 'parameters.ver',
});

const parameterStore = useParameterStore();
const router = useRouter();

// Estado
const searchQuery = ref('');
const filterCategory = ref('');
const filterType = ref('');
const currentPage = ref(1);
const itemsPerPage = 10; // Define el número de items por página
const showDeleteModal = ref(false);
const paramToDelete = ref(null);

// Computed
const parameters = computed(() => parameterStore.parameters);

const filteredParameters = computed(() => {
  let result = [...parameters.value];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(param =>
      // Cambiar param.name a param.key aquí también
      param.key.toLowerCase().includes(query) ||
      param.description.toLowerCase().includes(query) ||
      param.value.toLowerCase().includes(query) // Asegúrate de buscar también en el valor
    );
  }

  if (filterCategory.value) {
    result = result.filter((param) => param.category === filterCategory.value);
  }

  if (filterType.value) {
    result = result.filter((param) => param.type === filterType.value);
  }

  return result;
});

const totalFilteredParameters = computed(() => filteredParameters.value.length);

// Paginación
const paginatedParameters = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredParameters.value.slice(start, end);
});

// Métodos
const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'system':
      return 'bg-primary-100 text-primary-800';
    case 'sensors':
      return 'bg-secondary-100 text-secondary-800';
    case 'alerts':
      return 'bg-warning-100 text-warning-800';
    case 'units': // Añadido para la categoría 'units'
      return 'bg-info-100 text-info-800'; // Puedes elegir un color adecuado
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const translateCategory = (category) => {
  const categories = {
    system: 'Sistema',
    sensors: 'Sensores',
    alerts: 'Alertas',
    units: 'Unidades', // Añadido para la categoría 'units'
  };
  return categories[category] || category;
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  // Usar 'updated_at' si existe, si no, 'created_at' como fallback
  // Asegúrate de que los nombres de las columnas coincidan con tu DB
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const handlePageChange = (page) => {
  currentPage.value = page;
};

const showDeleteConfirm = (param) => {
  paramToDelete.value = param;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  try {
    await parameterStore.deleteParameter(paramToDelete.value.id);
    showDeleteModal.value = false;
    paramToDelete.value = null;
    // Recargar los parámetros después de la eliminación
    await parameterStore.fetchParameters();
  } catch (error) {
    console.error('Error al eliminar parámetro:', error);
    // Considera usar un toast para mostrar el error al usuario
  }
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  paramToDelete.value = null;
};

// Cargar datos
onMounted(async () => {
  await parameterStore.fetchParameters();
});

// Watch para resetear la página cuando cambian los filtros
watch([searchQuery, filterCategory, filterType], () => {
  currentPage.value = 1;
});
</script>