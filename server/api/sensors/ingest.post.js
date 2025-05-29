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
    const readingsToSave = [];
    const sensorUpdates = [];

    const processSingleReading = (item) => {
      if (item.sensorId) {
        readingsToSave.push({
          sensorId: item.sensorId,
          value: typeof item.value === 'number' ? parseFloat(item.value.toFixed(2)) : null,
          timestamp: new Date().toISOString()
        });
        sensorUpdates.push({
          id: item.sensorId,
          status: item.sensorStatus || 'active',
          value: typeof item.value === 'number' ? parseFloat(item.value.toFixed(2)) : null,
          lastReading: new Date().toISOString()
        });
      }
    };

    if (Array.isArray(body)) {
      body.forEach(processSingleReading);
    } else {
      processSingleReading(body);
    }

    if (readingsToSave.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No se encontraron lecturas válidas para guardar.' });
    }

    // --- Inserción de lecturas (solo valores numéricos válidos) ---
    const validReadingsForDb = readingsToSave.filter(r => typeof r.value === 'number');

    if (validReadingsForDb.length > 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Intentando insertar ${validReadingsForDb.length} lecturas válidas en ${APP_DB_SCHEMA}.SensorReadings...`);
      const { data: insertedReadings, error: insertError } = await supabase
        .from('SensorReadings')
        .insert(validReadingsForDb)
        .select();

      if (insertError) {
        console.error(`[${new Date().toLocaleTimeString()}] ERROR SUPABASE en la inserción de SensorReadings:`, insertError);
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] Inserción en SensorReadings exitosa. Data:`, insertedReadings);
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] No hay lecturas numéricas válidas para insertar en SensorReadings.`);
    }

    // --- Lógica de Verificación de Umbrales y Disparo de Alertas ---
    for (const reading of readingsToSave) {
      console.log(`\n--- Procesando lectura: ${reading.sensorId} ---`);
      console.log(`Valor de lectura: ${reading.value}, Estado simulado: ${sensorUpdates.find(s => s.id === reading.sensorId)?.status}`);

      // 1. Obtener los detalles completos del sensor, incluyendo los nuevos campos de estado de alerta
      const { data: sensorData, error: fetchSensorError } = await supabase
        .from('Sensors')
        .select('id, name, type, unit, thresholds, status, current_alert_type, alert_triggered_at, alert_value_at_trigger') // Agregamos los nuevos campos
        .eq('id', reading.sensorId)
        .single();

      if (fetchSensorError) {
        if (fetchSensorError.code === 'PGRST116') {
          console.warn(`[${new Date().toLocaleTimeString()}] Sensor ID ${reading.sensorId} no encontrado. No se puede verificar.`);
        } else {
          console.error(`[${new Date().toLocaleTimeString()}] Error al obtener sensor ${reading.sensorId}:`, fetchSensorError.message);
        }
        continue;
      }

      let alertDetected = false;
      let alertMessage = '';
      let alertPriority = 'low';
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
        'default': sensorData.type ? sensorData.type.charAt(0).toUpperCase() + sensorData.type.slice(1) : 'Sensor'
      }[sensorData.type] || 'Sensor';

      const currentSimulatedStatus = sensorUpdates.find(s => s.id === reading.sensorId)?.status || 'active';
      const previousSensorDbStatus = sensorData.status; // Estado del sensor que está en la DB
      const previousAlertType = sensorData.current_alert_type; // Tipo de alerta actual en la DB
      const previousAlertTriggeredAt = sensorData.alert_triggered_at ? new Date(sensorData.alert_triggered_at) : null;

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
      else if (typeof reading.value === 'number' && sensorData.thresholds) {
        const value = reading.value;
        const thresholds = sensorData.thresholds;
        let severity = null;

        if (value < thresholds.criticalMin || value > thresholds.criticalMax) {
          severity = 'critical';
          alertTitle = `${sensorTypeSpanish} Crítica ${value < thresholds.criticalMin ? 'Baja' : 'Alta'}`;
          alertMessage = `¡Valor crítico ${value < thresholds.criticalMin ? 'bajo' : 'alto'}! El sensor ${sensorData.name} (${sensorData.type}) reporta ${value} ${sensorData.unit}, fuera del rango crítico [${thresholds.criticalMin}-${thresholds.criticalMax}] ${sensorData.unit}.`;
          alertPriority = 'high';
        } else if (value < thresholds.min || value > thresholds.max) {
          severity = 'warning';
          alertTitle = `${sensorTypeSpanish} Advertencia ${value < thresholds.min ? 'Baja' : 'Alta'}`;
          alertMessage = `¡Advertencia de valor ${value < thresholds.min ? 'bajo' : 'alto'}! El sensor ${sensorData.name} (${sensorData.type}) reporta ${value} ${sensorData.unit}, fuera del rango de advertencia [${thresholds.min}-${thresholds.max}] ${sensorData.unit}.`;
          alertPriority = 'medium';
        } else if (
          (thresholds.normalMin !== undefined && value < thresholds.normalMin) ||
          (thresholds.normalMax !== undefined && value > thresholds.normalMax)
        ) {
          severity = 'info';
          alertTitle = `${sensorTypeSpanish} Fuera de Rango Normal`;
          alertMessage = `El sensor ${sensorData.name} (${sensorData.type}) reporta ${value} ${sensorData.unit}, fuera del rango normal [${thresholds.normalMin}-${thresholds.normalMax}] ${sensorData.unit}.`;
          alertPriority = 'low';
        }

        if (severity) {
          alertDetected = true;
          alertTypeForDb = 'threshold';
          console.log(`[DEBUG] Condición: UMbral ${severity}. Valor: ${value}`);
        } else {
          console.log(`[DEBUG] Valor ${value} está DENTRO de todos los umbrales definidos para ${sensorData.name}.`);
        }
      }

      // --- LÓGICA PARA GESTIONAR LA CREACIÓN/RESOLUCIÓN DE ALERTAS ---
      if (alertDetected) {
        // Si hay una condición de alerta actual
        if (previousAlertType === alertTypeForDb) {
          // La misma condición de alerta persiste, no creamos una nueva alerta en la tabla 'Alerts'
          console.log(`[${new Date().toLocaleTimeString()}] La condición de alerta '${alertTypeForDb}' para el sensor ${sensorData.name} persiste. No se creará una nueva alerta en 'Alerts'.`);
          // Opcional: podrías actualizar el 'updated_at' de la alerta activa si quieres mantenerla "fresca"
          // o enviar una notificación "recordatorio" después de mucho tiempo si es crítico.
        } else {
          // La condición de alerta ha cambiado o es una nueva alerta.
          // Primero, resolver cualquier alerta activa anterior para este sensor (de cualquier tipo)
          if (previousAlertType) { // Si había una alerta activa previa
            console.log(`[${new Date().toLocaleTimeString()}] La condición de alerta anterior ('${previousAlertType}') para el sensor ${sensorData.name} ha sido reemplazada. Resolviendo alerta(s) antigua(s)...`);
            const { error: deactivateError } = await supabase
              .from('Alerts')
              .update({ status: 'resolved', resolvedAt: new Date().toISOString() })
              .eq('sensorId', sensorData.id)
              .eq('status', 'active'); // Solo las que están activas

            if (deactivateError) {
              console.error(`[${new Date().toLocaleTimeString()}] Error al desactivar alertas previas para sensor ${sensorData.name}:`, deactivateError.message);
            }
          }

          // Crear la nueva alerta en la tabla 'Alerts'
          const { error: insertAlertError } = await supabase
            .from('Alerts')
            .insert({
              sensorId: sensorData.id,
              type: alertTypeForDb,
              title: alertTitle,
              message: alertMessage,
              priority: alertPriority,
              value_at_alert: typeof reading.value === 'number' ? reading.value : null,
              threshold_min: sensorData.thresholds?.min || null,
              threshold_max: sensorData.thresholds?.max || null,
              threshold_critical_min: sensorData.thresholds?.criticalMin || null,
              threshold_critical_max: sensorData.thresholds?.criticalMax || null,
              threshold_normal_min: sensorData.thresholds?.normalMin || null,
              threshold_normal_max: sensorData.thresholds?.normalMax || null,
              status: 'active', // Nueva alerta, siempre activa
            });

          if (insertAlertError) {
            console.error(`[${new Date().toLocaleTimeString()}] ERROR al crear nueva alerta para sensor ${sensorData.name}:`, insertAlertError.message);
          } else {
            console.log(`[${new Date().toLocaleTimeString()}] Alerta '${alertTypeForDb}' creada exitosamente para ${sensorData.name}.`);
          }
        }

        // Actualizar el estado de alerta del sensor en la tabla 'Sensors'
        const { error: updateSensorAlertStateError } = await supabase
          .from('Sensors')
          .update({
            current_alert_type: alertTypeForDb,
            alert_triggered_at: new Date().toISOString(),
            alert_value_at_trigger: typeof reading.value === 'number' ? reading.value : null,
            last_alert_message: alertMessage // Guardar el mensaje para fácil acceso
          })
          .eq('id', sensorData.id);

        if (updateSensorAlertStateError) {
          console.error(`[${new Date().toLocaleTimeString()}] Error al actualizar el estado de alerta del sensor ${sensorData.id}:`, updateSensorAlertStateError.message);
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] Estado de alerta del sensor ${sensorData.id} actualizado.`);
        }

      } else {
        // NO se detectó ninguna condición de alerta en esta lectura
        if (previousAlertType) {
          // Si había una alerta activa previamente, significa que la condición ha desaparecido
          console.log(`[${new Date().toLocaleTimeString()}] La condición de alerta '${previousAlertType}' para el sensor ${sensorData.name} ha desaparecido. Resolviendo alerta(s)...`);

          // Actualizar el estado de las alertas activas en la tabla 'Alerts' a 'resolved'
          const { error: resolveError } = await supabase
            .from('Alerts')
            .update({ status: 'resolved', resolvedAt: new Date().toISOString() })
            .eq('sensorId', sensorData.id)
            .eq('status', 'active');

          if (resolveError) {
            console.error(`[${new Date().toLocaleTimeString()}] Error al resolver alerta(s) para sensor ${sensorData.name}:`, resolveError.message);
          } else {
            console.log(`[${new Date().toLocaleTimeString()}] Alerta(s) para el sensor ${sensorData.name} resuelta(s) exitosamente.`);
          }

          // Limpiar el estado de alerta del sensor en la tabla 'Sensors'
          const { error: clearSensorAlertStateError } = await supabase
            .from('Sensors')
            .update({
              current_alert_type: null,
              alert_triggered_at: null,
              alert_value_at_trigger: null,
              last_alert_message: null
            })
            .eq('id', sensorData.id);

          if (clearSensorAlertStateError) {
            console.error(`[${new Date().toLocaleTimeString()}] Error al limpiar el estado de alerta del sensor ${sensorData.id}:`, clearSensorAlertStateError.message);
          } else {
            console.log(`[${new Date().toLocaleTimeString()}] Estado de alerta del sensor ${sensorData.id} limpiado.`);
          }
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] No se detectó ninguna alerta y no había una previa para el sensor ${sensorData.name}.`);
        }
      }

      // 3. Actualizar el sensor en la tabla 'Sensors' con la última lectura y estado
      // Esta actualización debe ocurrir independientemente de la lógica de alertas
      const updateData = sensorUpdates.find(s => s.id === reading.sensorId);
      if (updateData) {
        console.log(`[${new Date().toLocaleTimeString()}] Actualizando sensor ${updateData.id} con estado: ${updateData.status} y valor: ${updateData.value}`);
        const { error: updateSensorError } = await supabase
          .from('Sensors')
          .update({
            value: updateData.value,
            lastReading: updateData.lastReading,
            status: updateData.status
          })
          .eq('id', updateData.id);

        if (updateSensorError) { 
          console.error(`[${new Date().toLocaleTimeString()}] Error al actualizar sensor ${updateData.id}:`, updateSensorError.message);
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] Sensor ${updateData.id} actualizado exitosamente.`);
        }
      }
    }

    // --- Respuesta final ---
    return {
      status: 'success',
      message: `${readingsToSave.length} lecturas procesadas para alertas y actualizaciones de estado.`,
      data: readingsToSave
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