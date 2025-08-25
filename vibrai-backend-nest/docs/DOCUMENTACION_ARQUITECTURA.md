# Documentación de Arquitectura - Vibrai Backend Service

## Índice
1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Servicios y Componentes](#servicios-y-componentes)
4. [Flujo de Datos](#flujo-de-datos)
5. [Base de Datos](#base-de-datos)
6. [Configuración](#configuración)
7. [Análisis y Alertas](#análisis-y-alertas)
8. [Manejo de Errores](#manejo-de-errores)

## Visión General

El **Vibrai Backend Service** es una aplicación Node.js que procesa datos de sensores IoT en tiempo real, realizando análisis de vibración y temperatura para sistemas de monitoreo industrial. La aplicación recibe datos a través de MQTT, los procesa, almacena en base de datos y genera alertas basadas en umbrales configurables.

### Características Principales
- **Procesamiento en tiempo real** de datos de sensores
- **Análisis automático** de vibración y temperatura
- **Sistema de alertas** con múltiples niveles de prioridad
- **Monitoreo de conectividad** de dispositivos
- **Arquitectura modular** y escalable
- **Manejo robusto de errores** y recuperación automática

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    VIBRAI BACKEND SERVICE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐ │
│  │   MQTT      │    │    MAIN      │    │   SUPABASE      │ │
│  │  BROKER     │◄──►│   SERVICE    │◄──►│   DATABASE      │ │
│  │             │    │              │    │                 │ │
│  └─────────────┘    └──────┬───────┘    └─────────────────┘ │
│                             │                               │
│                             ▼                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   SERVICIOS                             │ │
│  ├─────────────┬─────────────┬─────────────┬─────────────┤ │
│  │   PAYLOAD   │  ANALYSIS   │   ALERT     │ CONNECTIVITY│ │
│  │   SERVICE   │   SERVICE   │   SERVICE   │   SERVICE   │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Principales

1. **Application Layer** (`app.js`): Punto de entrada y manejo del ciclo de vida
2. **Main Service** (`main.service.js`): Orquestador principal de todos los servicios
3. **Service Layer**: Servicios especializados para cada funcionalidad
4. **Configuration Layer**: Manejo de configuración y variables de entorno

## Servicios y Componentes

### 1. Application (`src/app.js`)

**Responsabilidad**: Punto de entrada de la aplicación y manejo del ciclo de vida.

**Funcionalidades**:
- Inicialización de la aplicación
- Manejo de señales del sistema (SIGTERM, SIGINT)
- Cierre limpio de la aplicación
- Manejo de excepciones no capturadas
- Monitoreo de salud de la aplicación

```javascript
// Estructura básica
class Application {
  constructor() {
    this.mainService = new MainService();
    this.setupSignalHandlers();
  }
  
  async start() { /* Inicia todos los servicios */ }
  setupSignalHandlers() { /* Maneja señales del sistema */ }
  keepAlive() { /* Monitorea la salud de la aplicación */ }
}
```

### 2. Main Service (`src/main.service.js`)

**Responsabilidad**: Orquestador principal que coordina todos los servicios.

**Funcionalidades**:
- Inicialización y coordinación de servicios
- Procesamiento de mensajes MQTT
- Agrupamiento y procesamiento de lecturas
- Guardado de datos en base de datos
- Ejecución de análisis y generación de alertas

**Métodos Principales**:
- `start()`: Inicializa todos los servicios
- `handleMqttMessage()`: Procesa mensajes MQTT entrantes
- `processReadingGroup()`: Procesa grupos de lecturas por tipo
- `saveVibrationReadings()`: Guarda lecturas de vibración
- `saveReading()`: Guarda lecturas de temperatura

### 3. MQTT Service (`src/services/mqtt.service.js`)

**Responsabilidad**: Manejo de la comunicación MQTT.

**Funcionalidades**:
- Conexión al broker MQTT
- Suscripción a tópicos
- Manejo de reconexión automática
- Procesamiento de mensajes entrantes

**Configuración**:
- Broker: `mqtt://direct.miobox.io`
- Tópicos: `Advantech/#`
- Reconexión automática habilitada

### 4. Payload Service (`src/services/payload.service.js`)

**Responsabilidad**: Procesamiento y extracción de datos de los payloads MQTT.

**Funcionalidades**:
- Parseo de mensajes JSON
- Extracción de lecturas de sensores
- Agrupamiento de lecturas por tipo
- Validación de estructura de datos

**Métodos Principales**:
- `processPayload()`: Procesa el payload completo
- `extractSensorReadings()`: Extrae lecturas individuales
- `groupReadingsByType()`: Agrupa lecturas por tipo de sensor

### 5. Database Service (`src/services/database.service.js`)

**Responsabilidad**: Interacción con la base de datos Supabase.

**Funcionalidades**:
- Conexión a Supabase
- Operaciones CRUD en tablas
- Métodos especializados para cada tipo de lectura
- Manejo de errores de base de datos

**Métodos Principales**:
- `saveVibrationReading()`: Guarda lecturas de vibración
- `saveTemperatureReading()`: Guarda lecturas de temperatura
- `updateSensorStatus()`: Actualiza estado de sensores
- `saveAnalysisResult()`: Guarda resultados de análisis

### 6. Analysis Service (`src/services/analysis.service.js`)

**Responsabilidad**: Análisis de datos de sensores y generación de insights.

**Funcionalidades**:
- Análisis de vibración (detección de picos, cálculo de estadísticas)
- Análisis de temperatura (detección de anomalías)
- Clasificación de estados (Normal, Advertencia, Crítico)
- Cálculo de métricas estadísticas

**Tipos de Análisis**:
- **Vibración**: Análisis de picos, RMS, Kurtosis, Factor de Cresta
- **Temperatura**: Detección de valores fuera de rango

### 7. Alert Service (`src/services/alert.service.js`)

**Responsabilidad**: Gestión del sistema de alertas.

**Funcionalidades**:
- Creación y actualización de alertas
- Manejo de prioridades (Low, Medium, High)
- Persistencia de alertas
- Escalamiento de alertas

**Tipos de Alertas**:
- `vibration`: Alertas de vibración
- `temperature`: Alertas de temperatura
- `connectivity`: Alertas de conectividad
- `battery`: Alertas de batería baja
- `data_issue`: Problemas con datos
- `status_change`: Cambios de estado de sensores

### 8. Connectivity Service (`src/services/connectivity.service.js`)

**Responsabilidad**: Monitoreo de conectividad de dispositivos.

**Funcionalidades**:
- Seguimiento de última actividad de sensores
- Detección de dispositivos desconectados
- Actualización automática de estados
- Generación de alertas de conectividad

**Configuración**:
- Timeout: 15 minutos
- Intervalo de verificación: 5 minutos

### 9. Device Service (`src/services/device.service.js`)

**Responsabilidad**: Gestión de información de dispositivos.

**Funcionalidades**:
- Obtención de información de sensores
- Mapeo de códigos de dispositivo a IDs
- Gestión de metadatos de dispositivos

## Flujo de Datos

### 1. Recepción de Datos
```
MQTT Broker → MQTT Service → Main Service
```

### 2. Procesamiento de Payload
```
Main Service → Payload Service → Extracción de Lecturas
```

### 3. Agrupamiento y Clasificación
```
Payload Service → Agrupamiento por Tipo → Lecturas Clasificadas
```

### 4. Guardado en Base de Datos
```
Main Service → Database Service → Supabase
```

### 5. Análisis de Datos
```
Main Service → Analysis Service → Resultados de Análisis
```

### 6. Generación de Alertas
```
Analysis Service → Alert Service → Alertas Persistidas
```

### 7. Monitoreo de Conectividad
```
Connectivity Service → Verificación Periódica → Alertas de Conectividad
```

## Base de Datos

### Estructura de Tablas

#### `sensors`
- `id`: UUID (Primary Key)
- `name`: Nombre del sensor
- `device_code`: Código del dispositivo
- `type`: Tipo de sensor (vibration/temperature)
- `status`: Estado actual
- `last_reading_at`: Última lectura recibida

#### `vibration_readings`
- `id`: UUID (Primary Key)
- `sensor_id`: UUID (Foreign Key)
- `axis`: Eje de medición (X, Y, Z)
- `oa_velocity`: Velocidad Overall
- `peak_mg`: Pico en mg
- `rms_mg`: RMS en mg
- `kurtosis`: Kurtosis
- `crest_factor`: Factor de Cresta
- `skewness`: Asimetría
- `deviation`: Desviación
- `peak_to_peak_displacement`: Desplazamiento pico a pico
- `timestamp`: Timestamp de la lectura

#### `temperature_readings`
- `id`: UUID (Primary Key)
- `sensor_id`: UUID (Foreign Key)
- `value`: Valor de temperatura
- `timestamp`: Timestamp de la lectura

#### `analysis_results`
- `id`: UUID (Primary Key)
- `sensor_id`: UUID (Foreign Key)
- `reading_type`: Tipo de lectura analizada
- `status`: Estado resultante del análisis
- `details`: Detalles del análisis (JSON)
- `timestamp`: Timestamp del análisis

#### `alerts`
- `id`: UUID (Primary Key)
- `sensor_id`: UUID (Foreign Key)
- `type`: Tipo de alerta
- `priority`: Prioridad de la alerta
- `message`: Mensaje de la alerta
- `is_active`: Estado de la alerta
- `created_at`: Timestamp de creación
- `updated_at`: Timestamp de actualización

## Configuración

### Variables de Entorno

```env
# Base de datos
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MQTT
MQTT_BROKER_URL=mqtt://direct.miobox.io

# Aplicación
NODE_ENV=development
TZ=America/Santiago
```

### Constantes del Sistema

```javascript
// Umbrales de análisis
SPIKE_THRESHOLD_MULTIPLIER: 5
SPIKE_MIN_ABSOLUTE_VALUE: 20.0

// Conectividad
CONNECTIVITY_TIMEOUT_MINUTES: 15
CONNECTIVITY_CHECK_INTERVAL_MINUTES: 5

// Batería
LOW_BATTERY_THRESHOLD_VOLT: 3.2
```

## Factores de Conversión y Procesamiento de Datos

### Conversión de Datos del Sensor

El sistema aplica factores de conversión específicos para normalizar los datos recibidos de los sensores a unidades estándar:

#### Datos de Vibración
- **OAVelocity**: División por 100 (convierte a mm/s)
- **Peak y RMS**: División condicional por 100 o 1000 según el valor
- **Kurtosis**: División por 100
- **CrestFactor**: División por 100  
- **Skewness**: División por 100
- **Deviation**: División por 100

#### Datos de Temperatura
- **TempHumi.SenVal**: División por 1000 (convierte a °C)

### Ubicación de la Conversión

Los factores de conversión se aplican en <mcfile name="payload.service.js" path="/Users/maser/Documents/vibrai-backend-nest/src/services/payload.service.js"></mcfile> durante el procesamiento del payload, manteniendo los datos originales en <mcfile name="funtion.js" path="/Users/maser/Documents/vibrai-backend-nest/funtion.js"></mcfile> sin modificaciones.

## Análisis y Alertas

### Sistema de Análisis

#### Análisis de Vibración según ISO 10816
El sistema utiliza los umbrales estándar de la norma ISO 10816 para clasificar el estado de vibración:

- **Normal**: ≤ 2.3 mm/s
- **Alerta**: ≤ 4.5 mm/s  
- **Precaución**: ≤ 9.0 mm/s
- **Peligro**: > 9.0 mm/s

#### Detección de Picos Anómalos
- **Umbral Mínimo**: 0.2 mm/s (ajustado para valores convertidos)
- **Multiplicador**: 5x el valor anterior
- **Aplicación**: Solo para lecturas de OAVelocity

#### Análisis de Vibración Personalizado
- **Perfiles Personalizados**: Basados en configuración específica del asset
- **Perfiles ISO**: Basados en grupo ISO y tipo de rigidez
- **Fallback**: Si el perfil personalizado es "Indeterminado", se utiliza el análisis ISO

#### Análisis de Temperatura
- **Detección de Rangos**: Identifica valores fuera de rangos operativos
- **Umbrales por Defecto**: 
  - Normal: 0°C a 60°C
  - Crítico: -10°C a 80°C
- **Alertas por Umbral**: Genera alertas cuando se superan límites

### Sistema de Alertas

#### Tipos de Alertas
1. **Vibración**: Basadas en análisis de vibración
2. **Temperatura**: Basadas en análisis de temperatura
3. **Conectividad**: Dispositivos desconectados
4. **Batería**: Batería baja en dispositivos
5. **Datos**: Problemas con calidad de datos
6. **Estado**: Cambios de estado de sensores

#### Prioridades
- **Low**: Informativas, no requieren acción inmediata
- **Medium**: Requieren atención, pero no son críticas
- **High**: Requieren acción inmediata

#### Escalamiento
- Las alertas pueden escalar en prioridad si persisten
- Se evita spam de alertas mediante debouncing
- Las alertas se resuelven automáticamente cuando las condiciones mejoran

## Manejo de Errores

### Estrategias de Recuperación

1. **Reconexión MQTT**: Reconexión automática al broker
2. **Reintentos de Base de Datos**: Reintentos automáticos en operaciones fallidas
3. **Logging Detallado**: Logs estructurados para debugging
4. **Graceful Shutdown**: Cierre limpio de la aplicación
5. **Health Checks**: Monitoreo continuo de la salud del sistema

### Logging

El sistema utiliza logging estructurado con prefijos para facilitar el debugging:

```
[MQTT] - Eventos relacionados con MQTT
[PAYLOAD] - Procesamiento de payloads
[READINGS] - Procesamiento de lecturas
[DATABASE] - Operaciones de base de datos
[ANALYSIS] - Resultados de análisis
[ALERTS] - Gestión de alertas
[CONNECTIVITY] - Monitoreo de conectividad
[APP] - Eventos de aplicación
```

## Despliegue y Escalabilidad

### Docker
La aplicación incluye configuración Docker para facilitar el despliegue:

```dockerfile
# Dockerfile incluido para containerización
# docker-compose.yml para orquestación
```

### Escalabilidad
- **Arquitectura Modular**: Servicios independientes y reutilizables
- **Stateless Design**: No mantiene estado entre requests
- **Database Pooling**: Conexiones eficientes a base de datos
- **Async Processing**: Procesamiento asíncrono de datos

### Monitoreo
- Health checks integrados
- Métricas de rendimiento
- Alertas de sistema
- Logging centralizado

---

## Conclusión

El Vibrai Backend Service es una solución robusta y escalable para el monitoreo de sensores IoT en tiempo real. Su arquitectura modular permite fácil mantenimiento y extensión, mientras que su sistema de análisis y alertas proporciona insights valiosos para el mantenimiento predictivo de equipos industriales.