<template>
  <div>
    <PageHeader
      title="Editar Activo"
      :subtitle="asset?.name || 'Cargando...'"
    >
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink
            to="/assets"
            class="btn btn-secondary"
          >
            Volver
          </NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="ml-3 text-gray-500">Cargando información del activo...</p>
    </div>

    <div v-else class="max-w-3xl mx-auto">
      <div class="card">
        <form @submit.prevent="saveAsset" class="space-y-6">
          <!-- Datos Básicos del Activo -->
          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Información General</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Nombre del Activo</label>
              <input v-model="form.name" type="text" required class="form-input" />
            </div>
            <div>
              <label class="form-label">Código del Activo</label>
              <input v-model="form.asset_code" type="text" required class="form-input" />
            </div>
            <div>
              <label class="form-label">Número de Serie</label>
              <input v-model="form.serial_number" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Modelo</label>
              <input v-model="form.model_number" type="text" class="form-input" />
            </div>
          </div>

          <!-- NUEVOS CAMPOS DE UBICACIÓN GEOGRÁFICA (AHORA AQUÍ) -->
          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-8">Ubicación Geográfica</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label class="form-label">País</label>
              <input v-model="form.country" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Estado</label>
              <input v-model="form.state" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Ciudad</label>
              <input v-model="form.city" type="text" class="form-input" />
            </div>
          </div>

          <!-- CAMPO DESCRIPCIÓN (AHORA DEBAJO DE UBICACIÓN) -->
          <div class="sm:col-span-2">
            <label class="form-label">Descripción</label>
            <textarea v-model="form.description" rows="3" class="form-input"></textarea>
          </div>

          <!-- Relaciones del Activo -->
          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-8">Configuración Técnica</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Organización</label>
              <select v-model="form.organization_id" required class="form-input">
                <option value="" disabled>Selecciona una organización</option>
                <option v-for="org in organizationStore.organizations" :key="org.id" :value="org.id">
                  {{ org.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Tipo de Activo</label>
              <select v-model="form.asset_type_id" class="form-input">
                <option :value="null">Selecciona un tipo</option>
                <option v-for="type in assetStore.assetTypes" :key="type.id" :value="type.id">
                  {{ type.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Grupo ISO</label>
              <select v-model="form.iso_group_id" class="form-input">
                <option :value="null">Selecciona un grupo</option>
                <option v-for="group in assetStore.isoGroups" :key="group.id" :value="group.id">
                  {{ group.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Tipo de Rigidez</label>
              <select v-model="form.rigidity_type_id" class="form-input">
                <option :value="null">Selecciona un tipo</option>
                <option v-for="type in assetStore.rigidityTypes" :key="type.id" :value="type.id">
                  {{ type.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Tipo de Cimentación</label>
              <select v-model="form.foundation_type_id" class="form-input">
                <option :value="null">Selecciona un tipo</option>
                <option v-for="type in assetStore.foundationTypes" :key="type.id" :value="type.id">
                  {{ type.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Tipo de Acoplamiento</label>
              <select v-model="form.coupling_type_id" class="form-input">
                <option :value="null">Selecciona un tipo</option>
                <option v-for="type in assetStore.couplingTypes" :key="type.id" :value="type.id">
                  {{ type.name }}
                </option>
              </select>
            </div>
            <!-- NUEVO CAMPO: Perfil de Vibración -->
            <div>
              <label class="form-label">Perfil de Vibración</label>
              <select v-model="form.vibration_profile_id" class="form-input">
                <option :value="null">Ningún perfil</option>
                <option v-for="profile in assetStore.vibrationProfiles" :key="profile.id" :value="profile.id">
                  {{ profile.measurement_point }} ({{ profile.direction }})
                </option>
              </select>
              <p v-if="assetStore.vibrationProfiles.length === 0 && !assetStore.isLoading" class="text-xs text-gray-500 mt-1">
                No hay perfiles de vibración disponibles. Crea uno primero en la sección de Perfiles de Vibración.
              </p>
            </div>
          </div>

          <!-- Otros Parámetros -->
          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-8">Parámetros Operativos</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Potencia (kW)</label>
              <input v-model.number="form.power_kw" type="number" step="0.01" class="form-input" />
            </div>
            <div>
              <label class="form-label">Velocidad (RPM)</label>
              <input v-model.number="form.speed_rpm" type="number" step="1" class="form-input" />
            </div>
            <div>
              <label class="form-label">Velocidad Crítica (RPM)</label>
              <input v-model.number="form.critical_speed_rpm" type="number" step="1" class="form-input" />
            </div>
            <div>
              <label class="form-label">Temperatura Operativa (°C)</label>
              <input v-model.number="form.operating_temp_c" type="number" step="0.1" class="form-input" />
            </div>
            <div>
              <label class="form-label">Dirección IP</label>
              <input v-model="form.ip_address" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Versión de Firmware</label>
              <input v-model="form.firmware_version" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Estado</label>
              <select
                v-model="form.is_active"
                required
                class="form-input"
              >
                <option :value="true">Activo</option>
                <option :value="false">Inactivo</option>
              </select>
            </div>
          </div>

          <!-- Fechas de Mantenimiento / Instalación -->
          <h2 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-8">Fechas</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Fecha de Fabricación</label>
              <input v-model="form.manufacture_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">Fecha de Instalación</label>
              <input v-model="form.installation_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">Última Fecha de Mantenimiento</label>
              <input v-model="form.last_maintenance_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">Próxima Fecha de Mantenimiento</label>
              <input v-model="form.next_maintenance_date" type="date" class="form-input" />
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <NuxtLink
              :to="`/assets/${route.params.id}`"
              class="btn btn-secondary"
            >
              Cancelar
            </NuxtLink>
            <button
              type="submit"
              class="btn btn-primary flex items-center"
              :disabled="saving"
            >
              <!-- Icono de Check -->
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M9.9997 15.1709L4.82996 10.0012L3.41599 11.4152L9.9997 18.0002L20.7071 7.29285L19.2929 5.87864L9.9997 15.1709Z"/></svg>
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAssetStore } from '~/stores/assets';
import { useOrganizationStore } from '~/stores/organizations';
import PageHeader from '~/components/PageHeader.vue';

definePageMeta({
  // middleware: ['auth']
});

const route = useRoute();
const router = useRouter();
const assetStore = useAssetStore();
const organizationStore = useOrganizationStore();

const loading = ref(true);
const saving = ref(false);
const asset = ref(null); // Almacenará los datos originales del activo para el subtítulo del PageHeader

const form = ref({
  organization_id: null,
  name: '',
  asset_code: '',
  serial_number: '',
  model_number: '',
  country: '',
  state: '',
  city: '',
  description: '',
  asset_type_id: null,
  iso_group_id: null,
  rigidity_type_id: null,
  foundation_type_id: null,
  coupling_type_id: null,
  vibration_profile_id: null, // NUEVO: Campo para el ID del perfil de vibración
  manufacture_date: null,
  installation_date: null,
  last_maintenance_date: null,
  next_maintenance_date: null,
  power_kw: null,
  speed_rpm: null,
  critical_speed_rpm: null,
  operating_temp_c: null,
  ip_address: '',
  firmware_version: '',
  is_active: true,
});

const loadAssetForEdit = async () => {
  const assetId = route.params.id;

  if (assetId === 'new') {
    router.replace('/assets/new');
    return;
  }

  loading.value = true;
  try {
    // Asegurarse de que los datos de referencia (incluidos los perfiles de vibración) estén cargados
    await assetStore.initializeDataForForms();
    await organizationStore.fetchOrganizations();

    const fetchedAsset = await assetStore.fetchAssetById(assetId);
    if (fetchedAsset) {
      asset.value = fetchedAsset; // Save asset for subtitle
      form.value = {
        organization_id: fetchedAsset.organization_id,
        name: fetchedAsset.name || '',
        asset_code: fetchedAsset.asset_code || '',
        serial_number: fetchedAsset.serial_number || '',
        model_number: fetchedAsset.model_number || '',
        country: fetchedAsset.country || '',
        state: fetchedAsset.state || '',
        city: fetchedAsset.city || '',
        description: fetchedAsset.description || '',
        asset_type_id: fetchedAsset.asset_type_id || null,
        iso_group_id: fetchedAsset.iso_group_id || null,
        rigidity_type_id: fetchedAsset.rigidity_type_id || null,
        foundation_type_id: fetchedAsset.foundation_type_id || null,
        coupling_type_id: fetchedAsset.coupling_type_id || null,
        vibration_profile_id: fetchedAsset.vibration_profile_id || null, // NUEVO: Precargar el perfil de vibración
        manufacture_date: fetchedAsset.manufacture_date ? new Date(fetchedAsset.manufacture_date).toISOString().split('T')[0] : null,
        installation_date: fetchedAsset.installation_date ? new Date(fetchedAsset.installation_date).toISOString().split('T')[0] : null,
        last_maintenance_date: fetchedAsset.last_maintenance_date ? new Date(fetchedAsset.last_maintenance_date).toISOString().split('T')[0] : null,
        next_maintenance_date: fetchedAsset.next_maintenance_date ? new Date(fetchedAsset.next_maintenance_date).toISOString().split('T')[0] : null,
        power_kw: fetchedAsset.power_kw,
        speed_rpm: fetchedAsset.speed_rpm,
        critical_speed_rpm: fetchedAsset.critical_speed_rpm,
        operating_temp_c: fetchedAsset.operating_temp_c,
        ip_address: fetchedAsset.ip_address || '',
        firmware_version: fetchedAsset.firmware_version || '',
        is_active: fetchedAsset.is_active ?? true,
      };
    } else {
      console.warn('Asset not found for editing:', assetId);
      router.push('/assets');
    }
  } catch (e) {
    console.error('Error loading asset for editing:', e);
    router.push('/assets');
  } finally {
    loading.value = false;
  }
};

const saveAsset = async () => {
  saving.value = true;
  try {
    const payload = { ...form.value };
    for (const key of ['power_kw', 'speed_rpm', 'critical_speed_rpm', 'operating_temp_c']) {
      if (payload[key] === '') {
        payload[key] = null;
      }
    }
    for (const key of ['manufacture_date', 'installation_date', 'last_maintenance_date', 'next_maintenance_date']) {
      if (payload[key] === '') {
        payload[key] = null;
      }
    }

    // Asegurarse de que vibration_profile_id sea null si es una cadena vacía (del select)
    if (payload.vibration_profile_id === '') {
      payload.vibration_profile_id = null;
    }

    await assetStore.updateAsset(route.params.id, payload);
    router.push(`/assets/`); // Redirigir de nuevo a la vista de detalle del activo
    // TODO: Show success notification (e.g., toast)
  } catch (e) {
    console.error('Error updating asset:', e);
    // TODO: Show error message to user (e.g., toast)
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await loadAssetForEdit();
});
</script>

<style scoped>
/* Las clases de badge permanecen como estaban, no es necesario incluirlas en la respuesta final a menos que haya cambios */
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.badge-success {
  @apply bg-green-100 text-green-800;
}
.badge-danger {
  @apply bg-red-100 text-red-800;
}
.form-input-static { /* Estilo para texto estático en vista de detalles */
  @apply mt-1 text-sm text-gray-900;
}
</style>
