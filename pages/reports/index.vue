<template>
  <div>
    <PageHeader 
      title="Gestión de Reportes" 
      subtitle="Configura y programa el envío automático de informes."
    />

    <div class="max-w-7xl mx-auto space-y-6">
      <!-- Pestañas de Navegación -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button 
            @click="activeTab = 'schedules'"
            :class="[
              activeTab === 'schedules' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            Gestión de Tareas
          </button>
          <button 
            @click="activeTab = 'configurations'"
            :class="[
              activeTab === 'configurations' 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            Configuración de Servidores de Correo
          </button>
        </nav>
      </div>

      <!-- Contenido de la Pestaña Activa -->
      <div>
        <ReportSchedules v-if="activeTab === 'schedules'" />
        <ReportConfigurations v-if="activeTab === 'configurations'" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import PageHeader from '~/components/PageHeader.vue';
import ReportSchedules from '~/components/ReportSchedules.vue';
import ReportConfigurations from '~/components/ReportConfigurations.vue';

definePageMeta({
  // middleware: ['auth'] // Asegúrate de tener un middleware de autenticación si es necesario
});

const activeTab = ref('schedules'); // La pestaña por defecto
</script>