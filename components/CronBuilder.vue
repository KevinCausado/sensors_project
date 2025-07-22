<template>
  <div class="p-4 border border-gray-200 rounded-md space-y-4 bg-gray-50">
    <div>
      <label for="frequency" class="form-label">Frecuencia</label>
      <select id="frequency" v-model="schedule.frequency" class="form-select">
        <option value="daily">Diariamente</option>
        <option value="weekly">Semanalmente</option>
        <option value="monthly">Mensualmente</option>
      </select>
    </div>

    <div v-if="schedule.frequency === 'weekly'">
      <label for="dayOfWeek" class="form-label">Día de la semana</label>
      <select id="dayOfWeek" v-model="schedule.dayOfWeek" class="form-select">
        <option value="1">Lunes</option>
        <option value="2">Martes</option>
        <option value="3">Miércoles</option>
        <option value="4">Jueves</option>
        <option value="5">Viernes</option>
        <option value="6">Sábado</option>
        <option value="0">Domingo</option>
      </select>
    </div>

    <div v-if="schedule.frequency === 'monthly'">
      <label for="dayOfMonth" class="form-label">Día del mes</label>
      <input id="dayOfMonth" v-model.number="schedule.dayOfMonth" type="number" min="1" max="31" class="form-input">
    </div>

    <div>
      <label for="time" class="form-label">Hora de ejecución (formato 24h)</label>
      <input id="time" v-model="schedule.time" type="time" class="form-input">
    </div>

    <div class="pt-2">
      <p class="text-xs text-gray-600">Programación Generada (CRON):</p>
      <p class="font-mono text-sm text-primary-700 bg-primary-50 p-2 rounded">{{ generatedCron }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '0 8 * * *' // Por defecto, todos los días a las 8:00 AM
  }
});

const emit = defineEmits(['update:modelValue']);

// Estado interno para manejar las partes de la programación
const schedule = ref({
  frequency: 'daily',
  dayOfWeek: '1',
  dayOfMonth: 1,
  time: '08:00'
});

// Genera la cadena CRON basada en el estado interno
const generatedCron = computed(() => {
  const [hour, minute] = schedule.value.time.split(':');
  
  if (schedule.value.frequency === 'daily') {
    return `${minute} ${hour} * * *`;
  }
  if (schedule.value.frequency === 'weekly') {
    return `${minute} ${hour} * * ${schedule.value.dayOfWeek}`;
  }
  if (schedule.value.frequency === 'monthly') {
    return `${minute} ${hour} ${schedule.value.dayOfMonth} * *`;
  }
  return '* * * * *'; // Fallback
});

// Observa cambios en el CRON generado y emite el valor al componente padre
watch(generatedCron, (newCron) => {
  emit('update:modelValue', newCron);
});

// Función para parsear una cadena CRON existente y actualizar el estado interno
// (Esto es útil cuando se edita una tarea existente)
const parseCron = (cronString) => {
  const parts = cronString.split(' ');
  if (parts.length !== 5) return;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  schedule.value.time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  if (dayOfWeek !== '*' && dayOfMonth === '*') {
    schedule.value.frequency = 'weekly';
    schedule.value.dayOfWeek = dayOfWeek;
  } else if (dayOfMonth !== '*' && dayOfWeek === '*') {
    schedule.value.frequency = 'monthly';
    schedule.value.dayOfMonth = parseInt(dayOfMonth, 10);
  } else {
    schedule.value.frequency = 'daily';
  }
};

// Cuando el componente se monta, parsea el valor inicial que recibe
import { onMounted } from 'vue';
onMounted(() => {
  parseCron(props.modelValue);
});
</script>

<style scoped>
.form-label { @apply block text-sm font-medium text-gray-700 mb-1; }
.form-input, .form-select { @apply block w-full border-gray-300 rounded-md shadow-sm; }
</style>
