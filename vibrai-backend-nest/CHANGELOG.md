# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [1.2.0] - 2025-01-08

### Agregado
- Factores de conversión para normalizar datos de sensores a unidades estándar
- Documentación detallada de factores de conversión en `docs/DOCUMENTACION_ARQUITECTURA.md`
- Documentación actualizada de payload con ejemplos de valores convertidos
- Análisis mejorado con umbrales ISO 10816 correctos

### Cambiado
- **Factores de conversión en `payload.service.js`**:
  - OAVelocity: División por 100 (convierte a mm/s)
  - Peak y RMS: División condicional por 100 o 1000
  - Kurtosis, CrestFactor, Skewness, Deviation: División por 100
  - TempHumi.SenVal: División por 1000 (convierte a °C)

- **Umbrales de análisis en `analysis.service.js`**:
  - Restaurados umbrales ISO 10816 originales (2.3, 4.5, 9.0 mm/s)
  - Ajustado umbral mínimo de detección de picos a 0.2 mm/s

- **Lógica de determinación de estado final**:
  - Mejorado fallback cuando perfil personalizado es "Indeterminado"
  - Priorización correcta entre análisis de perfil e ISO

### Corregido
- Clasificación incorrecta de valores de vibración normales como "Precaución"
- Umbrales ISO 10816 incorrectamente divididos por 100
- Detección de picos con valores muy pequeños después de conversión
- Análisis que no fallback correctamente a ISO cuando perfil es indeterminado

### Técnico
- Separación de responsabilidades: conversión en `payload.service.js`, análisis en `analysis.service.js`
- Mantenimiento de datos originales en `funtion.js` sin modificaciones
- Mejora en logs para debugging de conversiones y análisis
- Actualización de constantes en `constants.js` para nuevos rangos de valores

## [1.1.0] - Versiones anteriores

### Funcionalidades base
- Procesamiento de datos MQTT en tiempo real
- Sistema de análisis de vibración y temperatura
- Generación de alertas automáticas
- Monitoreo de conectividad de dispositivos
- Integración con base de datos Supabase