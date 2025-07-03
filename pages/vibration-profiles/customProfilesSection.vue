<template>
  <div class="card p-6 shadow-lg">
    <h3 class="text-xl font-semibold text-gray-800 mb-4">Perfiles Personalizados</h3>
     <p class="text-sm text-gray-500 mb-4">Perfiles de vibración creados a medida para maquinaria específica.</p>
    
    <div v-if="loading" class="text-center py-4">Cargando perfiles...</div>
    <div v-else-if="error" class="text-center py-4 text-red-600">Error: {{ error }}</div>
    
    <div v-else-if="profiles.length === 0" class="text-center text-gray-500 py-4">
      No se han creado perfiles personalizados.
    </div>

    <div v-else class="space-y-8">
       <div v-for="profile in profiles" :key="profile.id">
        
        <div class="flex justify-between items-center mb-2">
            <div>
                <h4 class="text-lg font-bold text-primary-700">{{ profile.name }}</h4>
                <p class="text-sm text-gray-500">{{ profile.description || 'Sin descripción.' }}</p>
            </div>
            <!-- ++ INICIO DE LA MODIFICACIÓN: Se añaden los botones de acción ++ -->
            <div class="flex items-center space-x-4 flex-shrink-0">
                <PermissionGuard moduleId="vibration_profiles" permission="manage">
                  <button @click="editProfile(profile.id)" class="text-gray-500 hover:text-primary-600" title="Editar perfil">
                    <PencilIcon class="h-5 w-5" />
                  </button>
                </PermissionGuard>
                <PermissionGuard moduleId="vibration_profiles" permission="delete">
                  <button @click="showDeleteConfirm(profile)" class="text-red-500 hover:text-red-700 disabled:opacity-50" :disabled="profile.assigned_assets_count > 0" title="Eliminar perfil">
                    <TrashIcon class="h-5 w-5" />
                  </button>
                </PermissionGuard>
            </div>
            <!-- ++ FIN DE LA MODIFICACIÓN ++ -->
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full">
                <thead>
                    <tr>
                        <th class="th-cell text-center">Severidad</th>
                        <th class="th-cell text-center">Condición</th>
                        <th class="th-cell text-center">Rango (mm/s)</th>
                        <th class="th-cell text-center">Rigidez Aplicable</th>
                    </tr>
                </thead>
                <tbody class="bg-white">
                    <tr v-for="range in profile.ranges" :key="range.id" class="border-b last:border-b-0">
                        <td class="td-cell text-center">
                          <span class="font-bold px-3 py-1 rounded-full text-xs" :class="getSeverityClass(range.severity)">ZONA {{ range.severity }}</span>
                        </td>
                        <td class="td-cell text-center font-medium" :class="getSeverityTextColor(range.severity)">
                          {{ getSeverityDescription(range.severity) }}
                        </td>
                        <td class="td-cell text-center font-mono">
                          {{ range.min_value }} - {{ range.max_value }}
                        </td>
                        <td class="td-cell text-center">
                          {{ profile.rigidity_name }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
       </div>
    </div>

     <ConfirmModal 
      v-if="showDeleteModal" 
      title="Eliminar Perfil" 
      :message="`¿Estás seguro que deseas eliminar el perfil '${profileToDelete?.name}'?`" 
      @confirm="confirmDelete" 
      @cancel="cancelDelete" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCustomVibrationProfileStore } from '~/stores/customVibrationProfiles';
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline';
import ConfirmModal from '~/components/ConfirmModal.vue';

const router = useRouter();
const customProfileStore = useCustomVibrationProfileStore();
const loading = computed(() => customProfileStore.loading);
const error = computed(() => customProfileStore.error);
const profiles = computed(() => customProfileStore.profiles);

const showDeleteModal = ref(false);
const profileToDelete = ref(null);

// ++ FUNCIÓN PARA EL BOTÓN DE EDITAR ++
const editProfile = (id) => {
    router.push(`/vibration-profiles/custom/${id}/edit`);
};

const showDeleteConfirm = (profile) => {
  if (profile.assigned_assets_count > 0) {
    alert('No se puede eliminar un perfil que está asignado a uno o más activos.');
    return;
  }
  profileToDelete.value = profile;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!profileToDelete.value) return;
  await customProfileStore.deleteProfile(profileToDelete.value.id);
  cancelDelete();
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  profileToDelete.value = null;
};

const getSeverityDescription = (severity) => ({'A': 'Buena (Operación nueva)','B': 'Satisfactoria (Operación continua)','C': 'Insatisfactoria (No apta para operación continua)','D': 'Inaceptable (Peligro de daño)',}[severity] || 'Desconocida');
const getSeverityClass = (severity) => ({'A': 'bg-green-100 text-green-800', 'B': 'bg-blue-100 text-blue-800','C': 'bg-yellow-100 text-yellow-800', 'D': 'bg-red-100 text-red-800',}[severity] || 'bg-gray-100');
const getSeverityTextColor = (severity) => ({'A': 'text-green-700','B': 'text-blue-700','C': 'text-yellow-700','D': 'text-red-700',}[severity] || 'text-gray-700');

onMounted(() => {
  customProfileStore.fetchProfiles();
  customProfileStore.fetchSupportData();
});
</script>

<style scoped>
.card { @apply bg-white shadow-md rounded-lg overflow-hidden; }
.th-cell { @apply px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider; }
.td-cell { @apply px-4 py-4 whitespace-nowrap text-sm; }
</style>
