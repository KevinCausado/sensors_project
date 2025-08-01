<template>
  <div>
    <PageHeader 
      title="Detalles del Parámetro" 
      :subtitle="parameter?.name">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink 
            to="/parameters"
            class="btn btn-secondary">
            Volver
          </NuxtLink>          
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="!parameter" class="text-center py-8 text-gray-500">
      Parámetro no encontrado
    </div>

    <div v-else class="max-w-3xl mx-auto space-y-6">
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Información del Parámetro</h2>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-500">Nombre</label>
            <p class="mt-1 text-sm text-gray-900">{{ parameter.name }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Clave</label>
            <p class="mt-1 text-sm text-gray-900">{{ parameter.key }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Tipo</label>
            <p class="mt-1 text-sm text-gray-900">{{ translateType(parameter.type) }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Categoría</label>
            <span class="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getCategoryBadgeClass(parameter.category)">
              {{ translateCategory(parameter.category) }}
            </span>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Valor</label>
            <p class="mt-1 text-sm text-gray-900">
              {{ parameter.value }}
              <span v-if="parameter.unit" class="text-gray-500">{{ parameter.unit }}</span>
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Última Actualización</label>
            <p class="mt-1 text-sm text-gray-900">
              {{ formatDate(parameter.updated_at) }}
            </p>
          </div>
        </div>

        <div class="mt-6">
          <label class="block text-sm font-medium text-gray-500">Descripción</label>
          <p class="mt-1 text-sm text-gray-900">{{ parameter.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useParameterStore } from '~/stores/parameters';
import { useBreadcrumbStore } from '~/stores/breadCrumb';

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const parameterStore = useParameterStore();
const breadcrumbStore = useBreadcrumbStore();

// Estado
const loading = ref(true);
const parameter = ref(null);

// Métodos
const translateType = (type) => {
  const types = {
    'text': 'Texto',
    'number': 'Número',
    'boolean': 'Booleano'
  };
  return types[type] || type;
};

const translateCategory = (category) => {
  const categories = {
    'system': 'Sistema',
    'sensors': 'Sensores',
    'alerts': 'Alertas',
    'units': 'Unidades'
  };
  return categories[category] || category;
};

const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'system':
      return 'bg-primary-100 text-primary-800';
    case 'sensors':
      return 'bg-secondary-100 text-secondary-800';
    case 'alerts':
      return 'bg-warning-100 text-warning-800';
    case 'units':
      return 'bg-success-100 text-success-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (date) => {  
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('es-ES');
};

// Cargar datos
onMounted(async () => {
  try {
    parameter.value = await parameterStore.fetchParameterById(route.params.id);
    if (parameter.value) {
      breadcrumbStore.setNameForPath({
        path: route.path,
        name: parameter.value.name,
      });
    }
  } catch (error) {
    console.error('Error al cargar parámetro:', error);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  breadcrumbStore.clearNameForPath(route.path);
});
</script>