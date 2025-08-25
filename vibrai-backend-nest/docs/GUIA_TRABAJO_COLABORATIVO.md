# Guía de Trabajo Colaborativo - Vibrai Backend Service

## 📋 Análisis del Proyecto

### Descripción General
Este proyecto es un **servicio de análisis básico** para el sistema Vibrai que:
- Se conecta a un broker MQTT para recibir datos de sensores IoT
- Procesa datos de sensores de vibración y temperatura
- Realiza análisis según normas ISO 10816 y perfiles personalizados
- Gestiona alertas automáticas basadas en umbrales y condiciones
- Almacena datos y resultados en Supabase (PostgreSQL)

### Arquitectura Actual
```
MQTT Broker → basic-analysis.js → Supabase Database
     ↓              ↓                    ↓
Sensores IoT → Procesamiento → Alertas & Análisis
```

### Stack Tecnológico
- **Runtime**: Node.js 18
- **Base de Datos**: Supabase (PostgreSQL)
- **Comunicación IoT**: MQTT
- **Containerización**: Docker
- **Dependencias principales**:
  - `@supabase/supabase-js`: Cliente de base de datos
  - `mqtt`: Cliente MQTT
  - `lodash`: Utilidades
  - `dotenv`: Variables de entorno

## 🎯 Objetivos de Colaboración

### Objetivos Inmediatos
1. **Estabilización del servicio actual**
2. **Mejora de la documentación técnica**
3. **Implementación de tests unitarios**
4. **Optimización del rendimiento**

### Objetivos a Mediano Plazo
1. **Migración a NestJS** (como sugiere el nombre del directorio)
2. **Implementación de microservicios**
3. **Mejora del sistema de alertas**
4. **Dashboard de monitoreo**

## 🔧 Estructura de Trabajo

### 1. Metodología de Desarrollo

#### Flujo de Trabajo Git
```bash
main (producción)
├── develop (desarrollo)
├── feature/nombre-funcionalidad
├── hotfix/nombre-fix
└── release/version
```

#### Convención de Commits
```
tipo(alcance): descripción breve

Tipos:
- feat: nueva funcionalidad
- fix: corrección de bug
- docs: documentación
- style: formato, espacios
- refactor: refactorización
- test: tests
- chore: tareas de mantenimiento
```

### 2. Estándares de Código

#### Estructura de Archivos Propuesta
```
vibrai-backend-nest/
├── src/
│   ├── modules/
│   │   ├── mqtt/
│   │   ├── sensors/
│   │   ├── analysis/
│   │   └── alerts/
│   ├── common/
│   │   ├── constants/
│   │   ├── utils/
│   │   └── interfaces/
│   ├── config/
│   └── main.ts
├── test/
├── docs/
├── docker/
└── scripts/
```

#### Convenciones de Nomenclatura
- **Archivos**: kebab-case (`sensor-analysis.service.ts`)
- **Clases**: PascalCase (`SensorAnalysisService`)
- **Variables/Funciones**: camelCase (`analyzeVibrationData`)
- **Constantes**: UPPER_SNAKE_CASE (`SPIKE_THRESHOLD_MULTIPLIER`)

### 3. Proceso de Desarrollo

#### Definición de Tareas
1. **Planning**: Definir objetivos semanales
2. **Task Breakdown**: Dividir en tareas de 1-3 días
3. **Code Review**: Revisión obligatoria antes de merge
4. **Testing**: Tests unitarios y de integración
5. **Documentation**: Actualizar docs con cada cambio

#### Criterios de Aceptación
- [ ] Código revisado por al menos 1 persona
- [ ] Tests pasando (cuando estén implementados)
- [ ] Documentación actualizada
- [ ] Sin errores de linting
- [ ] Variables de entorno documentadas

## 📚 Guías Técnicas

### 1. Configuración del Entorno de Desarrollo

#### Requisitos Previos
```bash
# Node.js 18+
node --version

# Docker y Docker Compose
docker --version
docker-compose --version
```

#### Setup Inicial
```bash
# 1. Clonar repositorio
git clone [repo-url]
cd vibrai-backend-nest

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con valores reales

# 4. Ejecutar en desarrollo
npm run dev  # (cuando esté configurado)

# 5. Ejecutar con Docker
docker-compose up --build
```

### 2. Estructura de Datos Actual

#### Tipos de Sensores Soportados
- **Vibración**: Análisis según ISO 10816 y perfiles personalizados
- **Temperatura**: Análisis por umbrales configurables

