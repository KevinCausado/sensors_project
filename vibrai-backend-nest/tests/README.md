# Tests - Suite de Pruebas Vibrai Backend

Esta carpeta contiene todas las pruebas, scripts de testing y utilidades de desarrollo para el sistema Vibrai Backend.

## 📋 Índice de Pruebas

### 🔬 Pruebas de Funcionalidad Core

#### Procesamiento de Datos
- **`test-complete-processing.js`** - Prueba completa del flujo de procesamiento MQTT
- **`test-complete-db-write.js`** - Verificación de escritura completa en base de datos
- **`test-real-payload.js`** - Prueba con payloads reales de sensores

#### Temperatura
- **`test-temperature-conversion.js`** - Conversión de valores de temperatura
- **`test-temperature-processing.js`** - Procesamiento completo de datos de temperatura
- **`test-temperature-db-write.js`** - Escritura de temperatura en base de datos
- **`test-temperature-validation.js`** - Validación de datos de temperatura
- **`test-final-temperature-conversion.js`** - Prueba final de conversión

#### Vibración
- **`test-peak-displacement.js`** - Prueba de métricas de desplazamiento pico
- **`test-batch-insertion.js`** - Prueba de inserción en bloque optimizada

### ⏱️ Pruebas de Consistencia Temporal

- **`test-timestamp-consistency.js`** - Verificación de consistencia de timestamps
- **`test-database-timestamp-consistency.js`** - Consistencia hasta nivel de base de datos
- **`monitor-real-timestamps.js`** - Monitoreo de timestamps en datos reales
- **`verify-sensor-separation.js`** - Verificación de separación de datos por sensor

### 🚀 Pruebas de Rendimiento

- **`performance-comparison.js`** - Comparación inserción individual vs bloque
  - Inserción Individual: ~528ms
  - Inserción en Bloque: ~171ms
  - **Mejora: 67.6% más rápido (3.1x)**

### 🔧 Pruebas de Servicios y Correcciones

- **`test-basic-analysis-behavior.js`** - Prueba del comportamiento básico del análisis
- **`test-corrected-services.js`** - Prueba de servicios corregidos (versión simple)
- **`test-corrected-services-root.js`** - Prueba de servicios corregidos (versión completa)
- **`test-final-verification.js`** - Verificación final del sistema
- **`test-refactored-services-comparison.js`** - Comparación de servicios refactorizados

### 🛠️ Utilidades de Testing y Debugging

- **`get-real-sensor.js`** - Obtiene información de sensores reales de la BD
- **`test-mqtt-payload-simulator.js`** - Simulador MQTT para generar payloads de prueba
- **`test-mqtt-real-analyzer.js`** - Analizador en tiempo real de mensajes MQTT reales
- **`debug-vibration-extraction.js`** - Debugging de extracción de datos de vibración
- **`mqtt-payload-simulator.js`** - Simulador de payloads MQTT
- **`mqtt-simulator.js`** - Simulador MQTT general

## 🏃‍♂️ Cómo Ejecutar las Pruebas

### Desde la raíz del proyecto:

```bash
# Pruebas básicas de funcionalidad
node tests/test-complete-processing.js
node tests/test-temperature-conversion.js
node tests/test-timestamp-consistency.js

# Pruebas de rendimiento
node tests/performance-comparison.js

# Monitoreo de datos reales
node tests/monitor-real-timestamps.js
node tests/verify-sensor-separation.js

# Utilidades
node tests/get-real-sensor.js

# Herramientas MQTT
node tests/test-mqtt-payload-simulator.js
node tests/test-mqtt-real-analyzer.js
```

### Desde la carpeta tests:

```bash
cd tests

# Ajustar las rutas de require en los archivos
# Cambiar: require('./src/...')
# Por: require('../src/...')

node test-complete-processing.js
```

## 📊 Resultados de Pruebas Clave

### Optimización de Inserción en Bloque
```
Inserción Individual:  528ms (3 llamadas separadas)
Inserción en Bloque:   171ms (1 llamada)
Mejora:                67.6% más rápido
Factor de velocidad:   3.1x más rápido
```

### Consistencia de Timestamps
```
✅ Todos los ejes (X, Y, Z) comparten el mismo timestamp MQTT
✅ Consistencia verificada hasta nivel de base de datos
✅ Separación correcta de datos por sensor
```

### Conversión de Temperatura
```
✅ Conversión correcta: milésimas → grados Celsius
✅ Precisión: 2 decimales exactos
✅ Validación de rangos: -40°C a 85°C
```

## 🔧 Configuración de Pruebas

### Variables de Entorno Requeridas
```bash
SUPABASE_URL=tu_url_supabase
SUPABASE_ANON_KEY=tu_key_supabase
```

### Dependencias
- Todas las pruebas usan los servicios del directorio `../src/services/`
- Conexión real a Supabase para pruebas de base de datos
- Algunos tests requieren sensores existentes en la BD

## 📝 Notas Importantes

1. **Datos Reales**: Algunas pruebas insertan datos reales en la base de datos
2. **Cleanup**: Los tests no limpian automáticamente los datos insertados
3. **Sensores**: Usar `get-real-sensor.js` para obtener UUIDs válidos
4. **Timestamps**: Los tests generan timestamps únicos para evitar conflictos

## 🐛 Debugging

### Logs Detallados
Los tests incluyen logging detallado para debugging:
- `[DATABASE]` - Operaciones de base de datos
- `[PAYLOAD]` - Procesamiento de payloads
- `[READINGS]` - Procesamiento de lecturas
- `[ANALYSIS]` - Análisis de datos

### Errores Comunes
- **UUID inválido**: Usar `get-real-sensor.js` para obtener UUIDs reales
- **Conexión BD**: Verificar variables de entorno
- **Esquema**: Verificar que las columnas existan en Supabase

## 📈 Métricas de Cobertura

- ✅ Procesamiento MQTT completo
- ✅ Conversión de datos de temperatura
- ✅ Inserción de datos de vibración
- ✅ Consistencia temporal
- ✅ Optimización de rendimiento
- ✅ Validación de datos
- ✅ Separación por sensor

---

**Suite de pruebas completa para garantizar la calidad del sistema Vibrai** 🧪✅