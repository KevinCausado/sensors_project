// server/api/sensors/ingest.post.js
import { createClient } from '@supabase/supabase-js';
import { readBody } from 'h3';

export default defineEventHandler(async (event) => {
  const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY;
  const APP_DB_SCHEMA = process.env.NUXT_PUBLIC_APP_DB_SCHEMA || 'public';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase URL o Service Role Key no configuradas en el entorno del servidor.'
    });
  }

  // Crea un cliente Supabase con el Service Role Key para operaciones de escritura sin RLS
  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
      },
      db: {
        schema: APP_DB_SCHEMA,
      }
    }
  );

  try {
    const body = await readBody(event);
    const readingsToProcess = []; // Lista para almacenar las lecturas del body
    const sensorUpdates = []; // Lista para almacenar los datos a actualizar en la tabla 'sensors'

    // Función para procesar una única lectura del body
    const processSingleReading = (item) => {
      if (item.sensorId) {
        // Objeto para la inserción en sensor_readings
        readingsToProcess.push({
          sensor_id: item.sensorId, // Usar snake_case para la DB
          value: typeof item.value === 'number' ? parseFloat(item.value.toFixed(2)) : null,
          timestamp: new Date().toISOString(),
          unit: item.unit || null // Asegurarse de capturar la unidad
        });
        // Objeto para la actualización en sensors (last_value, status, etc.)
        sensorUpdates.push({
          id: item.sensorId,
          status: item.sensorStatus || 'active', // Estado simulado del sensor
          value: typeof item.value === 'number' ? parseFloat(item.value.toFixed(2)) : null,
          unit: item.unit || null, // Unidad del último valor
          lastReading: new Date().toISOString() // Última lectura de tiempo
        });
      }
    };

    // Asegurarse de que el body sea un array o un solo objeto
    if (Array.isArray(body)) {
      body.forEach(processSingleReading);
    } else {
      processSingleReading(body);
    }

    if (readingsToProcess.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No se encontraron lecturas válidas para procesar.' });
    }

    // --- Lógica de Verificación de Umbrales y Disparo/Resolución de Alertas ---
    for (const reading of readingsToProcess) {
      console.log(`\n--- Procesando lectura para sensor: ${reading.sensor_id} ---`);
      console.log(`Valor: ${reading.value}, Unidad: ${reading.unit}, Tiempo: ${reading.timestamp}`);

      // 1. Obtener los detalles completos del sensor desde la tabla 'sensors'
      // CORREGIDO: Eliminado 'last_alert_message' de la selección de 'sensors'
      const { data: sensorData, error: fetchSensorError } = await supabase
        .from('sensors') // Usar el nombre de tabla 'sensors' en minúsculas
        .select(`
            id,
            organization_id,
            name,
            type,
            unit,
            thresholds,
            status,
            current_alert_type,
            asset_id
        `)
        .eq('id', reading.sensor_id)
        .single();

      if (fetchSensorError) {
        if (fetchSensorError.code === 'PGRST116') { // Código para "No rows found"
          console.warn(`[${new Date().toLocaleTimeString()}] Sensor ID ${reading.sensor_id} no encontrado en la base de datos. Saltando procesamiento.`);
        } else {
          console.error(`[${new Date().toLocaleTimeString()}] Error al obtener sensor ${reading.sensor_id}:`, fetchSensorError.message);
        }
        continue; // Pasar al siguiente sensor si no se encontró
      }

      // Obtener el estado simulado actual del sensor de la lista de actualizaciones
      const currentSimulatedStatus = sensorUpdates.find(s => s.id === reading.sensor_id)?.status || 'active';

      let alertDetected = false;
      let alertMessage = '';
      let alertPriority = 'low'; // Default
      let alertTypeForDb = null;
      let alertTitle = '';

      const sensorTypeSpanish = {
        'temperature': 'Temperatura',
        'humidity': 'Humedad',
        'pressure': 'Presión',
        'voltage': 'Voltaje',
        'current': 'Corriente',
        'light': 'Luz',
        'gas': 'Gas',
        'flow': 'Flujo',
        'vibration': 'Vibración', // Añadir si tienes este tipo
        'default': sensorData.type ? sensorData.type.charAt(0).toUpperCase() + sensorData.type.slice(1) : 'Sensor'
      }[sensorData.type] || 'Sensor';

      const previousAlertType = sensorData.current_alert_type; // Tipo de alerta actual en la DB (campo existente)
      const previousSensorDbStatus = sensorData.status; // Estado del sensor que está en la DB

      // --- LÓGICA DE DETECCIÓN DE CONDICIONES DE ALERTA ---

      // A. Alerta por Cambio de Estado (status_change)
      if (currentSimulatedStatus && currentSimulatedStatus !== previousSensorDbStatus) {
        alertDetected = true;
        alertTypeForDb = 'status_change';
        alertPriority = 'medium';
        alertTitle = `Cambio de Estado: ${sensorTypeSpanish}`;
        alertMessage = `El sensor ${sensorData.name} (${sensorData.type}) cambió de estado de '${previousSensorDbStatus}' a '${currentSimulatedStatus}'.`;
        console.log(`[DEBUG] Condición: CAMBIO DE ESTADO. Sensor ${sensorData.name}, de ${previousSensorDbStatus} a ${currentSimulatedStatus}`);
      }
      // B. Alerta por Problema de Datos (data_issue) - si el valor es null y el estado es activo
      else if (reading.value === null && currentSimulatedStatus === 'active') {
        alertDetected = true;
        alertTypeForDb = 'data_issue';
        alertPriority = 'high';
        alertTitle = `Problema de Datos: ${sensorTypeSpanish}`;
        alertMessage = `El sensor ${sensorData.name} (${sensorData.type}) está activo pero no reporta un valor válido. Posible problema de conexión o lectura.`;
        console.log(`[DEBUG] Condición: PROBLEMA DE DATOS. Sensor ${sensorData.name} está activo pero valor es NULL.`);
      }
      // C. Alerta por Umbral (threshold) - solo si el valor es numérico y no hubo alerta de cambio de estado/data_issue
      else if (typeof reading.value === 'number' && sensorData.thresholds && Object.keys(sensorData.thresholds).length > 0) {
        const value = reading.value;
        const thresholds = sensorData.thresholds;
        let severity = null;

        // Prioridad: Crítica (critical)
        if (value < thresholds.criticalMin || value > thresholds.criticalMax) {
          severity = 'critical';
          alertTitle = `${sensorTypeSpanish} Crítica ${value < thresholds.criticalMin ? 'Baja' : 'Alta'}`;
          alertMessage = `¡Valor crítico ${value < thresholds.criticalMin ? 'bajo' : 'alto'}! El sensor ${sensorData.name} (${sensorData.type}) reporta ${value} ${sensorData.unit}, fuera del rango crítico [${thresholds.criticalMin}-${thresholds.criticalMax}] ${sensorData.unit}.`;
          alertPriority = 'high';
        }
        // Prioridad: Advertencia (warning)
        else if (
          (value >= thresholds.criticalMin && value < thresholds.normalMin) ||
          (value > thresholds.normalMax && value <= thresholds.criticalMax)
        ) {
          severity = 'warning';
          alertTitle = `${sensorTypeSpanish} Advertencia ${value < thresholds.normalMin ? 'Baja' : 'Alta'}`;
          alertMessage = `¡Advertencia de valor ${value < thresholds.normalMin ? 'bajo' : 'alto'}! El sensor ${sensorData.name} (${sensorData.type}) reporta ${value} ${sensorData.unit}, fuera del rango normal [${thresholds.normalMin}-${thresholds.normalMax}] ${sensorData.unit}, pero dentro del rango crítico [${thresholds.criticalMin}-${thresholds.criticalMax}] ${sensorData.unit}.`;
          alertPriority = 'medium';
        }

        if (severity) {
          alertDetected = true;
          alertTypeForDb = 'threshold';
          console.log(`[DEBUG] Condición: Umbral ${severity}. Valor: ${value}`);
        } else {
          console.log(`[DEBUG] Valor ${value} está DENTRO del rango normal para ${sensorData.name}. No se requiere alerta de umbral.`);
        }
      } else if (typeof reading.value === 'number' && (!sensorData.thresholds || Object.keys(sensorData.thresholds).length === 0)) {
        console.log(`[DEBUG] Sensor ${sensorData.name} no tiene umbrales definidos o están vacíos. No se verifican umbrales.`);
      }


      // --- LÓGICA PARA GESTIONAR LA CREACIÓN/RESOLUCIÓN DE ALERTAS ---

      if (alertDetected) {
        // Si hay una condición de alerta actual
        if (previousAlertType === alertTypeForDb) {
          // La misma condición de alerta persiste, no creamos una nueva alerta en la tabla 'alerts'.
          // Solo actualizamos el estado del sensor (handled below).
          console.log(`[${new Date().toLocaleTimeString()}] La condición de alerta '${alertTypeForDb}' para el sensor ${sensorData.name} persiste. No se creará una nueva alerta en 'alerts'.`);
        } else {
          // La condición de alerta ha cambiado o es una nueva alerta de un tipo diferente.
          // Primero, resolver cualquier alerta activa anterior para este sensor (de cualquier tipo)
          if (previousAlertType) { // Si había una alerta activa previa
            console.log(`[${new Date().toLocaleTimeString()}] La condición de alerta anterior ('${previousAlertType}') para el sensor ${sensorData.name} ha sido reemplazada. Resolviendo alerta(s) antigua(s)...`);
            const { error: deactivateError } = await supabase
              .from('alerts') // Usar el nombre de tabla 'alerts' en minúsculas
              .update({ status: 'resolved', resolved_time: new Date().toISOString() }) // Usar resolved_time
              .eq('sensor_id', sensorData.id) // Usar sensor_id
              .eq('status', 'active'); // Solo las que están activas

            if (deactivateError) {
              console.error(`[${new Date().toLocaleTimeString()}] Error al desactivar alertas previas para sensor ${sensorData.name}:`, deactivateError.message);
            } else {
                console.log(`[${new Date().toLocaleTimeString()}] Alerta(s) anterior(es) para el sensor ${sensorData.name} resuelta(s).`);
            }
          }

          // Crear la nueva alerta en la tabla 'alerts'
          const { error: insertAlertError } = await supabase
            .from('alerts') // Usar el nombre de tabla 'alerts' en minúsculas
            .insert({
              organization_id: sensorData.organization_id, // Tomar del sensor
              sensor_id: sensorData.id, // Usar sensor_id
              asset_id: sensorData.asset_id, // Tomar del sensor, puede ser null
              type: alertTypeForDb,
              title: alertTitle,
              description: alertMessage, // Este es el campo de mensaje de la alerta
              priority: alertPriority,
              value_at_alert: typeof reading.value === 'number' ? reading.value : null, // Nuevo campo
              // Llenar solo los campos de umbral relevantes para tu estructura de BD
              threshold_normal_min: sensorData.thresholds?.normalMin || null,
              threshold_normal_max: sensorData.thresholds?.normalMax || null,
              threshold_critical_min: sensorData.thresholds?.criticalMin || null,
              threshold_critical_max: sensorData.thresholds?.criticalMax || null,
              status: 'active', // Nueva alerta, siempre activa
              alert_time: new Date().toISOString() // Usar alert_time
            });

          if (insertAlertError) {
            console.error(`[${new Date().toLocaleTimeString()}] ERROR al crear nueva alerta para sensor ${sensorData.name}:`, insertAlertError.message);
          } else {
            console.log(`[${new Date().toLocaleTimeString()}] Alerta '${alertTypeForDb}' creada exitosamente para ${sensorData.name}.`);

            // Opcional: Insertar en alert_history si es necesario (descomentar y adaptar)
            // const { error: historyError } = await supabase.from('alert_history').insert({
            //   alert_id: insertedAlert[0].id,
            //   change_type: 'created',
            //   new_value: JSON.stringify({ type: alertTypeForDb, title: alertTitle }),
            //   // changed_by: (puedes obtener el ID de un usuario de sistema si existe)
            // });
            // if (historyError) console.error('Error al insertar en alert_history:', historyError.message);
          }
        }

        // 3. Actualizar el estado de alerta del sensor en la tabla 'sensors'
        // CORREGIDO: Eliminado 'alert_triggered_at' y 'alert_value_at_trigger'
        const { error: updateSensorAlertStateError } = await supabase
          .from('sensors') // Usar el nombre de tabla 'sensors' en minúsculas
          .update({
            current_alert_type: alertTypeForDb,
            // Ya no se actualiza 'last_alert_message' en 'sensors'
          })
          .eq('id', sensorData.id);

        if (updateSensorAlertStateError) {
          console.error(`[${new Date().toLocaleTimeString()}] Error al actualizar el estado de alerta del sensor ${sensorData.id}:`, updateSensorAlertStateError.message);
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] Estado de alerta del sensor ${sensorData.id} (current_alert_type) actualizado.`);
        }

      } else {
        // NO se detectó ninguna condición de alerta en esta lectura
        if (previousAlertType) {
          // Si había una alerta activa previamente, significa que la condición ha desaparecido
          console.log(`[${new Date().toLocaleTimeString()}] La condición de alerta '${previousAlertType}' para el sensor ${sensorData.name} ha desaparecido. Resolviendo alerta(s)...`);

          // Actualizar el estado de las alertas activas en la tabla 'alerts' a 'resolved'
          const { error: resolveError } = await supabase
            .from('alerts') // Usar el nombre de tabla 'alerts' en minúsculas
            .update({ status: 'resolved', resolved_time: new Date().toISOString() }) // Usar resolved_time
            .eq('sensor_id', sensorData.id) // Usar sensor_id
            .eq('status', 'active');

          if (resolveError) {
            console.error(`[${new Date().toLocaleTimeString()}] Error al resolver alerta(s) para sensor ${sensorData.name}:`, resolveError.message);
          } else {
            console.log(`[${new Date().toLocaleTimeString()}] Alerta(s) para el sensor ${sensorData.name} resuelta(s) exitosamente.`);
          }

          // Limpiar el estado de alerta del sensor en la tabla 'sensors'
          // CORREGIDO: Eliminado 'alert_triggered_at' y 'alert_value_at_trigger'
          const { error: clearSensorAlertStateError } = await supabase
            .from('sensors') // Usar el nombre de tabla 'sensors' en minúsculas
            .update({
              current_alert_type: null,
              // Ya no se actualiza 'last_alert_message' en 'sensors'
            })
            .eq('id', sensorData.id);

          if (clearSensorAlertStateError) {
            console.error(`[${new Date().toLocaleTimeString()}] Error al limpiar el estado de alerta del sensor ${sensorData.id}:`, clearSensorAlertStateError.message);
          } else {
            console.log(`[${new Date().toLocaleTimeString()}] Estado de alerta del sensor ${sensorData.id} (current_alert_type) limpiado.`);
          }
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] No se detectó ninguna alerta y no había una previa para el sensor ${sensorData.name}.`);
        }
      }

      // --- Actualizar el sensor en la tabla 'sensors' con la última lectura y estado ---
      // Esta actualización debe ocurrir independientemente de la lógica de alertas
      const updateDataForSensorTable = sensorUpdates.find(s => s.id === reading.sensor_id);
      if (updateDataForSensorTable) {
        console.log(`[${new Date().toLocaleTimeString()}] Actualizando campos 'last_value', 'last_unit', 'last_reading_timestamp', 'status', 'last_communication' para sensor ${updateDataForSensorTable.id}`);
        const { error: updateSensorError } = await supabase
          .from('sensors') // Usar el nombre de tabla 'sensors' en minúsculas
          .update({
            last_value: updateDataForSensorTable.value,
            last_unit: updateDataForSensorTable.unit,
            last_reading_timestamp: updateDataForSensorTable.lastReading, // Se usó lastReading en el simulador
            status: updateDataForSensorTable.status,
            last_communication: updateDataForSensorTable.lastReading // También actualizar last_communication
          })
          .eq('id', updateDataForSensorTable.id);

        if (updateSensorError) {
          console.error(`[${new Date().toLocaleTimeString()}] Error al actualizar sensor ${updateDataForSensorTable.id}:`, updateSensorError.message);
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] Sensor ${updateDataForSensorTable.id} actualizado exitosamente.`);
        }
      }

      // --- Inserción de la lectura en 'sensor_readings' (solo si el valor es numérico) ---
      if (typeof reading.value === 'number') {
        console.log(`[${new Date().toLocaleTimeString()}] Intentando insertar lectura en ${APP_DB_SCHEMA}.sensor_readings...`);
        const { data: insertedReading, error: insertReadingError } = await supabase
          .from('sensor_readings') // Usar el nombre de tabla 'sensor_readings' en minúsculas
          .insert({
            sensor_id: reading.sensor_id,
            value: reading.value,
            timestamp: reading.timestamp,
            unit: reading.unit
          })
          .select();

        if (insertReadingError) {
          console.error(`[${new Date().toLocaleTimeString()}] ERROR SUPABASE en la inserción de sensor_readings para ${reading.sensor_id}:`, insertReadingError);
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] Inserción en sensor_readings exitosa para ${reading.sensor_id}.`);
        }
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] Lectura de sensor ${reading.sensor_id} con valor nulo. No se inserta en sensor_readings.`);
      }
    } // Fin del bucle forEach sobre readingsToProcess

    // --- Respuesta final ---
    return {
      status: 'success',
      message: `${readingsToProcess.length} lecturas procesadas para alertas y actualizaciones de estado y guardado en sensor_readings.`,
      data: readingsToProcess
    };

  } catch (err) {
    console.error('Error general en server route de ingesta de sensores:', err);
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || `Error interno del servidor: ${err.message || 'Detalles no disponibles.'}`,
      data: err.data || {}
    });
  }
});
