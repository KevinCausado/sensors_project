// sensor-simulator.js
import axios from 'axios';

// --- CONFIGURACIÓN ---
// ¡IMPORTANTE!: Reemplaza estos con los IDs reales de tus sensores de Supabase
// Asegúrate de que los 'id' y 'unit' coincidan con tus sensores en la tabla 'public.sensors'
const SENSOR_CONFIGS = [
  {
    // ID de un sensor de ejemplo que maneja los 4 umbrales
    // Asegúrate de que este ID existe en tu tabla 'public.sensors'
    id: '10000000-0000-0000-0000-000000000001', 
    type: 'temperature', 
    unit: 'C',     
    // Tus umbrales específicos (los que tienes en el JSONB de la DB)
    normalMin: 30,
    normalMax: 80,
    criticalMin: 20,
    criticalMax: 90,
    variation: 1.5 // Cuánto puede variar el valor en cada lectura
  },  
  {
    id: '7761b176-a062-4c01-ad32-1aef55674bef', // ¡REEMPLAZA ESTO CON EL ID REAL DE TU SENSOR DE VIBRACIÓN!
    type: 'vibration',
    unit: 'mm/s', // O la unidad que uses para tu sensor de vibración (ej. G, mm/s)
    normalMin: 1,
    normalMax: 5,
    criticalMin: 0.5,
    criticalMax: 10,
    variation: 0.5 
  }
];

// URL de tu Nuxt Server Route para la ingesta de datos
const INGEST_URL = 'http://localhost:3000/api/sensors/ingest'; // Asegúrate de que tu Nuxt app esté corriendo en este puerto
const SEND_INTERVAL_MS = 5000; // Enviar data cada 5 segundos

// Valores y estados iniciales de los sensores (se irán actualizando en la simulación)
const currentSensorValues = {};
const currentSensorStatus = {}; // Para simular el estado del sensor ('active', 'inactive', 'maintenance', 'error')
let statusChangeCounter = 0; // Contador para disparar cambios de estado
let dataIssueCounter = 0; // Contador para disparar problemas de datos (valor null)

SENSOR_CONFIGS.forEach(config => {
  currentSensorValues[config.id] = (config.normalMin + config.normalMax) / 2; // Iniciar en el promedio normal
  currentSensorStatus[config.id] = 'active'; // Iniciar todos los sensores como activos
});


// --- LÓGICA DEL SIMULADOR ---

// Genera una lectura aleatoria para un sensor
function generateRandomReading(sensorConfig) {
  let currentValue = currentSensorValues[sensorConfig.id];

  // Generar una variación aleatoria
  const change = (Math.random() * 2 * sensorConfig.variation) - sensorConfig.variation; // Valor entre -variation y +variation
  let newValue = currentValue + change;

  // Empujar el valor cerca de los umbrales para probar alertas de baja prioridad
  if (Math.random() < 0.3) { // 30% de probabilidad de empujar hacia un umbral
    if (Math.random() < 0.5) { // Empujar hacia el límite inferior de normal
      newValue = sensorConfig.normalMin - (Math.random() * sensorConfig.variation * 0.8);
    } else { // Empujar hacia el límite superior de normal
      newValue = sensorConfig.normalMax + (Math.random() * sensorConfig.variation * 0.8);
    }
  }

  // Asegurarse de que el valor no exceda los límites críticos definidos en la configuración local del simulador
  // (aunque la lógica de alerta final usa los de la DB)
  if (newValue > sensorConfig.criticalMax) {
    newValue = sensorConfig.criticalMax - (Math.random() * sensorConfig.variation * 0.1);
  } else if (newValue < sensorConfig.criticalMin) {
    newValue = sensorConfig.criticalMin + (Math.random() * sensorConfig.variation * 0.1);
  }

  currentSensorValues[sensorConfig.id] = newValue; // Actualizar el valor actual

  return {
    sensorId: sensorConfig.id,
    value: parseFloat(newValue.toFixed(2)), // Redondear a 2 decimales
    unit: sensorConfig.unit // Incluir la unidad aquí
  };
}

// Envía un lote de lecturas al servidor de ingesta
async function sendReadings() {
  console.log(`[${new Date().toLocaleTimeString()}] Generando y enviando lecturas...`);
  const batchReadings = [];
  statusChangeCounter++;
  dataIssueCounter++;

  for (const config of SENSOR_CONFIGS) {
    let reading = generateRandomReading(config); // Obtener una lectura potencial
    let sensorStatusToSend = currentSensorStatus[config.id]; // Obtener el estado actual simulado

    // Simular cambios de estado periódicamente (menos frecuente)
    if (statusChangeCounter % 20 === 0 && Math.random() < 0.5) { // Cada 20 intervalos, 50% de probabilidad
      const statuses = ['inactive', 'maintenance', 'error'];
      const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
      currentSensorStatus[config.id] = newStatus;
      sensorStatusToSend = newStatus;
      console.log(`Simulando cambio de estado para ${config.id} a ${newStatus}`);
      // Si el sensor está inactivo o en error/mantenimiento, simular que no envía datos válidos
      if (newStatus !== 'active') {
        reading.value = null; // Simular que no hay lectura numérica
      }
    } else if (currentSensorStatus[config.id] !== 'active' && Math.random() < 0.3) { // 30% de probabilidad de recuperarse
      currentSensorStatus[config.id] = 'active';
      sensorStatusToSend = 'active';
      console.log(`Simulando recuperación para ${config.id} a active`);
      // Asegurarse de que se envía una lectura válida al recuperarse
      reading = generateRandomReading(config); // Generar nueva lectura válida
    }

    // Simular lectura inválida (data_issue) ocasionalmente si el sensor está activo
    if (dataIssueCounter % 7 === 0 && sensorStatusToSend === 'active' && Math.random() < 0.4) { // 40% de prob cada 7 intervalos
      reading.value = null;
      console.log(`Simulando lectura inválida (data_issue) para ${config.id}`);
    }

    batchReadings.push({
      sensorId: config.id,
      value: reading.value,
      unit: reading.unit, // Incluir la unidad en la lectura enviada
      sensorStatus: sensorStatusToSend // Incluir el estado simulado del sensor
    });
  }

  try {
    const response = await axios.post(INGEST_URL, batchReadings, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`[${new Date().toLocaleTimeString()}] Data enviada exitosamente. Respuesta:`, response.data.message);
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Error al enviar data:`, error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
  }
}

// Iniciar el simulador
console.log(`Simulador de Sensores Iniciado. Enviando data a ${INGEST_URL} cada ${SEND_INTERVAL_MS / 1000} segundos.`);
setInterval(sendReadings, SEND_INTERVAL_MS);
sendReadings(); // Enviar una lectura al inicio