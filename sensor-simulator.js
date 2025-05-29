// sensor-simulator.js
import axios from 'axios';

// --- CONFIGURACIÓN ---
// Reemplaza estos con los IDs reales de tus sensores de Supabase
const SENSOR_CONFIGS = [
  {
    id: '21f782c3-834a-45be-ac0f-d4ea9095d46f', // ID de un sensor de Temperatura
    type: 'temperature',
    unit: '°C',
    // Rango operacional 'normal' (valores más comunes)
    normalMin: 20,
    normalMax: 30,
    // Rango total del sensor
    min: 0,
    max: 100,
    variation: 1.5 // Cuánto puede variar el valor en cada lectura (un poco más pequeño para ver mejor el efecto)
  },
  {
    id: '3a69bd34-7e05-4e7b-9674-920ed835f924', // ID de un sensor de Humedad
    type: 'humidity',
    unit: '%',
    // Rango operacional 'normal' (valores más comunes)
    normalMin: 40,
    normalMax: 60,
    // Rango total del sensor
    min: 0,
    max: 100,
    variation: 3 // Un poco más de variación para humedad
  },
  // Puedes añadir más sensores aquí si los tienes en tu DB
];

// URL de tu Nuxt Server Route para la ingesta de datos
const INGEST_URL = 'http://localhost:3000/api/sensors/ingest'; // Asegúrate de que tu Nuxt app esté corriendo en este puerto
const SEND_INTERVAL_MS = 5000; // Enviar data cada 3 segundos (más rápido para ver alertas)

// Valores iniciales (se irán actualizando)
const currentSensorValues = {};
const currentSensorStatus = {}; // Nuevo: Para simular el estado del sensor
let statusChangeCounter = 0; // Nuevo: Contador para disparar cambios de estado
let dataIssueCounter = 0; // Nuevo: Contador para disparar problemas de datos

SENSOR_CONFIGS.forEach(config => {
  currentSensorValues[config.id] = (config.normalMin + config.normalMax) / 2; // Iniciar en el promedio normal
  currentSensorStatus[config.id] = 'active'; // Iniciar todos los sensores como activos
});


// --- LÓGICA DEL SIMULADOR ---

function generateRandomReading(sensorConfig) {
  let currentValue = currentSensorValues[sensorConfig.id];

  // Generar una variación aleatoria
  const change = (Math.random() * 2 * sensorConfig.variation) - sensorConfig.variation; // Valor entre -variation y +variation
  let newValue = currentValue + change;

  // Asegurarse de que el valor esté dentro de los límites del sensor
  if (newValue > sensorConfig.max) {
    newValue = sensorConfig.max - (Math.random() * sensorConfig.variation); // Retrocede un poco si excede
  } else if (newValue < sensorConfig.min) {
    newValue = sensorConfig.min + (Math.random() * sensorConfig.variation); // Avanza un poco si está por debajo
  }

  // A veces, empujar el valor cerca de los umbrales para probar alertas de baja prioridad
  // Aumentamos la probabilidad a 30% para ver más alertas de prioridad baja
  if (Math.random() < 0.3) { // 30% de probabilidad de empujar hacia un umbral normal
    if (Math.random() < 0.5) { // Empujar hacia el límite inferior de normal
      newValue = sensorConfig.normalMin - (Math.random() * sensorConfig.variation * 0.5); // Un poco más suave
    } else { // Empujar hacia el límite superior de normal
      newValue = sensorConfig.normalMax + (Math.random() * sensorConfig.variation * 0.5); // Un poco más suave
    }
    // Asegurarse de que no se sale del rango total del sensor ni de los umbrales de advertencia
    if (newValue > sensorConfig.max) newValue = sensorConfig.max - 0.1;
    if (newValue < sensorConfig.min) newValue = sensorConfig.min + 0.1;

    // Asegurarse de que no caiga en el rango de advertencia (min/max) si la intención es baja prioridad
    if (newValue < sensorConfig.min) newValue = sensorConfig.min + (sensorConfig.variation * 0.1);
    if (newValue > sensorConfig.max) newValue = sensorConfig.max - (sensorConfig.variation * 0.1);
  }


  currentSensorValues[sensorConfig.id] = newValue; // Actualizar el valor actual

  return {
    sensorId: sensorConfig.id,
    value: parseFloat(newValue.toFixed(2)) // Redondear a 2 decimales
  };
}

async function sendReadings() {
  console.log(`[${new Date().toLocaleTimeString()}] Generando y enviando lecturas...`);
  const batchReadings = [];
  statusChangeCounter++;
  dataIssueCounter++;

  for (const config of SENSOR_CONFIGS) {
    let readingValue = generateRandomReading(config).value; // Obtener un valor potencial
    let sensorStatusToSend = currentSensorStatus[config.id]; // Obtener el estado actual simulado

    // Simular cambios de estado periódicamente (menos frecuente)
    if (statusChangeCounter % 20 === 0 && Math.random() < 0.5) { // Cada 20 intervalos, 50% de probabilidad
      const statuses = ['inactive', 'maintenance', 'error'];
      const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
      currentSensorStatus[config.id] = newStatus;
      sensorStatusToSend = newStatus;
      console.log(`Simulando cambio de estado para ${config.id} a ${newStatus}`);
      // Si el sensor está inactivo o en error, simular que no envía datos válidos
      if (newStatus === 'inactive' || newStatus === 'error' || newStatus === 'maintenance') {
        readingValue = null; // Simular que no hay lectura
      }
    } else if (currentSensorStatus[config.id] !== 'active' && Math.random() < 0.3) { // 30% de probabilidad de recuperarse
      currentSensorStatus[config.id] = 'active';
      sensorStatusToSend = 'active';
      console.log(`Simulando recuperación para ${config.id} a active`);
      // Asegurarse de que se envía una lectura válida al recuperarse
      readingValue = generateRandomReading(config).value;
    }

    // Simular lectura inválida (data_issue) ocasionalmente si el sensor está activo
    // Este `dataIssueCounter` es para que no sea *demasiado* frecuente, pero lo suficiente para verlo
    if (dataIssueCounter % 7 === 0 && sensorStatusToSend === 'active' && Math.random() < 0.4) { // 40% de prob cada 7 intervalos
      readingValue = null;
      console.log(`Simulando lectura inválida (data_issue) para ${config.id}`);
    }

    batchReadings.push({
      sensorId: config.id,
      value: readingValue,
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