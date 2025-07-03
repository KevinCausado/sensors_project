<template>
  <div>
    <PageHeader
      title="Gestión de Activos"
      subtitle="Administra, crea y elimina tus activos industriales."
    >
      <template #actions>
        <PermissionGuard moduleId="assets" permission="create">
          <NuxtLink
            to="/assets/new"
            class="btn btn-primary flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 12 4z"/></svg>
            Nuevo Activo
          </NuxtLink>
        </PermissionGuard>
      </template>
    </PageHeader>

    <div class="card">
      <div class="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div class="relative w-full sm:w-64">
          <input v-model="searchQuery" type="text" class="form-input pl-9" placeholder="Buscar activos..." />
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 2a8.5 8.5 0 0 1 6.545 13.914l5.352 5.353a.75.75 0 1 1-1.06 1.06l-5.354-5.353A8.502 8.502 0 0 1 2 10.5C2 6.91 4.91 4 8.5 4a8.5 8.5 0 0 1 2 0zM10.5 3.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select v-model="statusFilter" class="form-select">
            <option :value="null">Todos los estados</option>
            <option :value="true">Activo</option>
            <option :value="false">Inactivo</option>
          </select>
          <select v-model="typeFilter" class="form-select">
            <option :value="null">Todos los tipos</option>
            <option v-for="type in assetStore.getAssetTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
          </select>
          <select v-model="profileFilter" class="form-select">
            <option :value="null">Todos los perfiles</option>
            <optgroup label="Estándares ISO">
              <option v-for="group in assetStore.getIsoGroups" :key="group.id" :value="{ id: group.id, type: 'iso' }">
                {{ group.name }}
              </option>
            </optgroup>
            <optgroup label="Perfiles Personalizados" v-if="customProfileStore.profiles.length > 0">
              <option v-for="profile in customProfileStore.profiles" :key="profile.id" :value="{ id: profile.id, type: 'custom' }">
                {{ profile.name }}
              </option>
            </optgroup>
          </select>
        </div>
      </div>

      <div class="mb-4 text-sm text-gray-700">Mostrando {{ startIndex }} a {{ endIndex }} de {{ totalFilteredAssets }} activos.</div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="th-cell">Activo</th>
              <th class="th-cell">Código</th>
              <th class="th-cell">Tipo</th>
              <th class="th-cell">Perfil de Vibración</th>
              <th class="th-cell">Ubicación</th>
              <th class="th-cell">Estado</th>
              <th class="th-cell"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="assetStore.isLoading"><td colspan="7" class="px-6 py-4 text-center text-gray-500">Cargando activos...</td></tr>
            <tr v-else-if="assetStore.getError"><td colspan="7" class="px-6 py-4 text-center text-red-600">Error: {{ assetStore.getError }}</td></tr>
            <tr v-else-if="paginatedAssets.length === 0"><td colspan="7" class="px-6 py-4 text-center text-gray-500">No se encontraron activos.</td></tr>
            <tr v-else v-for="asset in paginatedAssets" :key="asset.id" class="hover:bg-gray-50">
              <td class="td-cell"><div class="flex items-center"><div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">{{ getAssetInitials(asset.name) }}</div><div class="ml-4"><div class="text-sm font-medium text-gray-900">{{ asset.name }}</div></div></div></td>
              <td class="td-cell">{{ asset.asset_code }}</td>
              <td class="td-cell">{{ asset.assetTypeName }}</td>
              <td class="td-cell"><div class="flex flex-col"><span>{{ asset.profileDisplayName }}</span><span class="text-xs font-semibold px-2 py-0.5 rounded-full self-start mt-1" :class="asset.isCustomProfile ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'">{{ asset.isCustomProfile ? 'Personalizado' : 'Estándar ISO' }}</span></div></td>
              <td class="td-cell">{{ getCombinedLocation(asset) }}</td>
              <td class="td-cell"><span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', getAssetStatusClass(asset.is_active)]">{{ translateAssetStatus(asset.is_active) }}</span></td>
              <td class="td-cell text-right"><div class="flex justify-end space-x-1"><PermissionGuard moduleId="assets" permission="view"><ActionButton icon="eye" tooltip="Ver detalles" color="primary" @click="router.push(`/assets/${asset.id}`)" /></PermissionGuard><PermissionGuard moduleId="assets" permission="manage"><ActionButton icon="pencil" tooltip="Editar activo" color="warning" @click="router.push(`/assets/${asset.id}/edit`)" /></PermissionGuard><PermissionGuard moduleId="assets" permission="delete"><ActionButton icon="trash" tooltip="Eliminar activo" color="error" @click="showDeleteConfirm(asset.id, asset.name)" /></PermissionGuard></div></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4"><Pagination :total-items="totalFilteredAssets" :items-per-page="itemsPerPage" :current-page="currentPage" @page-change="handlePageChange" /></div>
      <ConfirmModal v-if="showDeleteModal" title="Eliminar Activo" :message="`¿Estás seguro de que quieres eliminar el activo '${assetToDeleteName}'? Esta acción no se puede deshacer.`" @confirm="deleteConfirmed" @cancel="cancelDelete" :deleting="deleting" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineComponent, h } from 'vue';
