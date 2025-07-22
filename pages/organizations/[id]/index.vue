<template>
  <div>
    <PageHeader title="Detalles de la Organización" :subtitle="organization?.name">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/organizations" class="btn btn-secondary">Volver</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="!organization" class="text-center py-8 text-gray-500">Organización no encontrada. Verifique el ID o si existen datos.</div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <StatCard title="Total Usuarios" :value="organization.users?.length || 0" icon="user" color="primary" />
        <StatCard title="Total Activos (Assets)" :value="organization.assets_base?.length || 0" icon="asset" color="info" />
        <StatCard title="Total Sensores" :value="organization.sensors?.length || 0" icon="sensor" color="success" />
        <StatCard title="Alertas Activas" :value="organization.alerts?.filter((alert) => alert.status !== 'resolved').length || 0" icon="alert" color="warning" />
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Información General</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500">Nombre de la Organización</p>
            <p class="text-gray-900">{{ organization.name }}</p>
          </div>
          <div v-if="organization.description">
            <p class="text-sm font-medium text-gray-500">Descripción</p>
            <p class="text-gray-900">{{ organization.description }}</p>
          </div>
          <div v-if="organization.contact_email">
            <p class="text-sm font-medium text-gray-500">Email de Contacto</p>
            <p class="text-primary-600">{{ organization.contact_email }}</p>
          </div>
          <div v-if="organization.phone_number">
            <p class="text-sm font-medium text-gray-500">Teléfono de Contacto</p>
            <p class="text-gray-900">{{ organization.phone_number  }}</p>
          </div>
          <div class="mb-4">
            <p class="form-label">Ubicación Geográfica (Organización)</p>
            <p class="form-input-static">
              <template v-if="organization.city">{{ organization.city }}</template>
              <template v-if="organization.state">
                <span v-if="organization.city">,</span>
                {{ organization.state }}
              </template>
              <template v-if="organization.country">
                <span v-if="organization.city || organization.state">,</span>
                {{ organization.country }}
              </template>
              <span v-if="!organization.city && !organization.state && !organization.country">N/A</span>
            </p>
          </div>
          <div v-if="organization.address">
            <p class="text-sm font-medium text-gray-500">Dirección</p>
            <p class="text-gray-900">{{ organization.address }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Estado</p>
            <span :class="`badge ${organization.is_active ? 'badge-success' : 'badge-danger'}`">
              {{ organization.is_active ? "Activo" : "Inactivo" }}
            </span>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Creado el</p>
            <p class="text-gray-900">{{ formatDate(organization.created_at) }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Última Actualización</p>
            <p class="text-gray-900">{{ formatDate(organization.updated_at) }}</p>
          </div>
        </div>
      </div>

       <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Usuarios de la Organización ({{ organization.users?.length || 0 }})</h3>
        <div v-if="organization.users && organization.users.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th class="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>                
                <th class="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>               
                <th class="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="user in organization.users" :key="user.id">
                <td class="px-6 py-4 whitespace-nowrap">{{ user.first_name }} {{ user.last_name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center">{{ user.email }}</td>               
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <span :class="`badge ${getRoleBadgeClass(user.roleName)}`">{{ translateRole(user.roleName) }}</span>
                </td>             
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <span :class="`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`">
                    {{ user.is_active ? "Activo" : "Inactivo" }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(user.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center text-gray-500 py-4">No hay usuarios asociados a esta organización.</div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Activos de la Organización ({{ organization.assets_base?.length || 0 }})</h3>
        <div v-if="organization.assets_base && organization.assets_base.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación Geográfica</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="asset in organization.assets_base" :key="asset.id">
                <td class="px-6 py-4 whitespace-nowrap">{{ asset.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ asset.assetTypeName || "N/A" }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ asset.description || "N/A" }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ getAssetLocation(asset) }}</td>
                 <td class="px-6 py-4 whitespace-nowrap">
                 <span :class="`badge ${asset.is_active ? 'badge-success' : 'badge-danger'}`">
                    {{ asset.is_active ? "Activo" : "Inactivo" }}
                  </span>
                </td>              
                <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(asset.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center text-gray-500 py-4">No hay activos asociados a esta organización.</div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Sensores de la Organización ({{ organization.sensors?.length || 0 }})</h3>
        <div v-if="organization.sensors && organization.sensors.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción de Ubicación</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="sensor in organization.sensors" :key="sensor.id">
                <td class="px-6 py-4 whitespace-nowrap">{{ sensor.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ sensor.location_description || "N/A" }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="`badge ${getSensorStatusBadgeClass(sensor.status)}`">
                    {{ translateStatus(sensor.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(sensor.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center text-gray-500 py-4">No hay sensores asociados a esta organización.</div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4">Alertas de la Organización ({{ totalAlerts }})</h3>
        <div v-if="paginatedAlerts && paginatedAlerts.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensaje</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generada el</th>
                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resuelta el</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="alert in paginatedAlerts" :key="alert.id">
                <td class="px-6 py-4 whitespace-nowrap">{{ alert.assetName || "N/A" }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ translateAlertType(alert.type) }}</td>
                <td class="px-6 py-4 text-xs text-gray-600 align-top max-w-xs break-words">
                  {{ alert.description || "N/A" }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="`badge ${getAlertPriorityBadgeClass(alert.priority)}`">
                    {{ translatePriority(alert.priority) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="`badge ${getAlertStatusBadgeClass(alert.status)}`">
                    {{ translateStatus(alert.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(alert.alert_time) }}</td>
                <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(alert.resolved_time) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center text-gray-500 py-4">No hay alertas asociadas a esta organización.</div>
        
        <div class="mt-4" v-if="totalAlerts > alertsPerPage">
          <Pagination
            :total-items="totalAlerts"
            :current-page="currentAlertPage"
            :items-per-page="alertsPerPage"
            @page-change="handleAlertPageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useOrganizationStore } from "~/stores/organizations";
import PageHeader from "~/components/PageHeader.vue";
import StatCard from "~/components/StatCard.vue";
import Pagination from "~/components/Pagination.vue";

const route = useRoute();
const organizationStore = useOrganizationStore();

const loading = ref(true);
const organization = ref(null);

const currentAlertPage = ref(1);
const alertsPerPage = ref(5);

const paginatedAlerts = computed(() => {
  if (!organization.value || !organization.value.alerts) {
    return [];
  }
  const sortedAlerts = [...organization.value.alerts].sort((a, b) => new Date(b.alert_time) - new Date(a.alert_time));
  
  const start = (currentAlertPage.value - 1) * alertsPerPage.value;
  const end = start + alertsPerPage.value;
  return sortedAlerts.slice(start, end);
});

const totalAlerts = computed(() => organization.value?.alerts?.length || 0);

const handleAlertPageChange = (page) => {
  currentAlertPage.value = page;
};

const getRoleBadgeClass = (role) => {
  const roles = { "super-admin": "badge-primary", admin: "badge-info", technician: "badge-warning", viewer: "badge-secondary" };
  return roles[role] || "badge-light";
};

const translateRole = (role) => {
  const roles = { "super-admin": "Super Admin", admin: "Administrador", technician: "Técnico", viewer: "Visualizador" };
  return roles[role] || role;
};

const getSensorStatusBadgeClass = (status) => {
  const statuses = { active: "badge-success", inactive: "badge-danger", maintenance: "badge-warning", error: "badge-error" };
  return statuses[status] || "badge-light";
};

const translateStatus = (status) => {
  const statuses = { active: "Activa", inactive: "Inactivo", maintenance: "Mantenimiento", error: "Error", new: "Nueva", acknowledged: "Reconocida", resolved: "Resuelta" };
  return statuses[status] || status;
};

const translateAlertType = (type) => {
  const types = {
    vibration: 'Vibración',
    temperature: 'Temperatura',
    connectivity: 'Conectividad',
    data_issue: 'Dato Anómalo'
  };
  return types[type] || type;
};

const getAlertPriorityBadgeClass = (priority) => {
  const priorities = { high: "badge-danger", medium: "badge-warning", low: "badge-info" };
  return priorities[priority] || "badge-light";
};

const translatePriority = (priority) => {
  const priorities = { high: "Alta", medium: "Media", low: "Baja" };
  return priorities[priority] || priority;
};

const getAlertStatusBadgeClass = (status) => {
  const statuses = { new: "badge-danger", acknowledged: "badge-warning", resolved: "badge-secondary" };
  return statuses[status] || "badge-success";
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES") + " " + date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};

const getAssetLocation = (asset) => {
  const parts = [];
  if (asset.city) parts.push(asset.city);
  if (asset.state) parts.push(asset.state);
  if (asset.country) parts.push(asset.country);
  return parts.length > 0 ? parts.join(", ") : "N/A";
};

onMounted(async () => {
  const orgId = route.params.id;
  if (orgId) {
    try {
      loading.value = true;
      const fetchedOrg = await organizationStore.fetchOrganizationWithRelations(orgId);
      if (fetchedOrg) {
        organization.value = fetchedOrg;
      } else {
        organization.value = null;
        console.warn("Organización no encontrada para el ID:", orgId);
      }
    } catch (error) {
      console.error("Fallo al cargar los detalles de la organización:", error);
      organization.value = null;
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = false;
    organization.value = null;
    console.warn("No se proporcionó ID de organización en la ruta.");
  }
});
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.badge-success { @apply bg-green-100 text-green-800; }
.badge-danger { @apply bg-red-100 text-red-800; }
.badge-primary { @apply bg-indigo-100 text-indigo-800; }
.badge-info { @apply bg-blue-100 text-blue-800; }
.badge-warning { @apply bg-yellow-100 text-yellow-800; }
.badge-error { @apply bg-red-100 text-red-800; }
.badge-secondary { @apply bg-gray-100 text-gray-800; }
.badge-light { @apply bg-gray-50 text-gray-500; }
</style>
