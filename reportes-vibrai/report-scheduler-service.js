// services/report-scheduler.js
// Este servicio se encarga de ejecutar tareas programadas, como el envío de informes.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const nodemailer = require('nodemailer'); 
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { Chart } = require('chart.js');
const { Cron } = require('croner');

// Importamos Puppeteer
const puppeteer = require('puppeteer'); 

// --- 1. Configuración y Conexión ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan las variables de entorno de Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Servicio de Reportes Programados iniciado.');

// --- 2. Tarea Programada Principal (se ejecuta cada minuto) ---
// cron.schedule('*/5 * * * * *', async () => {
cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Verificando tareas programadas...`);
  try {
    const { data: schedules, error } = await supabase
      .from('report_schedules')
      .select(`*, config:report_configurations!inner(*)`)
      .eq('is_active', true)
      .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`);

    if (error) {
      console.error('Error al consultar las tareas programadas:', error);
      return;
    }

    if (schedules && schedules.length > 0) {
      console.log(` -> Se encontraron ${schedules.length} tareas para ejecutar.`);
      // Se procesan las tareas de forma secuencial para evitar condiciones de carrera.
      for (const schedule of schedules) {
        await executeTask(schedule);
      }
    } else {
      console.log(' -> No hay tareas pendientes en este momento.');
    }
  } catch (e) {
    console.error('Error fatal en el ciclo principal del cron:', e.message);
  }
});

/**
 * Ejecuta una tarea programada específica, siguiendo el patrón "actualizar primero".
 * @param {object} schedule - El objeto de la tarea programada.
 */
async function executeTask(schedule) {
  console.log(`  -> Procesando la tarea "${schedule.name}" (ID: ${schedule.id})`);

  try {
    const now = new Date();    
  
    const job = new Cron(schedule.cron_schedule, { maxRuns: 1 }); 
    const nextRun = job.nextRun();

    if (!nextRun) {
      throw new Error(`No se pudo calcular la próxima ejecución para el cron: ${schedule.cron_schedule}`);
    }

    console.log(`    -> Reprogramando la tarea para después de: ${nextRun.toISOString()}`);
    
    const { error } = await supabase
      .from('report_schedules')
      .update({ 
        last_run_at: now.toISOString(), 
        next_run_at: nextRun.toISOString() 
      })
      .eq('id', schedule.id);

    if (error) {
      throw new Error(`Error al reprogramar la tarea en la DB: ${error.message}`);
    }
    console.log(`    -> Tarea reprogramada con éxito en la base de datos.`);
  } catch (e) {
    console.error(`  !! Falló la reprogramación para la tarea "${schedule.name}". Se saltará la ejecución actual. Error:`, e.message);
    return; 
  }
  
  try {
    console.log(`    -> Ejecutando el proceso de envío de informe...`);
    if (schedule.process_name === 'enviar_informe_activo') {
      await sendConsolidatedAssetReport(schedule);
    } else {
      console.warn(`    -> Proceso desconocido: "${schedule.process_name}"`);
    }
    console.log(`  -> Proceso de envío para "${schedule.name}" completado.`);
  } catch (e) {
    console.error(`  !! Error durante la ejecución del informe para "${schedule.name}":`, e.message);
  }
}

/**
 * Envía un informe consolidado de activos por correo electrónico.
 * @param {object} schedule - El objeto de la tarea programada.
 */
