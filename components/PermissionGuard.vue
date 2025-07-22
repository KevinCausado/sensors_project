<script setup>
import { computed, watch, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { getInternalPermissionName } from '~/utils/permissionsMap'; // Importa la función de mapeo

const props = defineProps({
  moduleId: {
    type: String,
    required: true,
  },
  permission: {
    type: String,
    required: true,
  },
});

const authStore = useAuthStore();

// Construye la cadena de permiso completa (ej: "users.ver")
const fullFrontendPermissionString = computed(() => 
  `${props.moduleId}.${props.permission}`
);

// Obten el nombre interno del permiso (ej: "view")
const internalPermissionName = computed(() => 
  getInternalPermissionName(props.permission)
);

// Construye la cadena de permiso completa con el nombre interno (ej: "users.view")
const fullInternalPermissionString = computed(() =>
  `${props.moduleId}.${internalPermissionName.value}`
);

// El getter 'hasPermission' ahora usará el nombre interno del permiso
const hasPermission = computed(() => {
  const result = authStore.can(fullInternalPermissionString.value);
  
  return result;
});

// Los logs de depuración siguen siendo útiles
watch(hasPermission, (newVal) => {
    
});

onMounted(() => {
    
});
</script>

<template>
  <slot v-if="hasPermission" />
</template>