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
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            {{ tab.name }}
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
import { ref, watchEffect, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useBreadcrumbStore } from '~/stores/breadCrumb';
import PageHeader from '~/components/PageHeader.vue';
import ReportSchedules from '~/components/ReportSchedules.vue';
import ReportConfigurations from '~/components/ReportConfigurations.vue';

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const breadcrumbStore = useBreadcrumbStore();

const tabs = [
  { id: 'schedules', name: 'Gestión de Tareas' },
  { id: 'configurations', name: 'Configuración de Servidores de Correo' },
];

const activeTab = ref('schedules');

// Observador para actualizar el breadcrumb cuando cambia la pestaña
watchEffect(() => {
  const currentTab = tabs.find(tab => tab.id === activeTab.value);
  if (currentTab) {
    // Construye una "ruta virtual" para la pestaña
    const virtualPath = `${route.path}/${currentTab.id}`;
    breadcrumbStore.setNameForPath({
      path: virtualPath,
      name: currentTab.name,
    });

    // Limpia los nombres de las otras pestañas para evitar duplicados
    tabs.forEach(tab => {
      if (tab.id !== activeTab.value) {
        breadcrumbStore.clearNameForPath(`${route.path}/${tab.id}`);
      }
    });
  }
});

// Limpiar todos los breadcrumbs de pestañas al salir de la página
onUnmounted(() => {
  tabs.forEach(tab => {
    breadcrumbStore.clearNameForPath(`${route.path}/${tab.id}`);
  });
});
</script>