import { useRouter } from 'vue-router';
import { useAssetStore } from '~/stores/assets';
import { useCustomVibrationProfileStore } from '~/stores/customVibrationProfiles';
import PageHeader from '~/components/PageHeader.vue';
import ActionButton from '~/components/ActionButton.vue';
import Pagination from '~/components/Pagination.vue'; 
import PermissionGuard from '~/components/PermissionGuard.vue';
import ConfirmModal from '~/components/ConfirmModal.vue';

const assetStore = useAssetStore();
const customProfileStore = useCustomVibrationProfileStore();
const router = useRouter();

const searchQuery = ref('');
const statusFilter = ref(null); 
const typeFilter = ref(null); 
const profileFilter = ref(null);
const showDeleteModal = ref(false);
const assetToDeleteId = ref(null);
const assetToDeleteName = ref('');
const deleting = ref(false);
const currentPage = ref(1);
const itemsPerPage = ref(10); 

const getCombinedLocation = (asset) => [asset.city, asset.state, asset.country].filter(Boolean).join(', ');
const getAssetInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '';
const getAssetStatusClass = (isActive) => isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
const translateAssetStatus = (isActive) => isActive ? 'Activo' : 'Inactivo';

const filteredAssets = computed(() => {
  let result = [...assetStore.getAssets];
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(asset => Object.values(asset).some(val => String(val).toLowerCase().includes(q)));
  }
  if (statusFilter.value !== null) {
    result = result.filter(asset => asset.is_active === statusFilter.value);
  }
  if (typeFilter.value !== null) {
    result = result.filter(asset => asset.asset_type_id === typeFilter.value);
  }
  if (profileFilter.value) {
    if (profileFilter.value.type === 'iso') {
      result = result.filter(asset => asset.iso_group_id === profileFilter.value.id);
    } else if (profileFilter.value.type === 'custom') {
      result = result.filter(asset => asset.custom_vibration_profile_id === profileFilter.value.id);
    }
  }
  return result;
});

const totalFilteredAssets = computed(() => filteredAssets.value.length);
const paginatedAssets = computed(() => filteredAssets.value.slice((currentPage.value - 1) * itemsPerPage.value, currentPage.value * itemsPerPage.value));
const startIndex = computed(() => totalFilteredAssets.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1);
const endIndex = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalFilteredAssets.value));

const handlePageChange = (page) => { currentPage.value = page; };
const showDeleteConfirm = (id, name) => {
  assetToDeleteId.value = id;
  assetToDeleteName.value = name;
  showDeleteModal.value = true;
};
const cancelDelete = () => { showDeleteModal.value = false; };
const deleteConfirmed = async () => {
  deleting.value = true;
  await assetStore.deleteAsset(assetToDeleteId.value);
  deleting.value = false;
  cancelDelete();
};

onMounted(async () => {
  await assetStore.initializeDataForForms(); 
  await assetStore.fetchAssets(); 
  await customProfileStore.fetchProfiles();
});
</script>

<style scoped>
.th-cell { @apply px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
.td-cell { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-500; }
.form-select { @apply block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm; }
.action-btn { @apply p-1 rounded-full transition-colors duration-200; }
</style>
