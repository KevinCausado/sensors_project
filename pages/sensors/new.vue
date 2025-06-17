<template>
  <div>
    <PageHeader title="Nuevo Sensor" subtitle="Crear un nuevo sensor en el sistema">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/sensors" class="btn btn-secondary">Volver</NuxtLink>
        </div>
      </template>
    </PageHeader>

    <div class="max-w-3xl mx-auto">
      <div class="card">
        <form @submit.prevent="saveSensor" class="space-y-6">
          <div>
            <label class="form-label">Nombre</label>
            <input v-model="form.name" type="text" required class="form-input" />
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label class="form-label">Tipo</label>
              <select v-model="form.type" required class="form-input">
                <option value="temperature">Temperatura</option>
                <option value="humidity">Humedad</option>
                <option value="vibration">Vibración</option>
                <option value="pressure">Presión</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div>
              <label class="form-label">Unidad de Medida</label>
              <select v-model="form.unit" class="form-input">
                <option value="">Seleccione una unidad</option>
                <option v-for="unitOption in availableUnits" :key="unitOption.unit" :value="unitOption.unit">
                  {{ unitOption.name }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">Número de Serie</label>
            <input v-model="form.serial_number" type="text" class="form-input" />
          </div>

          <div>
            <label class="form-label">Modelo</label>
            <input v-model="form.model" type="text" class="form-input" />
          </div>
         
      

           <div>
            <label class="form-label">Dirección</label>
            <textarea v-model="form.location_description" class="form-input"></textarea>
          </div>

          <div>
            <label class="form-label">Organización</label>
            <select v-model="form.organizationId" required class="form-input" :disabled="organizationStore.isLoading">
              <option value="">Seleccione una organización</option>
              <option v-for="org in organizations" :key="org.id" :value="org.id">
                {{ org.name }}
              </option>
            </select>
          </div>

          <!-- Campo Activo Relacionado - Importante que asset_id sea null para "Sin activo" -->
          <div>
            <label class="form-label">Activo Relacionado</label>
            <select v-model="form.asset_id" class="form-input" :disabled="assetStore.isLoading">
              <option :value="null">Sin activo relacionado</option>
              <option v-for="assetOption in assets" :key="assetOption.id" :value="assetOption.id">
                {{ assetOption.name }} ({{ assetOption.asset_code || 'N/A' }})
              </option>
            </select>
          </div>

          <div>
            <label class="form-label">Estado</label>
            <select v-model="form.status" required class="form-input">
              <option value="active">Activo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="inactive">Inactivo</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div class="card p-4 bg-gray-50 border border-gray-200">
            <h3 class="text-md font-medium text-gray-900 mb-3">Rangos de Umbral (Thresholds)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="form-label">Normal Mínimo</label>
                <input v-model.number="form.thresholds.normalMin" type="number" step="any" class="form-input" />
              </div>
              <div>
                <label class="form-label">Normal Máximo</label>
                <input v-model.number="form.thresholds.normalMax" type="number" step="any" class="form-input" />
              </div>
              <div>
                <label class="form-label">Crítico Mínimo</label>
                <input v-model.number="form.thresholds.criticalMin" type="number" step="any" class="form-input" />
              </div>
              <div>
                <label class="form-label">Crítico Máximo</label>
                <input v-model.number="form.thresholds.criticalMax" type="number" step="any" class="form-input" />
              </div>
              <!-- Campos específicos para umbrales de vibración -->
              <template v-if="form.type === 'vibration'">
                <div>
                  <label class="form-label">Nivel de Alarma</label>
                  <input v-model.number="form.thresholds.alarm_level" type="number" step="any" class="form-input" />
                </div>
                <div>
                  <label class="form-label">Nivel Crítico</label>
                  <input v-model.number="form.thresholds.critical_level" type="number" step="any" class="form-input" />
                </div>
              </template>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <NuxtLink to="/sensors" class="btn btn-secondary">Cancelar</NuxtLink>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? "Creando..." : "Crear Sensor" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useSensorStore } from "~/stores/sensors";
import { useOrganizationStore } from "~/stores/organizations";
import { useAssetStore } from "~/stores/assets"; 
import { useVibrationProfileStore } from "~/stores/vibrationProfiles"; // Importar el store de perfiles de vibración
import { useRouter } from "vue-router";
import { useParameterStore } from "~/stores/parameters"; 

import PageHeader from "@/components/PageHeader.vue";

definePageMeta({
  permission: "sensors.crear",
});

// Stores
const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const assetStore = useAssetStore(); 
const vibrationProfileStore = useVibrationProfileStore(); // Inicializar el store de perfiles de vibración
const parameterStore = useParameterStore(); 
const router = useRouter();

// Estado
const saving = ref(false);
const form = ref({
  name: "",
  type: "temperature", 
  unit: "", 
  serial_number: "",
  model: "",
  location_description: "",
  country: "",
  state: "",
  city: "",
  organizationId: "", 
  asset_id: null, 
  status: "active", 
  thresholds: { 
    criticalMin: null, 
    criticalMax: null,
    normalMin: null,
    normalMax: null,
    alarm_level: null, // Nuevo para vibración
    critical_level: null, // Nuevo para vibración
  },
});

