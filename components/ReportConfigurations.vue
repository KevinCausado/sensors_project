<template>
  <div class="card p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Configuración de Servidores de Correo (SMTP)</h3>
      <PermissionGuard moduleId="report_configurations" permission="crear">
        <button @click="openModal()" class="btn btn-primary flex items-center">
          <PlusIcon class="h-5 w-5 mr-2" />
          Nueva Configuración
        </button>
      </PermissionGuard>
    </div>

    <!-- Tabla de Configuraciones -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">Nombre</th>
            <th class="table-header">Email Remitente</th>
            <th class="table-header">Host</th>
            <th class="table-header">Puerto</th>            
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
           <tr v-if="reportStore.isLoading"><td colspan="5" class="text-center py-4">Cargando...</td></tr>
           <tr v-else-if="reportStore.configurations.length === 0"><td colspan="5" class="text-center py-4">No hay configuraciones de correo.</td></tr>
           <tr v-for="config in reportStore.configurations" :key="config.id">
            <td class="table-cell font-medium">{{ config.name }}</td>
            <td class="table-cell">{{ config.sender_email }}</td>
            <td class="table-cell">{{ config.host }}</td>
            <td class="table-cell">{{ config.port }}</td>
            <td class="table-cell text-right">
                <div class="flex items-center justify-end space-x-1">
                  <PermissionGuard moduleId="report_configurations" permission="editar">
                    <ActionButton 
                      icon="pencil" 
                      title="Editar Configuración" 
                      color="warning" 
                      @click="openModal(config)" />
                  </PermissionGuard>
                  <PermissionGuard moduleId="report_configurations" permission="eliminar">
                    <ActionButton 
                      icon="trash" 
                      title="Eliminar Configuración" 
                      color="error" 
                      @click="showDeleteConfirm(config)" />
                  </PermissionGuard>
                </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal para Crear/Editar Configuración -->
    <Modal :is-open="isModalOpen" @close="closeModal">
      <template #title>{{ isEditing ? 'Editar Configuración' : 'Nueva Configuración de Servidor' }}</template>
      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <div>
            <label for="config-name" class="form-label">Nombre Identificativo</label>
            <input id="config-name" v-model="form.name" type="text" class="form-input" required placeholder="Ej: Servidor Principal">
          </div>
          <div>
            <label for="sender_email" class="form-label">Email Remitente</label>
            <input id="sender_email" v-model="form.sender_email" type="email" class="form-input" required placeholder="reportes@miempresa.com">
          </div>
          <!-- ++ CAMBIO: Campo de Contraseña ++ -->
          <div>
            <label for="password" class="form-label">
              Contraseña de Aplicación (SMTP)
              <span v-if="isEditing" class="text-xs text-gray-500">(Dejar en blanco para no cambiar)</span>
            </label>
            <input id="password" v-model="form.password" type="password" class="form-input" :required="!isEditing" placeholder="••••••••••••••••">
          </div>
          <div>
            <label for="host" class="form-label">Host SMTP</label>
            <input id="host" v-model="form.host" type="text" class="form-input" required placeholder="smtp.gmail.com">
          </div>
          <div>
            <label for="port" class="form-label">Puerto</label>
            <input id="port" v-model="form.port" type="number" class="form-input" required placeholder="465 o 587">
          </div>
          <div class="flex items-center">
            <input id="secure" v-model="form.secure" type="checkbox" class="h-4 w-4 text-primary-600 border-gray-300 rounded">
            <label for="secure" class="ml-2 block text-sm text-gray-900">Usar Conexión Segura (SSL/TLS)</label>
          </div>
        </div>
        <div class="mt-6 flex justify-end space-x-2">
          <button type="button" @click="closeModal" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Configuración</button>
        </div>
      </form>
    </Modal>

    <!-- Modal de Confirmación de Eliminación -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Eliminar Configuración"
      :message="`¿Estás seguro que deseas eliminar la configuración '${configToDelete?.name}'? Esta acción no se puede deshacer.`"
      @confirm="confirmDelete"
      @cancel="cancelDelete" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useReportStore } from '~/stores/reports';
import Modal from '~/components/Modal.vue';
import ConfirmModal from '~/components/ConfirmModal.vue';
import PermissionGuard from '~/components/PermissionGuard.vue';
import ActionButton from '~/components/ActionButton.vue';
import { PlusIcon } from '@heroicons/vue/24/solid';

const reportStore = useReportStore();
const isModalOpen = ref(false);
const isEditing = ref(false);
const form = ref({});

const showDeleteModal = ref(false);
const configToDelete = ref(null);

const resetForm = () => {
  form.value = {
    name: '',
    sender_email: '',
    password: '',
    host: '',
    port: 465,
    secure: true,
  };
  isEditing.value = false;
};

const openModal = (config = null) => {
  if (config) {
    isEditing.value = true;
    form.value = { ...config, password: '' };
  } else {
    resetForm();
  }
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const handleSubmit = async () => {
  try {
    const { password, ...configData } = form.value;
    
    if (isEditing.value) {
      await reportStore.updateConfiguration(configData.id, configData, password);
    } else {
      await reportStore.createConfiguration(configData, password);
    }
    closeModal();
  } catch (error) {
    console.error('Error al guardar la configuración:', error);
  }
};

const showDeleteConfirm = (config) => {
  configToDelete.value = config;
  showDeleteModal.value = true;
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  configToDelete.value = null;
};

const confirmDelete = async () => {
  if (!configToDelete.value) return;
  try {
    await reportStore.deleteConfiguration(configToDelete.value.id);
  } catch (error) {
    console.error('Error al eliminar la configuración:', error);
  } finally {
    cancelDelete();
  }
};

onMounted(() => {
  reportStore.fetchConfigurations();
});
</script>

<style scoped>
.card { @apply bg-white shadow-md rounded-lg; }
.btn { @apply inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md; }
.btn-primary { @apply text-white bg-primary-600 hover:bg-primary-700; }
.btn-secondary { @apply text-gray-700 bg-gray-100 hover:bg-gray-200; }
.form-label { @apply block text-sm font-medium text-gray-700 mb-1; }
.form-input, .form-select { @apply block w-full border-gray-300 rounded-md shadow-sm; }
.table-header { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
.table-cell { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-700; }
</style>