#### Formato de Datos MQTT
```json
{
  "SequenceNumber": 301,
  "TempHumi": { "SenVal": 45000 },
  "Accelerometer": {
    "X-Axis": { "OAVelocity": 3.5, "Peak": 4.95, "RMS": 3.5 },
    "Y-Axis": { "OAVelocity": 2.1, "Peak": 2.97, "RMS": 2.1 },
    "Z-Axis": { "OAVelocity": 2.8, "Peak": 3.96, "RMS": 2.8 }
  },
  "Device": { "BatteryVolt": 98, "Time": 1722427001 }
}
```

### 3. Sistema de Alertas

#### Tipos de Alertas
1. **Vibración**: Basadas en zonas ISO (A, B, C, D)
2. **Temperatura**: Por umbrales críticos y normales
3. **Conectividad**: Pérdida de conexión de sensores
4. **Batería**: Nivel bajo de batería
5. **Datos Anómalos**: Picos de datos sospechosos

#### Prioridades
- **High**: Peligro inmediato, batería baja, pérdida de conexión
- **Medium**: Advertencias, datos anómalos
- **Low**: Cambios de estado menores

## 🚀 Plan de Migración a NestJS

### Fase 1: Preparación (Semana 1-2)
- [ ] Setup inicial de NestJS
- [ ] Configuración de TypeScript
- [ ] Estructura de módulos base
- [ ] Configuración de testing

### Fase 2: Migración Core (Semana 3-4)
- [ ] Módulo de configuración
- [ ] Servicio de conexión a Supabase
- [ ] Cliente MQTT como servicio
- [ ] Interfaces y DTOs

### Fase 3: Lógica de Negocio (Semana 5-6)
- [ ] Servicio de análisis de sensores
- [ ] Sistema de alertas
- [ ] Procesamiento de datos MQTT
- [ ] Validaciones y transformaciones

### Fase 4: Testing y Optimización (Semana 7-8)
- [ ] Tests unitarios completos
- [ ] Tests de integración
- [ ] Optimización de rendimiento
- [ ] Documentación API

## 📋 Tareas Prioritarias

### Inmediatas (Esta Semana)
1. **Documentación técnica detallada**
2. **Configuración de linting (ESLint + Prettier)**
3. **Setup de testing framework (Jest)**
4. **Análisis de rendimiento actual**

### Corto Plazo (2-4 Semanas)
1. **Refactorización del código actual**
2. **Implementación de logging estructurado**
3. **Mejora del manejo de errores**
4. **Optimización de consultas a BD**

### Mediano Plazo (1-3 Meses)
1. **Migración completa a NestJS**
2. **Implementación de API REST**
3. **Dashboard de monitoreo**
4. **Sistema de notificaciones**

## 🔍 Métricas y Monitoreo

### KPIs Técnicos
- **Latencia de procesamiento**: < 100ms por mensaje
- **Disponibilidad**: > 99.5%
- **Throughput**: Mensajes procesados por segundo
- **Error rate**: < 0.1%

### Herramientas de Monitoreo
- **Logs**: Structured logging con Winston
- **Métricas**: Prometheus + Grafana
- **Alertas**: Sistema interno + notificaciones externas
- **Health checks**: Endpoints de salud

## 🤝 Comunicación y Coordinación

### Reuniones Regulares
- **Daily Standup**: Lunes, Miércoles, Viernes (15 min)
- **Planning**: Cada lunes (30 min)
- **Retrospectiva**: Cada viernes (30 min)
- **Code Review**: Según necesidad

### Canales de Comunicación
- **Slack/Discord**: Comunicación diaria
- **GitHub Issues**: Tracking de tareas
- **GitHub Discussions**: Decisiones técnicas
- **Documentación**: Wiki del proyecto

### Roles y Responsabilidades
- **Tech Lead**: Arquitectura y decisiones técnicas
- **Backend Developer**: Implementación y testing
- **DevOps**: Infraestructura y deployment
- **QA**: Testing y validación

## 📖 Recursos y Referencias

### Documentación Técnica
- [NestJS Documentation](https://docs.nestjs.com/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [MQTT.js Documentation](https://github.com/mqttjs/MQTT.js)
- [ISO 10816 Standard](https://www.iso.org/standard/51043.html)

### Herramientas de Desarrollo
- **IDE**: VS Code con extensiones recomendadas
- **Database**: Supabase Studio
- **MQTT Testing**: MQTT Explorer
- **API Testing**: Postman/Insomnia

---

## 🎯 Próximos Pasos

1. **Revisar y aprobar esta guía**
2. **Configurar el entorno de desarrollo**
3. **Definir las primeras tareas específicas**
4. **Establecer el calendario de reuniones**
5. **Comenzar con la documentación técnica detallada**

---

*Esta guía es un documento vivo que debe actualizarse según evolucione el proyecto y el equipo.*