async function sendConsolidatedAssetReport(schedule) {
  // Obtener todos los activos y sus organizaciones
  const { data: assets, error } = await supabase.from('assets_base').select(`*, organization:organizations!fk_assets_base_organizations(name)`);
  if (error) throw new Error(`No se pudieron obtener los activos: ${error.message}`);

  if (!assets || assets.length === 0) {
    console.log('    -> No hay activos para generar informes. Saltando envío.');
    return;
  }

  const attachments = [];
  for (const asset of assets) {
    try {
      // Generar el PDF para cada activo
      const pdfBuffer = await createAssetReportPDF(asset);
      attachments.push({
        filename: `Reporte_${asset.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    } catch (e) {
      console.error(`      !! Falló la generación de PDF para el activo "${asset.name}": ${e.message}`);
    }
  }

  // Enviar el correo si se generaron adjuntos
  if (attachments.length > 0) {
    const subject = schedule.subject || `Reporte Consolidado de Estado de Activos`;
    await sendEmailWithAttachments({ schedule, attachments, subject });
  } else {
    console.log('    -> No se generaron informes válidos, no se enviará correo.');
  }
}

/**
 * Envía un correo electrónico con adjuntos utilizando Nodemailer.
 * @param {object} params - Parámetros del correo.
 * @param {object} params.schedule - El objeto de la tarea programada.
 * @param {Array<object>} params.attachments - Array de adjuntos (buffers de PDF).
 * @param {string} params.subject - Asunto del correo.
 */
async function sendEmailWithAttachments({ schedule, attachments, subject }) {
  const config = schedule.config;
  if (!config) {
    throw new Error('La tarea no tiene una configuración de correo asociada o no se pudo obtener.');
  }

  // 1. Obtener la contraseña DESENCRIPTADA usando la función RPC.
  console.log(`      - Obteniendo contraseña encriptada para: ${config.name}`);
  const { data: senderPassword, error: rpcError } = await supabase.rpc('get_decrypted_smtp_password', {
    p_config_id: config.id
  });

  if (rpcError) {
    throw new Error(`Error al desencriptar la contraseña: ${rpcError.message}`);
  }
  if (!senderPassword) {
    throw new Error(`No se encontró una contraseña encriptada para la configuración ${config.id}. Asegúrate de haberla guardado desde la interfaz.`);
  }

  console.log(`      - Contraseña desencriptada. Usando configuración de correo: ${config.name}`);

  // 2. Crear el transportador de Nodemailer con la contraseña desencriptada.
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.sender_email,
      pass: senderPassword, // Usamos la contraseña desencriptada
    },
  });

  // 3. Enviar el correo.
  const mailOptions = {
    from: `"${config.name}" <${config.sender_email}>`,
    to: schedule.recipients.join(', '),
    cc: schedule.cc_recipients?.join(', '),
    bcc: schedule.bcc_recipients?.join(', '),
    subject: subject,
    html: `
            <p>Hola,</p>
            <p>Se adjuntan los informes de estado de activos generados automáticamente.</p>
            <p><b>Tarea programada:</b> ${schedule.name}</p>
            <p><b>Fecha de generación:</b> ${new Date().toLocaleString('es-CO')}</p>
            <p><b>Total de informes adjuntos:</b> ${attachments.length}</p>
            <br>
            <p><i>Este es un correo generado automáticamente, por favor no responder.</i></p>
        `,
    attachments: attachments,
  };

  await transporter.sendMail(mailOptions);
  console.log('    -> Correo consolidado enviado con éxito.');
}

// Caché para perfiles de vibración (para evitar múltiples llamadas a la DB)
const vibrationProfilesCache = {};

/**
 * Obtiene el perfil de vibración para un activo, ya sea ISO o personalizado.
 * @param {string} assetId - ID del activo.
 * @returns {Promise<object|null>} - El perfil de vibración con sus rangos.
 */
async function getVibrationProfileForAsset(assetId) {
  if (vibrationProfilesCache[assetId]) return vibrationProfilesCache[assetId];

  const { data: assetData } = await supabase.from('assets_base').select('iso_group_id, custom_vibration_profile_id, rigidity_type_id').eq('id', assetId).single();
  if (!assetData) return null;

  let ranges = [];
  if (assetData.custom_vibration_profile_id) {
    // Si tiene un perfil personalizado, obtener sus rangos
    const { data: customRanges } = await supabase.from('custom_vibration_ranges').select('severity, min_value, max_value').eq('custom_profile_id', assetData.custom_vibration_profile_id);
    ranges = customRanges || [];
  } else if (assetData.iso_group_id) {
    // Si tiene un grupo ISO, obtener los rangos ISO correspondientes
    const { data: isoRanges } = await supabase.from('vibration_ranges').select('severity, min_value, max_value').eq('iso_groups_id', assetData.iso_group_id).eq('rigidity_id', assetData.rigidity_type_id);
    ranges = isoRanges || [];
  }

  vibrationProfilesCache[assetId] = { ranges };
  return { ranges };
}

/**
 * Corrige el estado de vibración basándose en el perfil y los valores de los ejes.
 * @param {object} reading - Resultado del análisis de vibración.
 * @param {object} profile - Perfil de vibración (ISO o personalizado).
 * @returns {string} - El estado de vibración corregido.
 */
function getCorrectedVibrationStatus(reading, profile) {
  if (!profile || !profile.ranges || profile.ranges.length === 0 || !reading.axes_values) return reading.final_status;

  const highestValue = Math.max(reading.axes_values.x || 0, reading.axes_values.y || 0, reading.axes_values.z || 0);

  for (const range of profile.ranges) {
    if (highestValue >= range.min_value && highestValue <= range.max_value) {
      switch (range.severity) {
        case 'A':
        case 'B':
          return 'Normal';
        case 'C':
          return 'Precaución';
        case 'D':
          return 'Peligro';
        default:
          return 'No Definido';
      }
    }
  }
  return 'No Definido';
}

/**
 * Determina el estado general del activo a partir de una lista de estados.
 * @param {Array<string>} statuses - Lista de estados individuales del activo.
 * @returns {string} - El estado general consolidado.
 */
function getOverallAssetStatus(statuses) {
  if (!statuses || statuses.length === 0) return 'No Determinado';

  const statusSeverity = {
    'Crítico': 5,
    'critico': 5, // Para manejar posibles variaciones en mayúsculas/minúsculas
    'Peligro': 4,
    'Precaucion': 3,
    'Precaución': 3,
    'Alerta': 2,
    'Normal': 1,
    'No Definido': 0
  };

  let overallStatus = 'No Definido';
  let maxSeverity = -1;

  for (const status of statuses) {
    const severity = statusSeverity[status] || 0;
    if (severity > maxSeverity) {
      maxSeverity = severity;
      overallStatus = status;
    }
  }

  // Normalizar la salida para consistencia
  const translations = { 'Precaucion': 'Precaución', 'Critico': 'Crítico', 'critico': 'Crítico' };
  return translations[overallStatus] || overallStatus;
}

/**
 * Genera recomendaciones y un análisis detallado para el informe del activo.
 * @param {object} asset - El objeto del activo.
 * @param {string} overallStatus - El estado general del activo.
 * @param {Array<object>} alarms - Lista de alarmas del activo.
 * @param {object} monthlyAverages - Promedios mensuales de vibración y temperatura.
 * @returns {{recommendations: string, analysis: string}} - Objeto con recomendaciones y análisis.
 */
function generateRecommendationsAndAnalysis(asset, overallStatus, alarms, monthlyAverages) {
  let recommendations = [];
  let analysis = [];

  // Análisis basado en el estado general
  switch (overallStatus) {
    case 'Peligro':
    case 'Crítico':
      recommendations.push("Acción inmediata requerida. Realizar una inspección detallada del activo y planificar una parada para mantenimiento correctivo urgente. Considerar la posibilidad de daños permanentes.");
      analysis.push(`El estado general del activo es '${overallStatus}', lo que indica niveles de vibración o temperatura que exceden drásticamente los umbrales de seguridad y pueden causar fallas inminentes. Es imperativo investigar la causa raíz de forma prioritaria.`);
      break;
    case 'Alerta':
    case 'Precaución':
      recommendations.push("Monitorear el activo de cerca y programar una inspección detallada en la próxima ventana de mantenimiento programado. Investigar las alarmas activas para identificar la causa de la desviación.");
      analysis.push(`El activo presenta un estado de '${overallStatus}', indicando una desviación de las condiciones normales de operación. Se recomienda una revisión de los parámetros operativos y una evaluación de posibles desgastes o desajustes.`);
      break;
    case 'Normal':
      recommendations.push("Continuar con el monitoreo de rutina según el plan de mantenimiento predictivo. No se requieren acciones inmediatas. Mantener la vigilancia para detectar cualquier cambio futuro.");
      analysis.push("El activo opera dentro de los parámetros normales esperados. Los niveles de vibración y temperatura son aceptables, lo que indica un buen estado operativo y de conservación.");
      break;
    default:
      recommendations.push("No hay suficientes datos para una recomendación clara. Asegurar que los sensores estén comunicando correctamente y revisar la configuración del activo.");
      analysis.push("No se pudo determinar un estado general para el activo debido a la falta de datos recientes o inconsistencias. Se requiere una verificación de la comunicación de los sensores.");
  }

  // Análisis basado en alarmas activas
  const activeHighPriorityAlarms = alarms.filter(a => a.status !== 'resolved' && a.priority === 'high');
  if (activeHighPriorityAlarms.length > 0) {
    analysis.push(`Se han detectado ${activeHighPriorityAlarms.length} alarma(s) de alta prioridad sin resolver. La alarma más reciente es: "${activeHighPriorityAlarms[0].description}". Esto sugiere un problema continuo que requiere atención.`);
    if (activeHighPriorityAlarms.some(a => a.description.toLowerCase().includes('temperatura'))) {
      recommendations.push("Verificar el sistema de refrigeración, posibles problemas de lubricación o fricción excesiva debido a las alarmas de temperatura. Realizar termografías si es posible.");
    }
    if (activeHighPriorityAlarms.some(a => a.description.toLowerCase().includes('vibración'))) {
      recommendations.push("Investigar posibles causas de alta vibración como desbalanceo, desalineación, holguras o problemas en rodamientos. Considerar un análisis de espectro de vibración.");
    }
  }

  // Análisis de tendencias mensuales
  const { vibration, temperature } = monthlyAverages;
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  if (vibration && vibration.length >= 3) {
    // Ordenar por mes y tomar los últimos 3 meses
    const sortedVibData = vibration.sort((a, b) => {
      // Comparar por año primero, luego por mes
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    }).slice(-3);

    if (sortedVibData.length === 3) {
      const vibValues = sortedVibData.map(v => v.avg_oavelocity);
      const vibMonths = sortedVibData.map(v => monthNames[v.month -1]); // Restar 1 porque los meses de la DB son 1-12 y los nombres son 0-11

      if (vibValues[2] > vibValues[1] && vibValues[1] > vibValues[0]) {
        analysis.push(`Se observa una tendencia ascendente en los niveles de vibración durante los últimos tres meses (${vibMonths[0]}, ${vibMonths[1]}, ${vibMonths[2]}). Esto podría ser un indicio temprano de desbalanceo, desalineación o deterioro de rodamientos, lo que justifica una investigación proactiva.`);
        recommendations.push("Prestar especial atención a la tendencia de vibración. Considerar realizar un análisis espectral detallado si la tendencia ascendente persiste o se acelera.");
      } else if (vibValues[2] < vibValues[1] && vibValues[1] < vibValues[0]) {
        analysis.push(`Se observa una tendencia descendente en los niveles de vibración durante los últimos tres meses (${vibMonths[0]}, ${vibMonths[1]}, ${vibMonths[2]}). Esto es positivo y sugiere que las condiciones están mejorando o se ha realizado un mantenimiento efectivo.`);
      }
    }
  }

  if (temperature && temperature.length >= 3) {
    // Ordenar por mes y tomar los últimos 3 meses
    const sortedTempData = temperature.sort((a, b) => {
      // Comparar por año primero, luego por mes
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    }).slice(-3);

    if (sortedTempData.length === 3) {
      const tempValues = sortedTempData.map(t => t.avg_value);
      const tempMonths = sortedTempData.map(t => monthNames[t.month -1]);

      if (tempValues[2] > tempValues[1] && tempValues[1] > tempMonths[0]) {
        analysis.push(`Se detecta una tendencia ascendente en la temperatura durante los últimos tres meses (${tempMonths[0]}, ${tempMonths[1]}, ${tempMonths[2]}). Esto puede indicar problemas de lubricación, un sistema de refrigeración ineficiente o un aumento de la fricción interna en el activo.`);
        recommendations.push("Realizar una revisión del sistema de lubricación y refrigeración. Monitorear la temperatura con mayor frecuencia y buscar puntos calientes con termografía.");
      } else if (tempValues[2] < tempValues[1] && tempValues[1] < tempMonths[0]) {
        analysis.push(`Se observa una tendencia descendente en la temperatura durante los últimos tres meses (${tempMonths[0]}, ${tempMonths[1]}, ${tempMonths[2]}). Esto es una señal positiva, indicando condiciones operativas estables o mejoras en el sistema.`);
      }
    }
  }

  return {
    recommendations: recommendations.join('\n\n') || 'No se requieren recomendaciones específicas en este momento. El activo está en condiciones óptimas.',
    analysis: analysis.join('\n\n') || 'No se han encontrado observaciones notables. El activo opera según lo esperado y sin tendencias preocupantes.'
  };
}


/**
 * Genera un PDF de informe para un activo específico utilizando Puppeteer.
 * @param {object} asset - El objeto del activo con sus detalles.
 * @returns {Promise<Buffer>} - Un buffer que contiene el PDF generado.
 */
async function createAssetReportPDF(asset) {
  // --- Obtener datos del activo ---
  const { data: sensors, error: sensorError } = await supabase.from('sensors').select('id, name, type, thresholds').eq('asset_id', asset.id);
  if (sensorError) throw new Error(`Error al obtener sensores: ${sensorError.message}`);

  const { data: recentAnalyses, error: analysisError } = await supabase.from('analysis_results').select('*').eq('asset_id', asset.id).gte('analysis_timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  if (analysisError) throw new Error(`Error al obtener resultados de análisis: ${analysisError.message}`);

  const profile = await getVibrationProfileForAsset(asset.id);
  const correctedStatuses = (recentAnalyses || []).map(analysis => {
    const sensor = sensors.find(s => s.id === analysis.sensor_id);
    if (sensor && sensor.type && sensor.type.toLowerCase().includes('vibration')) {
      return getCorrectedVibrationStatus(analysis, profile);
    }
    return analysis.final_status;
  });
  const overallStatus = getOverallAssetStatus(correctedStatuses);

  const { data: alarms, error: alarmError } = await supabase.from('alerts').select('alert_time, status, description, value_at_alert, priority, type').eq('asset_id', asset.id).order('alert_time', { ascending: false }).limit(10);

  const vibrationSensors = sensors?.filter(s => s.type && s.type.toLowerCase().includes('vibration')) || [];
  const temperatureSensors = sensors?.filter(s => s.type && s.type.toLowerCase().includes('temperature')) || [];

  const { data: vibrationAverages } = await supabase.rpc('get_monthly_vibration_averages', { p_sensor_ids: vibrationSensors.map(s => s.id) });
  const { data: temperatureAverages } = await supabase.rpc('get_monthly_temperature_averages', { p_sensor_ids: temperatureSensors.map(s => s.id) });

  const { recommendations, analysis } = generateRecommendationsAndAnalysis(asset, overallStatus, alarms || [], { vibration: vibrationAverages, temperature: temperatureAverages });

  // --- Generar HTML para el PDF ---

  // Helper para generar el HTML de una celda de encabezado
  const getHeaderCellHtml = (label, value, valueBgColor = '#FFFFFF', valueTextColor = 'black') => {
    // Aseguramos que el div de valor ocupe el espacio restante para que el color no quede corto
    return `
      <div style="display: flex; border: 1px solid #B0B0B0; height: 20px;">
        <div style="width: 80px; background-color: #EFEFEF; padding: 3px 5px; font-weight: bold; font-size: 9px; display: flex; align-items: center; padding-right: 10px;">${label}</div>
        <div style="flex-grow: 1; background-color: ${valueBgColor}; color: ${valueTextColor}; padding: 3px 5px; font-size: 9px; display: flex; align-items: center;">${value || 'N/A'}</div>
      </div>
    `;
  };

  // Helper para generar el HTML de la tabla de alarmas
  const getAlarmsTableHtml = (alarmsData) => {
    if (!alarmsData || alarmsData.length === 0) {
      return `<p style="text-align: center; color: gray; font-size: 10px;">No hay alarmas reportadas para este activo.</p>`;
    }

    const rowsHtml = alarmsData.map(a => {
      let acuseBgColor = '';
      let acuseTextColor = 'black';
      if (a.status === 'resolved') {
        acuseBgColor = '#008000'; // Verde oscuro
        acuseTextColor = '#FFFFFF'; // Texto blanco
      } else {
        acuseBgColor = '#FF0000'; // Rojo
        acuseTextColor = '#FFFFFF'; // Texto blanco
      }

      let nivelBgColor = '';
      let nivelTextColor = 'black';
      switch (a.priority) {
        case 'high':
          nivelBgColor = '#FF0000'; // Rojo
          nivelTextColor = '#FFFFFF'; // Texto blanco
          break;
        case 'medium':
          nivelBgColor = '#FFA500'; // Naranja
          nivelTextColor = '#000000'; // Texto negro para contraste
          break;
        case 'low':
          nivelBgColor = '#008000'; // Verde
          nivelTextColor = '#FFFFFF'; // Texto blanco
          break;
        default:
          break;
      }

      return `
        <tr>
          <td style="width: 100px;">${new Date(a.alert_time).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td style="width: 60px; background-color: ${acuseBgColor}; color: ${acuseTextColor};">${a.status === 'resolved' ? 'Acusado' : 'Aviso'}</td>
          <td style="width: 200px;">${a.type ? `(${a.type}) ` : ''}${String(a.description || 'Sin descripción').trim()}</td>
          <td style="width: 80px;">${a.value_at_alert !== null ? `${a.value_at_alert.toFixed(3)}` : ''}</td>
          <td style="width: 80px; background-color: ${nivelBgColor}; color: ${nivelTextColor};">
            ${(() => {
              switch (a.priority) {
                case 'high': return 'Alta';
                case 'medium': return 'Media';
                case 'low': return 'Baja';
                default: return 'N/A';
              }
            })()}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #EFEFEF;">
            <th style="width: 100px; border: 1px solid #B0B0B0; padding: 5px; font-size: 9px;">Fecha</th>
            <th style="width: 60px; border: 1px solid #B0B0B0; padding: 5px; font-size: 9px;">Acuse</th>
            <th style="width: 200px; border: 1px solid #B0B0B0; padding: 5px; font-size: 9px;">Descripción</th>
            <th style="width: 80px; border: 1px solid #B0B0B0; padding: 5px; font-size: 9px;">Valor Referencia</th>
            <th style="width: 80px; border: 1px solid #B0B0B0; padding: 5px; font-size: 9px;">Nivel de Alarma</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  };

  // Helper para generar el HTML de los gráficos (como imágenes base64)
  const getChartHtml = async (sensors, monthlyAverages, valueField, yAxisMax, lineColor, pointColor, pointBorderColor, title) => {
    if (!sensors || sensors.length === 0 || !monthlyAverages || monthlyAverages.length === 0) {
      return `<div style="width: 250px; height: 180px; display: flex; align-items: center; justify-content: center; color: gray; font-size: 10px; text-align: center;">No hay datos históricos de ${title.toLowerCase().includes('vibraciones') ? 'vibración' : 'temperatura'} disponibles para este activo.</div>`;
    }

    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1; // Mes actual (1-12)
    const currentYear = now.getUTCFullYear(); // Año actual

    const monthsToDisplay = [];
    for (let i = 2; i >= 0; i--) { // Iteramos para obtener los últimos 3 meses
      let month = currentMonth - i;
      let year = currentYear;
      if (month <= 0) {
        month += 12; // Si el mes es 0 o negativo, vamos al año anterior
        year -= 1;
      }
      monthsToDisplay.push({ month, year });
    }

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const getAvg = (sensorId, month, year) => {
      const record = monthlyAverages?.find(r => r.sensor_id === sensorId && r.month === month && r.year === year);
      return record ? parseFloat(record[valueField]) : 0;
    };

    const chartData = {
      labels: sensors.map(s => s.name),
      datasets: [
        {
          type: 'bar',
          label: `${monthNames[monthsToDisplay[0].month - 1]}`, // Solo el mes para los dos primeros
          data: sensors.map(s => getAvg(s.id, monthsToDisplay[0].month, monthsToDisplay[0].year)),
          backgroundColor: '#A9CCE3',
          order: 1
        },
        {
          type: 'bar',
          label: `${monthNames[monthsToDisplay[1].month - 1]}`, // Solo el mes para los dos primeros
          data: sensors.map(s => getAvg(s.id, monthsToDisplay[1].month, monthsToDisplay[1].year)),
          backgroundColor: '#D5D8DC',
          order: 1
        },
        {
          type: 'line',
          label: `${monthNames[monthsToDisplay[2].month - 1]} ${now.getUTCDate()}`, // Mes y día actual para el último mes
          data: sensors.map(s => getAvg(s.id, monthsToDisplay[2].month, monthsToDisplay[2].year)),
          borderColor: lineColor,
          borderWidth: 1.5,
          backgroundColor: 'transparent',
          pointBackgroundColor: pointColor,
          pointStyle: 'rect',
          radius: 4,
          pointBorderWidth: 1,
          pointBorderColor: pointBorderColor,
          fill: false,
          tension: 0,
          order: 2
        }
      ]
    };

    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 260, height: 180, backgroundColour: '#FFFFFF' });
    const configuration = {
      type: 'bar',
      data: chartData,
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: yAxisMax,
            ticks: { stepSize: yAxisMax / 5, font: { size: 8 } },
            grid: { color: '#CCCCCC' }
          },
          x: {
            ticks: { font: { size: 8 } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 9 },
              boxWidth: 15,
              padding: 10,
              usePointStyle: true
            }
          }
        }
      }
    };
    const chartBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    const chartBase64 = chartBuffer.toString('base64');

    return `
      <div style="text-align: center;">
        <img src="data:image/png;base64,${chartBase64}" style="width: 250px; height: 180px;"/>
        <p style="font-size: 8px; font-style: italic; margin-top: 5px;">${title}</p>
      </div>
    `;
  };

  // Obtener umbrales máximos para vibración
  let maxVibrationThreshold = 25;
  if (vibrationSensors.length > 0) {
    const highestCriticalLevel = Math.max(...vibrationSensors.map(s => s.thresholds?.critical_level || 0));
    if (highestCriticalLevel > 0) {
      maxVibrationThreshold = highestCriticalLevel * 1.2;
    }
  }

  // Obtener umbrales máximos para temperatura
  let maxTemperatureThreshold = 100;
  if (temperatureSensors.length > 0) {
    const highestCriticalMax = Math.max(...temperatureSensors.map(s => s.thresholds?.criticalMax || 0));
    if (highestCriticalMax > 0) {
      maxTemperatureThreshold = highestCriticalMax * 1.2;
    }
  }

  const vibrationChartHtml = await getChartHtml(vibrationSensors, vibrationAverages, 'avg_oavelocity', maxVibrationThreshold, '#000000', '#E74C3C', '#000000', 'Nivel de Vibraciones (mm/s)');
  const temperatureChartHtml = await getChartHtml(temperatureSensors, temperatureAverages, 'avg_value', maxTemperatureThreshold, '#E74C3C', '#E74C3C', '#000000', 'Nivel de Temperatura (°C)');

  const hasVibrationData = vibrationSensors.length > 0 && vibrationAverages && vibrationAverages.length > 0;
  const hasTemperatureData = temperatureSensors.length > 0 && temperatureAverages && temperatureAverages.length > 0;

  const chartsSectionHtml = `
    ${(hasVibrationData || hasTemperatureData) ? `
      <h2 style="text-align: center; font-size: 12px; font-weight: bold; margin-top: 20px;">Perfil histórico de sensores</h2>
      <div style="display: flex; justify-content: space-around; margin-top: 10px;">
        ${vibrationChartHtml}
        ${temperatureChartHtml}
      </div>
    ` : ''}
  `;

  // Colores para "Estado General"
  let overallStatusColor = '#C6EFCE'; // Verde claro por defecto (Normal)
  let overallStatusTextColor = 'black';

  if (overallStatus === 'Crítico' || overallStatus === 'Peligro') {
    overallStatusColor = '#FF0000'; // Rojo
    overallStatusTextColor = 'white';
  } else if (overallStatus === 'Alerta' || overallStatus === 'Precaución') {
    overallStatusColor = '#FFA500'; // Naranja
    overallStatusTextColor = 'black';
  } else if (overallStatus === 'No Determinado') { // Nuevo caso para "No Determinado"
    overallStatusColor = '#D3D3D3'; // Gris claro
    overallStatusTextColor = 'black';
  }


  // Construir el HTML completo
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte de Activo - ${asset.name}</title>
        <style>
            body { font-family: 'Helvetica', sans-serif; margin: 30px; font-size: 10px; }
            .header-grid { 
                display: grid; 
                grid-template-columns: auto auto; 
                gap: 30px; 
                margin-bottom: 20px; 
                justify-content: space-between;
            }
            .section-title { text-align: center; font-size: 12px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
            .section-subtitle { text-align: center; font-size: 8px; font-style: italic; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #B0B0B0; padding: 5px; font-size: 8px; text-align: left; vertical-align: middle; }
            th { background-color: #EFEFEF; font-weight: bold; }
            .box-container { margin-top: 20px; border: 1px solid black; padding: 10px; }
            .box-title { font-size: 12px; font-weight: bold; margin-bottom: 5px; }
            p { margin-bottom: 5px; line-height: 1.4; }
            /* --- INICIO: AJUSTE PARA EVITAR CORTES --- */
            .report-section { 
                page-break-inside: avoid; /* Evita que esta sección se divida entre páginas */
            }
            /* --- FIN: AJUSTE PARA EVITAR CORTES --- */
        </style>
    </head>
    <body>
        <div class="header-grid">
            <div>
                ${getHeaderCellHtml('Área Proceso', asset.location || 'N/A')}
                ${getHeaderCellHtml('Equipo', asset.name)}
                ${getHeaderCellHtml('Empresa', asset.organization?.name || 'N/A')}
            </div>
            <div>
                ${getHeaderCellHtml('Fecha del Informe', new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }))}
                ${getHeaderCellHtml('Estado Actual', asset.is_active ? 'Activo' : 'Inactivo', asset.is_active ? '#C6EFCE' : '#FFC7CE', 'black')}
                ${getHeaderCellHtml('Estado General', overallStatus, overallStatusColor, overallStatusTextColor)}
            </div>
        </div>

        <h2 class="section-title">Alarmas</h2>
        <p class="section-subtitle">Lista de las últimas 10 alarmas reportadas para el activo</p>
        ${getAlarmsTableHtml(alarms)}

        ${chartsSectionHtml}
      
        <div class="report-section">
            <h2 class="section-title" style="margin-top: 30px;">Recomendaciones</h2>
            <div class="box-container">
                <p>${recommendations.replace(/\n/g, '<br>')}</p>
            </div>
        </div>

        <div class="report-section">
            <h2 class="section-title">Observaciones / Análisis Avanzado</h2>
            <div class="box-container">
                <p>${analysis.replace(/\n/g, '<br>')}</p>
            </div>
        </div>        
    </body>
    </html>
  `;

  // --- Generar PDF con Puppeteer ---
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Establecer el contenido HTML
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // Espera hasta que la red esté inactiva

    // Generar el PDF
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true, // Imprimir colores de fondo y imágenes
      margin: {
        top: '30px',
        right: '30px',
        bottom: '30px',
        left: '30px'
      }
    });

    await browser.close();
    return pdfBuffer;

  } catch (error) {
    console.error('Error al generar el PDF con Puppeteer:', error);
    if (browser) {
      await browser.close();
    }
    throw new Error(`Fallo la generación del PDF: ${error.message}`);
  }
}
