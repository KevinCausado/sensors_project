<template>
  <div>
    <PageHeader 
      title="Detalles de la Organización" 
      :subtitle="organization?.name">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink 
            to="/organizations"
            class="btn btn-secondary">
            Volver
          </NuxtLink>
          <!-- <PermissionGuard moduleId="organizations" permission="editar">
            <NuxtLink 
              :to="`/organizations/${route.params.id}/edit`"
              class="btn btn-primary">
              Editar Organización
            </NuxtLink>
          </PermissionGuard> -->
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="!organization" class="text-center py-8 text-gray-500">
      Organización no encontrada
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatCard 
          title="Total Usuarios" 
          :value="organization.userCount" 
          icon="user" 
          color="primary" />
        
        <StatCard 
          title="Total Sensores" 
          :value="organization.sensorCount" 
          icon="sensor" 
          color="success" />
        
        <StatCard 
          title="Alertas Activas" 
          :value="activeAlerts" 
          icon="alert" 
          color="warning" />
      </div>

      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Información General</h2>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-500">Nombre</label>
            <p class="mt-1 text-sm text-gray-900">{{ organization.name }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Dirección</label>
            <p class="mt-1 text-sm text-gray-900">{{ organization.address || 'No especificada' }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Correo de Contacto</label>
            <p class="mt-1 text-sm text-gray-900">{{ organization.contactEmail }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Teléfono de Contacto</label>
            <p class="mt-1 text-sm text-gray-900">{{ organization.contactPhone || 'No especificado' }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-500">Fecha de Creación</label>
            <p class="mt-1 text-sm text-gray-900">{{ formatDate(organization.createdAt) }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Lista de Usuarios -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-medium text-gray-900">Usuarios</h2>
            <PermissionGuard moduleId="users" permission="crear">
              <NuxtLink 
                to="/users/new"
                class="btn btn-primary btn-sm">
                Nuevo Usuario
              </NuxtLink>
            </PermissionGuard>
          </div>

          <div class="space-y-4">
            <div v-for="user in organization.Users" 
                 :key="user.id"
                 class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center">
                <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                  {{ getUserInitials(user) }}
                </div>
                <div class="ml-4">
                  <p class="text-sm font-medium text-gray-900">
                    {{ user.firstName }} {{ user.lastName }}
                  </p>
                  <p class="text-sm text-gray-500">{{ user.email }}</p>
                </div>
              </div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getRoleBadgeClass(user.role)">
                {{ translateRole(user.role) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Lista de Sensores -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-medium text-gray-900">Sensores</h2>
            <PermissionGuard moduleId="sensors" permission="crear">
              <NuxtLink 
                to="/sensors/new"
                class="btn btn-primary btn-sm">
                Nuevo Sensor
              </NuxtLink>
            </PermissionGuard>
          </div>

          <div class="space-y-4">
            <div v-for="sensor in organization.Sensors" 
                 :key="sensor.id"
                 class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center">
                <div class="h-10 w-10 rounded-full bg-success-100 flex items-center justify-center text-success-700">
                  {{ sensor.name.substring(0, 2).toUpperCase() }}
                </div>
                <div class="ml-4">
                  <p class="text-sm font-medium text-gray-900">{{ sensor.name }}</p>
                  <p class="text-sm text-gray-500">{{ sensor.location }}</p>
                </div>
              </div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getStatusBadgeClass(sensor.status)">
                {{ translateStatus(sensor.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useOrganizationStore } from '~/stores/organizations';
import { useAlertStore } from '~/stores/alerts';

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const organizationStore = useOrganizationStore();
const alertStore = useAlertStore();

// Estado
const loading = ref(true);
const organization = ref(null);

// Computed
const activeAlerts = computed(() => {
  if (!organization.value?.Sensors) return 0;
  const sensorIds = organization.value.Sensors.map(s => s.id);
  return alertStore.alerts.filter(a => 
    sensorIds.includes(a.sensorId) && a.status === 'active'
  ).length;
});

// Métodos
const getUserInitials = (user) => {
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
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'active':
      return 'bg-success-100 text-success-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'maintenance':
      return 'bg-warning-100 text-warning-800';
    case 'error':
      return 'bg-error-100 text-error-800';
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

const translateStatus = (status) => {
  const statuses = {
    'active': 'Activo',
    'inactive': 'Inactivo',
    'maintenance': 'Mantenimiento',
    'error': 'Error'
  };
  return statuses[status] || status;
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('es-ES');
};

// Cargar datos
onMounted(async () => {
  try {
    organization.value = await organizationStore.organizations.find(o => o.id === route.params.id);
    if (!organization.value) {
      throw new Error('Organización no encontrada');
    }
  } catch (error) {
    console.error('Error al cargar organización:', error);
  } finally {
    loading.value = false;
  }
});
</script>