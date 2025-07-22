<template>
  <div class="card p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Tareas Programadas</h3>
      <PermissionGuard moduleId="report_schedules" permission="crear">
        <button @click="openModal()" class="btn btn-primary flex items-center">
          <PlusIcon class="h-5 w-5 mr-2" />
          Nueva Tarea
        </button>
      </PermissionGuard>
    </div>

    <!-- Tabla de Tareas -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">Nombre</th>
            <th class="table-header">Proceso</th>
            <th class="table-header">Programación</th>
            <th class="table-header">Destinatarios</th>
            <th class="table-header">Estado</th>
            <th class="table-header"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="reportStore.isLoading"><td colspan="6" class="text-center py-4">Cargando...</td></tr>
          <tr v-else-if="reportStore.schedules.length === 0"><td colspan="6" class="text-center py-4">No hay tareas programadas.</td></tr>
          <tr v-for="schedule in reportStore.schedules" :key="schedule.id">
            <td class="table-cell font-medium">{{ schedule.name }}</td>
            <td class="table-cell">{{ schedule.process_name }}</td>
            <td class="table-cell">
              <span class="font-mono text-sm">{{ schedule.cron_schedule }}</span>
              <p class="text-xs text-gray-500">{{ cronToHuman(schedule.cron_schedule) }}</p>
            </td>
            <td class="table-cell text-xs">{{ schedule.recipients.join(', ') }}</td>
            <td class="table-cell">
              <span :class="schedule.is_active ? 'badge-success' : 'badge-danger'" class="badge">
                {{ schedule.is_active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="table-cell text-right">
              <div class="flex items-center justify-end space-x-1">
                <PermissionGuard moduleId="report_schedules" permission="generar">
                  <ActionButton 
                    icon="paper-airplane" 
                    title="Enviar Reporte Ahora"
                    color="primary"
                    @click="handleGenerateNow(schedule.id)" />
                </PermissionGuard>
                <PermissionGuard moduleId="report_schedules" permission="editar">
                  <ActionButton 
                    icon="pencil" 
                    title="Editar Tarea" 
                    color="warning" 
                    @click="openModal(schedule)" />
                </PermissionGuard>
                <PermissionGuard moduleId="report_schedules" permission="eliminar">
                  <ActionButton 
                    icon="trash" 
                    title="Eliminar Tarea" 
                    color="error" 
                    @click="showDeleteConfirm(schedule)" />
                </PermissionGuard>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- CAMBIO: Se aumentó el tamaño del modal a 5xl para mayor comodidad -->
    <Modal :is-open="isModalOpen" @close="closeModal" size="5xl">
      <template #title>{{ isEditing ? 'Editar Tarea' : 'Nueva Tarea Programada' }}</template>
      <form @submit.prevent="handleSubmit">
        <!-- Contenedor principal del grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          
          <!-- Columna Izquierda: Info y Configuración de Correo -->
          <div class="space-y-6">
            <div>
              <label for="name" class="form-label">Nombre de la Tarea</label>
              <input id="name" v-model="form.name" type="text" class="form-input" required placeholder="Ej: Reporte Semanal de Operaciones">
            </div>
            <div>
              <label for="process_name" class="form-label">Proceso a Ejecutar</label>
              <select id="process_name" v-model="form.process_name" class="form-select" required>
                <option value="enviar_informe_activo">Enviar Informe de Activo</option>
              </select>
            </div>
            
            <div class="p-4 border border-gray-200 rounded-md space-y-4">
              <h4 class="font-medium text-gray-800">Configuración de Envío</h4>
              <div>
                  <label for="subject" class="form-label">Asunto del Correo</label>
                  <input id="subject" v-model="form.subject" type="text" class="form-input" required placeholder="Reporte de Estado de Activos">
              </div>
              <div>
                  <label for="configuration_id" class="form-label">Servidor de Correo (Remitente)</label>
                  <select id="configuration_id" v-model="form.configuration_id" class="form-select" required>
                    <option v-for="config in reportStore.configurations" :key="config.id" :value="config.id">
                      {{ config.name }} ({{ config.sender_email }})
                    </option>
                  </select>
              </div>
              <div>
                  <label for="recipients" class="form-label">Destinatarios (separados por comas)</label>
                  <textarea id="recipients" v-model="form.recipients" rows="2" class="form-input" placeholder="ejemplo1@mail.com, ejemplo2@mail.com"></textarea>
              </div>
              <div>
                  <label for="cc_recipients" class="form-label">CC (Copia, separados por comas)</label>
                  <textarea id="cc_recipients" v-model="form.cc_recipients" rows="2" class="form-input"></textarea>
              </div>
              <div>
                  <label for="bcc_recipients" class="form-label">CCO (Copia Oculta, separados por comas)</label>
                  <textarea id="bcc_recipients" v-model="form.bcc_recipients" rows="2" class="form-input"></textarea>
              </div>
            </div>
          </div>

          <!-- Columna Derecha: Programación -->
          <div class="space-y-4">
            <h4 class="font-medium text-gray-800">Programación de la Tarea</h4>
            <div class="p-4 border border-gray-200 rounded-md h-full">
              <CronBuilder v-model="form.cron_schedule" />
            </div>
          </div>
        </div>
        
        <!-- Controles inferiores (fuera del grid) -->
        <div class="mt-6 border-t pt-5">
            <div class="flex justify-between items-center">
                <div class="flex items-center">
                    <input id="is_active" v-model="form.is_active" type="checkbox" class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500">
                    <label for="is_active" class="ml-2 block text-sm text-gray-900">Tarea Activa</label>
                </div>
                <div class="flex justify-end space-x-2">
                    <button type="button" @click="closeModal" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Tarea</button>
                </div>
            </div>
        </div>
      </form>
    </Modal>
    
    <!-- Modal de Confirmación de Eliminación -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Eliminar Tarea Programada"
      :message="`¿Estás seguro que deseas eliminar la tarea '${scheduleToDelete?.name}'? Esta acción no se puede deshacer.`"
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
import CronBuilder from '~/components/CronBuilder.vue';
import { PlusIcon } from '@heroicons/vue/24/solid';
import cronstrue from 'cronstrue/i18n'; 

const reportStore = useReportStore();
const isModalOpen = ref(false);
const isEditing = ref(false);
const form = ref({});

const showDeleteModal = ref(false);
const scheduleToDelete = ref(null);

const arrayToCsv = (arr) => arr ? arr.join(', ') : '';
const csvToArray = (csv) => csv ? csv.split(',').map(email => email.trim()).filter(Boolean) : [];

const resetForm = () => {
  form.value = {
    name: '',
    process_name: 'enviar_informe_activo',
    configuration_id: null,
    subject: 'Reporte Automático de Estado de Activos',
    recipients: '',
    cc_recipients: '',
    bcc_recipients: '',
    cron_schedule: '0 8 * * 1',
    is_active: true,
  };
  isEditing.value = false;
};

const openModal = (schedule = null) => {
  if (schedule) {
    isEditing.value = true;
    form.value = { 
      ...schedule, 
      recipients: arrayToCsv(schedule.recipients),
      cc_recipients: arrayToCsv(schedule.cc_recipients),
      bcc_recipients: arrayToCsv(schedule.bcc_recipients),
    };
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
    const formData = { ...form.value };
    formData.recipients = csvToArray(formData.recipients);
    formData.cc_recipients = csvToArray(formData.cc_recipients);
    formData.bcc_recipients = csvToArray(formData.bcc_recipients);
    delete formData.config;

    if (isEditing.value) {
      await reportStore.updateSchedule(formData.id, formData);
    } else {
      await reportStore.createSchedule(formData);
    }
    closeModal();
  } catch (error) {
    console.error('Error al guardar la tarea:', error);
  }
};

const showDeleteConfirm = (schedule) => {
  scheduleToDelete.value = schedule;
  showDeleteModal.value = true;
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  scheduleToDelete.value = null;
};

const confirmDelete = async () => {
  if (!scheduleToDelete.value) return;
  try {
    await reportStore.deleteSchedule(scheduleToDelete.value.id);
  } catch (error) {
    console.error('Error al eliminar la tarea:', error);
  } finally {
    cancelDelete();
  }
};

const handleGenerateNow = (scheduleId) => {
  alert(`Funcionalidad "Generar Ahora" pendiente. Se ejecutaría la tarea con ID: ${scheduleId}`);
};

const cronToHuman = (cronString) => {
  try {
    return cronstrue.toString(cronString, { locale: 'es' });
  } catch (e) {
    return 'Programación inválida';
  }
};

onMounted(() => {
  reportStore.fetchSchedules();
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
.badge { @apply px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full; }
.badge-success { @apply bg-green-100 text-green-800; }
.badge-danger { @apply bg-red-100 text-red-800; }
</style>
