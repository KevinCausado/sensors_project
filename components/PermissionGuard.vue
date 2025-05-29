<script setup>
import { computed, watch, onMounted } from 'vue'; // Asegúrate de importar watch y onMounted
import { useAuthStore } from '~/stores/auth'; // Asegúrate de que esta ruta sea correcta

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

// --- NUEVOS LOGS DE DEPURACIÓN EN PERMISSIONGUARD (Mantenlos por ahora) ---
console.log(`[PG-DEBUG] PermissionGuard initialized for module: ${props.moduleId}, permission: ${props.permission}`);
console.log(`[PG-DEBUG] authStore instance in PermissionGuard:`, authStore); // Verificamos la instancia del store
// --------------------------------------------------------------------------

// ESTA ES LA LÍNEA CLAVE: UTILIZA EL GETTER 'can' DE TU STORE
const hasPermission = computed(() => {
  const result = authStore.can(`${props.moduleId}.${props.permission}`);
  console.log(`[PG-DEBUG] hasPermission computed for ${props.moduleId}.${props.permission}: ${result}`);
  return result;
});

// Opcional: watch para ver si hasPermission cambia (mantenlo por ahora para depuración)
watch(hasPermission, (newVal) => {
    console.log(`[PG-DEBUG] hasPermission changed for ${props.moduleId}.${props.permission}: ${newVal}`);
});

// Opcional: onMounted para ver si el componente se monta (mantenlo por ahora para depuración)
onMounted(() => {
    console.log(`[PG-DEBUG] PermissionGuard mounted for ${props.moduleId}.${props.permission}`);
});
</script>

<template>
  <template v-if="hasPermission">
    <slot></slot>
  </template>
  <template v-else>
    </template>
</template>