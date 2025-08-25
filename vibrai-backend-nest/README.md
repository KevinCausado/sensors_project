# Vibrai Backend - Sistema de Monitoreo IoT

Sistema backend para el monitoreo de sensores IoT de vibración y temperatura, desarrollado con Node.js y Supabase.

## 📑 Tabla de Contenidos

### 🚀 Inicio Rápido
- [Instalación y Configuración](#-inicio-rápido)
- [Scripts Disponibles](#-scripts-disponibles)
- [Estructura del Proyecto](#-estructura-del-proyecto)

### 📚 Documentación Completa
- [**📖 Arquitectura del Sistema**](docs/DOCUMENTACION_ARQUITECTURA.md) - Diseño y componentes del sistema
- [**🔄 Diagrama de Flujo**](docs/DIAGRAMA_FLUJO_SERVICIOS.md) - Flujo de datos y servicios
- [**⚙️ Guía de Operación**](docs/GUIA_OPERACION.md) - Operación y mantenimiento del sistema
- [**👥 Trabajo Colaborativo**](docs/GUIA_TRABAJO_COLABORATIVO.md) - Estándares de desarrollo
- [**🔧 Refactoring**](docs/README_REFACTORING.md) - Historial de mejoras y optimizaciones
- [**🐳 Docker**](docs/README_DOCKER.md) - Configuración de contenedores
- [**📋 Formato de Payload**](docs/payload.md) - Estructura de datos MQTT
- [**📚 Índice de Documentación**](docs/README.md) - Guía completa de documentación

### 🧪 Testing y Pruebas
- [**🧪 Suite de Pruebas**](tests/README.md) - Documentación completa de testing
- [Pruebas de Funcionalidad](#-testing)
- [Pruebas de Rendimiento](#-testing)
- [Herramientas de Análisis](#-testing)

### 🏗️ Características Técnicas
- [Servicios Principales](#-servicios-principales)
- [Características del Sistema](#-características)
- [Optimizaciones Implementadas](#-optimizaciones-implementadas)
- [Monitoreo y Alertas](#-monitoreo-y-alertas)

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar el servidor
npm start
# o para desarrollo
npm run dev
```

## 📋 Scripts Disponibles

### Servidor
```bash
npm start          # Iniciar servidor de producción
npm run dev        # Iniciar servidor de desarrollo
```

### Testing
```bash
npm run test:complete     # Prueba completa de procesamiento
npm run test:temperature  # Pruebas de temperatura
npm run test:timestamps   # Pruebas de consistencia temporal
npm run test:batch        # Pruebas de inserción en bloque
npm run test:performance  # Comparación de rendimiento
npm run test:monitor      # Monitoreo de datos reales
npm run test:sensor       # Obtener información de sensores
npm run test:mqtt-simulator  # Simulador MQTT de payloads
npm run test:mqtt-analyzer   # Analizador MQTT en tiempo real
npm run test:all          # Ejecutar suite principal de pruebas
```

### Utilidades
```bash
npm run simulator  # Simulador MQTT de datos (mqtt-simulator.js)
npm run analyzer   # Analizador de datos reales (tests/test-mqtt-real-analyzer.js)

# Utilidades adicionales disponibles:
node mqtt-payload-simulator.js  # Simulador con Peak-to-Peak Displacement
node basic-analysis.js          # Análisis básico de datos
```

## 📁 Estructura del Proyecto

```
vibrai-backend-nest/
├── src/                    # Código fuente principal
│   ├── app.js             # Aplicación Express
│   ├── main.service.js    # Servicio principal
│   ├── config/            # Configuración
│   └── services/          # Servicios del sistema
├── tests/                 # Pruebas y scripts de testing
├── docs/                  # Documentación del proyecto
├── docker-compose.yml     # Configuración Docker
└── package.json          # Dependencias y scripts
```

## 🔧 Servicios Principales

- **MQTT Service**: Conexión y manejo de mensajes MQTT
- **Database Service**: Operaciones con Supabase
- **Payload Service**: Procesamiento de datos de sensores
- **Analysis Service**: Análisis de datos y detección de anomalías
- **Alert Service**: Sistema de alertas y notificaciones
- **Device Service**: Gestión de dispositivos y batería

## 📊 Características

- ✅ **Inserción en Bloque**: Optimización para datos de vibración (3.1x más rápido)
- ✅ **Análisis en Tiempo Real**: Detección de anomalías y alertas automáticas
- ✅ **Múltiples Sensores**: Soporte para vibración y temperatura
- ✅ **Gestión de Batería**: Monitoreo automático del estado de batería
- ✅ **Conectividad Robusta**: Reconexión automática MQTT
- ✅ **Docker Ready**: Contenedorización completa

## 📚 Documentación

Para acceder a toda la documentación técnica, consulta:
- [**📚 Índice Completo de Documentación**](docs/README.md) - Guía de navegación de toda la documentación
- [**🧪 Documentación de Testing**](tests/README.md) - Suite completa de pruebas y herramientas

### 📖 Documentos Principales
- [Arquitectura del Sistema](docs/DOCUMENTACION_ARQUITECTURA.md)
- [Guía de Operación](docs/GUIA_OPERACION.md)
- [Formato de Payload MQTT](docs/payload.md)

## 🧪 Testing

El proyecto incluye una suite completa de pruebas en la carpeta `tests/`:

### Pruebas de Funcionalidad
```bash
# Pruebas de procesamiento completo
node tests/test-complete-processing.js

# Pruebas de conversión de temperatura
node tests/test-temperature-conversion.js

# Pruebas de consistencia de timestamps
node tests/test-timestamp-consistency.js
```

### Pruebas de Rendimiento
```bash
# Comparación de inserción individual vs bloque
node tests/performance-comparison.js

# Análisis de timestamps en base de datos real
node tests/monitor-real-timestamps.js
```

### Utilidades de Testing
```bash
# Obtener información de sensores reales
node tests/get-real-sensor.js

# Verificar separación de datos por sensor
node tests/verify-sensor-separation.js
```

## 🐳 Docker

```bash
# Desarrollo
docker-compose -f docker-compose.dev.yml up

# Producción
docker-compose up -d
```

## 📈 Optimizaciones Implementadas

### Inserción en Bloque de Vibración
- **Antes**: 528ms (3 inserciones individuales)
- **Después**: 171ms (1 inserción en bloque)
- **Mejora**: 67.6% más rápido (3.1x)

### Consistencia de Timestamps
- Todos los ejes (X, Y, Z) comparten el mismo timestamp MQTT
- Reducción significativa en diferencias de `created_at`
- Mejor integridad temporal de los datos

## 🔍 Monitoreo y Alertas

- **Detección de Picos**: Identificación automática de anomalías
- **Alertas de Batería**: Notificaciones de batería baja
- **Alertas de Conectividad**: Monitoreo de estado de conexión
- **Análisis Predictivo**: Evaluación de tendencias de vibración

## 🌐 API y Conectividad

- **MQTT**: Recepción de datos de sensores IoT
- **Supabase**: Base de datos en tiempo real
- **REST API**: Endpoints para consulta de datos
- **WebSockets**: Actualizaciones en tiempo real

## 📞 Soporte

Para más información, consulta la documentación en la carpeta `docs/` o revisa los ejemplos en `tests/`.

---

**Desarrollado para el monitoreo industrial de vibración y temperatura** 🏭⚡