// Computed
const organizations = computed(() => organizationStore.organizations);
const assets = computed(() => assetStore.assets); 
const availableUnits = computed(() => parameterStore.getUnitParameters);

// Métodos
const saveSensor = async () => {
  try {
    saving.value = true;
    const payload = { ...form.value };

    // Limpiar campos numéricos de umbrales si están vacíos o son 0 para enviar null a DB
    for (const key of ['criticalMin', 'criticalMax', 'normalMin', 'normalMax', 'alarm_level', 'critical_level']) {
      if (payload.thresholds[key] === '' || payload.thresholds[key] === 0) { 
        payload.thresholds[key] = null;
      }
    }

    await sensorStore.createSensor(payload);
    router.push("/sensors");
  } catch (error) {
    console.error("Error al guardar sensor:", error);
    // TODO: Mostrar un mensaje de error al usuario
  } finally {
    saving.value = false;
  }
};

// Observar cambios en el tipo de sensor y el asset_id para cargar umbrales
watch([() => form.value.type, () => form.value.asset_id], async ([newType, newAssetId]) => {
  if (newType === 'vibration' && newAssetId) {
    console.log(`[NewSensorPage] Sensor tipo vibración y asset_id seleccionado: ${newAssetId}. Intentando cargar umbrales del perfil.`);
    const selectedAsset = assets.value.find(asset => asset.id === newAssetId);
    
    if (selectedAsset && selectedAsset.vibration_profile_id) {
      console.log(`[NewSensorPage] Activo tiene perfil de vibración ID: ${selectedAsset.vibration_profile_id}`);
      await vibrationProfileStore.fetchVibrationProfile(selectedAsset.vibration_profile_id);
      const profileThresholds = vibrationProfileStore.getCurrentVibrationProfile?.thresholds;

      if (profileThresholds) {
        console.log('[NewSensorPage] Umbrales del perfil cargados:', profileThresholds);
        // Asignar los umbrales del perfil al formulario del sensor
        form.value.thresholds.normalMin = profileThresholds.normal_min ?? null;
        form.value.thresholds.normalMax = profileThresholds.normal_max ?? null;
        form.value.thresholds.criticalMin = profileThresholds.min_value ?? null; // Asumiendo min_value es criticalMin
        form.value.thresholds.criticalMax = profileThresholds.max_value ?? null; // Asumiendo max_value es criticalMax
        form.value.thresholds.alarm_level = profileThresholds.alarm_level ?? null;
        form.value.thresholds.critical_level = profileThresholds.critical_level ?? null;
        
        // Asignar la unidad del perfil de vibración si está disponible
        const profileUnit = vibrationProfileStore.getCurrentVibrationProfile?.vibration_range_unit;
        if (profileUnit) {
          form.value.unit = profileUnit;
          console.log(`[NewSensorPage] Unidad del perfil de vibración asignada: ${profileUnit}`);
        } else {
          console.warn('[NewSensorPage] Perfil de vibración no tiene unidad definida.');
        }

      } else {
        console.warn('[NewSensorPage] El perfil de vibración no tiene umbrales definidos.');
        // Opcional: Limpiar umbrales si no se encontraron
        resetThresholds();
      }
    } else {
      console.log('[NewSensorPage] Activo seleccionado no tiene perfil de vibración o no se encontró.');
      resetThresholds();
    }
  } else if (newType !== 'vibration' || !newAssetId) {
    // Si el tipo cambia a no-vibración o se deselecciona el activo, limpiar umbrales específicos
    console.log('[NewSensorPage] Tipo de sensor no es vibración o asset_id deseleccionado. Reiniciando umbrales de vibración.');
    resetThresholds();
  }
}, { immediate: false }); // No ejecutar inmediatamente, espera interacción del usuario

// Función para reiniciar los umbrales específicos de vibración
const resetThresholds = () => {
  form.value.thresholds.normalMin = null;
  form.value.thresholds.normalMax = null;
  form.value.thresholds.criticalMin = null;
  form.value.thresholds.criticalMax = null;
  form.value.thresholds.alarm_level = null;
  form.value.thresholds.critical_level = null;
  form.value.unit = ''; // También limpia la unidad si no es de vibración o no hay perfil
};


// Cargar datos iniciales
onMounted(async () => {
  await Promise.all([
    organizationStore.fetchOrganizations(),
    assetStore.fetchAssets(), 
    parameterStore.fetchParameters(),
  ]);

  if (organizationStore.organizations.length > 0 && !form.value.organizationId) {
    form.value.organizationId = organizationStore.organizations[0].id;
  }
});
</script>

<style scoped>
/* Tus estilos aquí */
.form-label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}
.form-input, .form-select {
  @apply mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
}
.btn {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors;
}
.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700;
}
.btn-secondary {
  @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
}
</style>
