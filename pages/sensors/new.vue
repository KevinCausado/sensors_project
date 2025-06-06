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

           <div>
            <label class="form-label">Dirección</label>
            <textarea v-model="form.location_description" class="form-input"></textarea>
          </div>

          <div>
            <label class="form-label">Organización</label>
            <select v-model="form.organizationId" required class="form-input">
              <option value="">Seleccione una organización</option>
              <option v-for="org in organizations" :key="org.id" :value="org.id">
                {{ org.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="form-label">Estado</label>
            <select v-model="form.status" required class="form-input">
              <option value="active">Activo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="inactive">Inactivo</option>
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
import { ref, computed, onMounted } from "vue";
import { useSensorStore } from "~/stores/sensors";
import { useOrganizationStore } from "~/stores/organizations";
import { useRouter } from "vue-router";
import { useParameterStore } from "~/stores/parameters"; // Asegúrate de que este import exista

import { PlusIcon, CheckIcon } from "@heroicons/vue/24/outline";
// Componentes
import PageHeader from "@/components/PageHeader.vue";

definePageMeta({
  permission: "sensors.crear",
});

// Stores
const sensorStore = useSensorStore();
const organizationStore = useOrganizationStore();
const parameterStore = useParameterStore(); // Inicializa el store de parámetros
const router = useRouter();

// Estado
const saving = ref(false);
const form = ref({
  name: "",
  type: "temperature",
  unit: "", // Mantén este campo para la unidad seleccionada
  serial_number: "", // Añadido
  model: "", // Añadido
  location_description: "", // Añadido
  country: "", // Nuevo campo
  state: "", // Nuevo campo
  city: "", // Nuevo campo
  organizationId: "",
  status: "",
  thresholds: {
    criticalMin: 0,
    criticalMax: 100,
    normalMin: 0,
    normalMax: 100,
  },
});
// Computed
const organizations = computed(() => organizationStore.organizations);
// Este getter ya está bien, asumiendo que tu store de parámetros lo define correctamente
const availableUnits = computed(() => parameterStore.getUnitParameters);
// Métodos
const saveSensor = async () => {
  try {
    saving.value = true;
    const sensor = await sensorStore.createSensor({
      ...form.value,
      // La línea de abajo fue eliminada, ya que 'organizationName' no es una columna en tu tabla 'sensors'.
      // organizationName: organizations.value.find(org => org.id === form.value.organizationId)?.name
      // Asegúrate de que 'thresholds' se envíe como un objeto completo si es un JSONB
      thresholds: { ...form.value.thresholds },
    });
    router.push("/sensors");
  } catch (error) {
    console.error("Error al guardar sensor:", error);
  } finally {
    saving.value = false;
  }
};
// Cargar datos
onMounted(async () => {
  await Promise.all([
    organizationStore.fetchOrganizations(),
    parameterStore.fetchParameters(), // Asegúrate de que este método carga los parámetros en el store
  ]);

  // Establecer organización por defecto si hay una
  if (organizationStore.organizations.length > 0 && !form.value.organizationId) {
    form.value.organizationId = organizationStore.organizations[0].id;
  }
});
</script>

<style scoped>
/* Tus estilos aquí */
</style>