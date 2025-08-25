# Diagrama de Flujo de Servicios - Vibrai Backend

## Flujo Principal de Datos

```mermaid
graph TD
    A[MQTT Broker] -->|Mensaje JSON| B[MQTT Service]
    B -->|Evento 'message'| C[Main Service]
    C -->|Payload Raw| D[Payload Service]
    
    D -->|extractSensorReadings| E[Lecturas Extraídas]
    E -->|groupReadingsByType| F[Lecturas Agrupadas]
    
    F -->|Vibración| G[processReadingGroup - Vibración]
    F -->|Temperatura| H[processReadingGroup - Temperatura]
    
    G -->|saveVibrationReadings| I[Database Service - Vibración]
    H -->|saveReading| J[Database Service - Temperatura]
    
    I -->|saveVibrationReading| K[Supabase - vibration_readings]
    J -->|saveTemperatureReading| L[Supabase - temperature_readings]
    
    K -->|Datos Guardados| M[Analysis Service]
    L -->|Datos Guardados| M
    
    M -->|Análisis Completado| N[Alert Service]
    N -->|Alertas Generadas| O[Supabase - alerts]
    
    M -->|Resultados| P[Supabase - analysis_results]
```

## Arquitectura de Servicios

```mermaid
graph LR
    subgraph "Application Layer"
        APP[app.js]
    end
    
    subgraph "Main Orchestrator"
        MAIN[main.service.js]
    end
    
    subgraph "Service Layer"
        MQTT[mqtt.service.js]
        PAYLOAD[payload.service.js]
        DB[database.service.js]
        ANALYSIS[analysis.service.js]
        ALERT[alert.service.js]
        CONN[connectivity.service.js]
        DEVICE[device.service.js]
    end
    
    subgraph "Configuration"
        ENV[environment.js]
        CONST[constants.js]
    end
    
    subgraph "External Systems"
        BROKER[MQTT Broker]
        SUPABASE[Supabase Database]
    end
    
    APP --> MAIN
    MAIN --> MQTT
    MAIN --> PAYLOAD
    MAIN --> DB
    MAIN --> ANALYSIS
    MAIN --> ALERT
    MAIN --> CONN
    MAIN --> DEVICE
    
    MQTT --> BROKER
    DB --> SUPABASE
    
    MQTT --> ENV
    DB --> ENV
    ANALYSIS --> CONST
    ALERT --> CONST
    CONN --> CONST
```

## Flujo de Procesamiento de Lecturas

```mermaid
sequenceDiagram
    participant MQTT as MQTT Service
    participant MAIN as Main Service
    participant PAYLOAD as Payload Service
    participant DB as Database Service
    participant ANALYSIS as Analysis Service
    participant ALERT as Alert Service
    participant SUPABASE as Supabase
    
    MQTT->>MAIN: handleMqttMessage(topic, message)
    MAIN->>PAYLOAD: processPayload(deviceCode, payload)
    PAYLOAD->>PAYLOAD: extractSensorReadings()
    PAYLOAD->>PAYLOAD: groupReadingsByType()
    PAYLOAD-->>MAIN: groupedReadings
    
    loop Para cada grupo de lecturas
        MAIN->>MAIN: processReadingGroup(sensor, type, readings)
        
        alt Tipo = vibración
            MAIN->>MAIN: saveVibrationReadings()
            MAIN->>DB: saveVibrationReading(readingData)
        else Tipo = temperatura
            MAIN->>DB: saveTemperatureReading(readingData)
        end
        
        DB->>SUPABASE: INSERT INTO table
        SUPABASE-->>DB: Resultado
        
        MAIN->>ANALYSIS: analyzeReading(sensor, type, value)
        ANALYSIS-->>MAIN: analysisResult
        
        MAIN->>DB: saveAnalysisResult(result)
        DB->>SUPABASE: INSERT INTO analysis_results
        
        MAIN->>ALERT: processAlert(sensor, analysisResult)
        ALERT->>DB: saveAlert(alertData)
        DB->>SUPABASE: INSERT/UPDATE alerts
    end
```

## Flujo de Conectividad

```mermaid
graph TD
    A[Connectivity Service] -->|Timer cada 5 min| B[checkDeviceConnectivity]
    B -->|Para cada sensor| C[Verificar última actividad]
    C -->|> 15 min sin datos| D[Marcar como desconectado]
    C -->|< 15 min| E[Mantener como activo]
    
    D -->|updateSensorStatus| F[Database Service]
    F -->|UPDATE sensors| G[Supabase]
    
    D -->|Generar alerta| H[Alert Service]
    H -->|saveAlert| F
```

## Estados de Sensores

```mermaid
stateDiagram-v2
    [*] --> active
    active --> inactive : Sin datos > 15 min
    inactive --> active : Datos recibidos
    active --> maintenance : Mantenimiento programado
    maintenance --> active : Mantenimiento completado
    active --> error : Error detectado
    error --> active : Error resuelto
    inactive --> error : Error durante inactividad
    error --> maintenance : Mantenimiento requerido
```

