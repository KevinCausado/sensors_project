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
  console.log(`[PG-DEBUG] Checking frontend permission '${fullFrontendPermissionString.value}' -> internal '${fullInternalPermissionString.value}'. Result: ${result}`);
  return result;
});

// Los logs de depuración siguen siendo útiles
watch(hasPermission, (newVal) => {
    console.log(`[PG-DEBUG] hasPermission changed for ${fullInternalPermissionString.value}: ${newVal}`);
});

onMounted(() => {
    console.log(`[PG-DEBUG] PermissionGuard mounted for ${fullInternalPermissionString.value}`);
});
</script>

<template>
  <slot v-if="hasPermission" />
</template>