<template>
  <div>
    <PageHeader 
      title="Configuración" 
      subtitle="Administrar configuración y permisos del sistema" />   
    <div class="space-y-6">
      <!-- Configuración de la Organización -->
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Configuración de la Organización</h2>
        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="form-label">Nombre de la Organización</label>
              <input type="text" v-model="settings.orgName" class="form-input" />
            </div>
            <div>
              <label class="form-label">Correo de Contacto</label>
              <input type="email" v-model="settings.contactEmail" class="form-input" />
            </div>
          </div>
          
          <div>
            <label class="form-label">Configuración de Notificaciones</label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="checkbox" v-model="settings.notifications.newSensor" class="form-checkbox" />
                <span class="ml-2 text-sm text-gray-700">Notificaciones por correo para nuevos sensores</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" v-model="settings.notifications.alerts" class="form-checkbox" />
                <span class="ml-2 text-sm text-gray-700">Notificaciones por correo para alertas</span>
              </label>
            </div>
          </div>
        </div>
        
        <div class="mt-6">
          <button @click="saveSettings" class="btn btn-primary">
            Guardar Configuración
          </button>
        </div>
      </div>
      
      <!-- Configuración de API -->
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Configuración de API</h2>
        <div class="space-y-4">
          <div>
            <label class="form-label">Clave API</label>
            <div class="flex">
              <input type="password" :value="settings.apiKey" readonly class="form-input flex-1" />
              <button class="btn btn-secondary ml-2">Generar Nueva Clave</button>
            </div>
          </div>
          
          <div>
            <label class="form-label">URL del Webhook</label>
            <input type="text" v-model="settings.webhookUrl" class="form-input" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  // middleware: ['auth']
});

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

const settings = ref({
  orgName: 'Organización Principal',
  contactEmail: 'contacto@ejemplo.com',
  notifications: {
    newSensor: true,
    alerts: true
  },
  apiKey: '****************************************',
  webhookUrl: 'https://api.ejemplo.com/webhook'
});

// Métodos
const saveSettings = async () => {
  // Implementación para guardar configuración
  console.log('Guardando configuración:', settings.value);
};
</script>