## Tipos de Análisis por Sensor

```mermaid
graph LR
    subgraph "Sensor de Vibración"
        V1[Datos X, Y, Z]
        V1 --> V2[Análisis de Picos]
        V1 --> V3[Cálculo RMS]
        V1 --> V4[Factor de Cresta]
        V1 --> V5[Kurtosis]
        V2 --> V6[Clasificación por Zonas]
        V3 --> V6
        V4 --> V6
        V5 --> V6
    end
    
    subgraph "Sensor de Temperatura"
        T1[Valor Temperatura]
        T1 --> T2[Verificar Rangos]
        T1 --> T3[Detectar Tendencias]
        T2 --> T4[Estado Temperatura]
        T3 --> T4
    end
    
    V6 --> ALERT[Sistema de Alertas]
    T4 --> ALERT
```

## Prioridades de Alertas

```mermaid
graph TD
    A[Condición Detectada] --> B{Evaluar Severidad}
    
    B -->|Valor Normal| C[Sin Alerta]
    B -->|Advertencia| D[Alerta LOW]
    B -->|Crítico| E[Alerta MEDIUM]
    B -->|Inaceptable| F[Alerta HIGH]
    
    D -->|Persiste| G[Escalar a MEDIUM]
    E -->|Persiste| H[Escalar a HIGH]
    F -->|Persiste| I[Mantener HIGH]
    
    G --> J[Notificación]
    H --> J
    I --> J
```

## Manejo de Errores y Recuperación

```mermaid
graph TD
    A[Error Detectado] --> B{Tipo de Error}
    
    B -->|MQTT Desconectado| C[Intentar Reconexión]
    B -->|Error Base de Datos| D[Reintentar Operación]
    B -->|Payload Inválido| E[Log Error + Continuar]
    B -->|Sensor Desconectado| F[Marcar como Inactivo]
    
    C -->|Éxito| G[Continuar Operación]
    C -->|Fallo| H[Esperar y Reintentar]
    
    D -->|Éxito| G
    D -->|Fallo| I[Log Error + Alerta]
    
    E --> G
    F --> J[Generar Alerta Conectividad]
    
    H -->|Max Reintentos| K[Error Fatal]
    I --> L[Continuar con Degradación]
    J --> G
```

## Configuración y Dependencias

```mermaid
graph LR
    subgraph "Variables de Entorno"
        ENV1[SUPABASE_URL]
        ENV2[SUPABASE_SERVICE_ROLE_KEY]
        ENV3[MQTT_BROKER_URL]
        ENV4[NODE_ENV]
        ENV5[TZ]
    end
    
    subgraph "Constantes del Sistema"
        CONST1[SPIKE_THRESHOLD_MULTIPLIER]
        CONST2[CONNECTIVITY_TIMEOUT_MINUTES]
        CONST3[LOW_BATTERY_THRESHOLD_VOLT]
        CONST4[ALERT_TYPES]
        CONST5[SENSOR_STATUS]
    end
    
    subgraph "Dependencias NPM"
        DEP1[@supabase/supabase-js]
        DEP2[mqtt]
        DEP3[dotenv]
        DEP4[lodash]
    end
    
    ENV1 --> DB[Database Service]
    ENV2 --> DB
    ENV3 --> MQTT[MQTT Service]
    
    CONST1 --> ANALYSIS[Analysis Service]
    CONST2 --> CONN[Connectivity Service]
    CONST3 --> DEVICE[Device Service]
    CONST4 --> ALERT[Alert Service]
    CONST5 --> MAIN[Main Service]
    
    DEP1 --> DB
    DEP2 --> MQTT
    DEP3 --> ENV[Environment Config]
    DEP4 --> PAYLOAD[Payload Service]
```

---

## Notas Importantes

### Flujo de Datos Críticos
1. **Orden de Procesamiento**: Los datos siempre siguen el flujo MQTT → Payload → Database → Analysis → Alerts
2. **Transaccionalidad**: Cada lectura se procesa de forma independiente para evitar pérdida de datos
3. **Recuperación**: Los errores en un sensor no afectan el procesamiento de otros sensores

### Optimizaciones Implementadas
1. **Métodos Específicos**: `saveVibrationReading()` y `saveTemperatureReading()` evitan problemas de esquema
2. **Agrupamiento Inteligente**: Las lecturas se agrupan por tipo para procesamiento eficiente
3. **Logging Estructurado**: Facilita el debugging y monitoreo del sistema

### Escalabilidad
1. **Servicios Independientes**: Cada servicio puede escalarse por separado
2. **Procesamiento Asíncrono**: No bloquea el flujo principal de datos
3. **Base de Datos Optimizada**: Tablas especializadas para cada tipo de lectura