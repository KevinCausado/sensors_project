# Guía de Operación - Vibrai Backend Service

## Índice
1. [Instalación y Configuración](#instalación-y-configuración)
2. [Ejecución de la Aplicación](#ejecución-de-la-aplicación)
3. [Monitoreo y Logs](#monitoreo-y-logs)
4. [Mantenimiento](#mantenimiento)
5. [Troubleshooting](#troubleshooting)
6. [API y Endpoints](#api-y-endpoints)
7. [Backup y Recuperación](#backup-y-recuperación)

## Instalación y Configuración

### Prerrequisitos
- Node.js 16+ 
- npm o yarn
- Acceso a base de datos Supabase
- Acceso al broker MQTT

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd vibrai-backend-nest

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

### Configuración de Variables de Entorno

Editar el archivo `.env`:

```env
# Base de datos Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Broker MQTT
MQTT_BROKER_URL=mqtt://direct.miobox.io

# Configuración de aplicación
NODE_ENV=production
TZ=America/Santiago
```

### Verificación de Configuración

```bash
# Verificar que las variables de entorno están configuradas
node -e "require('./src/config/environment.js'); console.log('✓ Configuración válida')"
```

## Ejecución de la Aplicación

### Modo Desarrollo

```bash
# Ejecutar con logs detallados
NODE_ENV=development node src/app.js
```

### Modo Producción

```bash
# Ejecutar en producción
NODE_ENV=production node src/app.js
```

### Usando Docker

```bash
# Construir imagen
docker build -t vibrai-backend .

# Ejecutar contenedor
docker run -d \
  --name vibrai-backend \
  --env-file .env \
  -p 3000:3000 \
  vibrai-backend
```

### Usando Docker Compose

```bash
# Ejecutar con docker-compose
docker-compose up -d
```

## Monitoreo y Logs

### Estructura de Logs

La aplicación utiliza logging estructurado con prefijos identificables:

```
[APP] - Eventos de aplicación (inicio, cierre, errores fatales)
[MQTT] - Conexión MQTT, mensajes recibidos, reconexiones
[PAYLOAD] - Procesamiento de payloads, validación de datos
[READINGS] - Procesamiento de lecturas individuales y agrupadas
[DATABASE] - Operaciones de base de datos, errores de conexión
[ANALYSIS] - Resultados de análisis, clasificaciones
[ALERTS] - Creación y actualización de alertas
[CONNECTIVITY] - Monitoreo de conectividad de dispositivos
```

### Monitoreo en Tiempo Real

```bash
# Ver logs en tiempo real
tail -f logs/app.log | grep -E "\[(APP|ERROR)\]"

# Filtrar por tipo de evento
tail -f logs/app.log | grep "\[MQTT\]"
tail -f logs/app.log | grep "\[DATABASE\]"
tail -f logs/app.log | grep "\[ALERTS\]"
```

### Métricas Importantes

#### Salud de la Aplicación
- Conexión MQTT activa
- Conexión a base de datos funcional
- Procesamiento de mensajes sin errores
- Tiempo de respuesta de análisis

#### Métricas de Sensores
- Número de sensores activos
- Frecuencia de lecturas por sensor
- Tiempo desde última lectura
- Número de alertas activas

#### Métricas de Rendimiento
- Mensajes MQTT procesados por minuto
- Tiempo promedio de procesamiento
- Errores de base de datos
- Memoria y CPU utilizados

### Comandos de Monitoreo

```bash
# Verificar estado de la aplicación
curl http://localhost:3000/health

# Ver estadísticas de sensores
curl http://localhost:3000/api/sensors/stats

# Ver alertas activas
curl http://localhost:3000/api/alerts/active
```

## Mantenimiento

### Tareas Diarias

1. **Verificar Logs de Errores**
   ```bash
   grep -i error logs/app.log | tail -20
   ```

2. **Verificar Conectividad de Sensores**
   ```bash
   grep "\[CONNECTIVITY\]" logs/app.log | tail -10
   ```

3. **Verificar Alertas Críticas**
   ```bash
   grep "HIGH" logs/app.log | tail -10
   ```

### Tareas Semanales

1. **Limpiar Logs Antiguos**
   ```bash
   find logs/ -name "*.log" -mtime +7 -delete
   ```

2. **Verificar Uso de Disco**
   ```bash
   df -h
   du -sh logs/
   ```

3. **Actualizar Estadísticas de Base de Datos**
   ```sql
   -- Ejecutar en Supabase
   ANALYZE vibration_readings;
   ANALYZE temperature_readings;
   ANALYZE analysis_results;
   ```

### Tareas Mensuales

1. **Backup de Configuración**
   ```bash
   tar -czf backup-config-$(date +%Y%m%d).tar.gz .env src/config/
   ```

2. **Revisar y Optimizar Consultas**
   - Revisar logs de consultas lentas
   - Optimizar índices si es necesario

3. **Actualizar Dependencias**
   ```bash
   npm audit
   npm update
   ```

## Troubleshooting

### Problemas Comunes

#### 1. Error de Conexión MQTT

**Síntomas:**
```
[MQTT] Error de conexión: Connection refused
```

**Soluciones:**
1. Verificar URL del broker MQTT
2. Verificar conectividad de red
3. Verificar credenciales si es necesario

```bash
# Probar conexión manual
mosquitto_sub -h direct.miobox.io -t "Advantech/#" -v
```

#### 2. Error de Base de Datos

**Síntomas:**
```
[DATABASE] Error al guardar lectura: Invalid API key
```

**Soluciones:**
1. Verificar variables de entorno de Supabase
2. Verificar permisos del service role key
3. Verificar conectividad a Supabase

```bash
# Probar conexión a Supabase
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/sensors?select=id"
```

#### 3. Sensores Desconectados

**Síntomas:**
```
[CONNECTIVITY] Sensor desconectado: Sensor de Temperatura
```

**Soluciones:**
1. Verificar estado físico del sensor
2. Verificar conectividad de red del sensor
3. Verificar configuración MQTT del sensor

#### 4. Alertas No Generadas

**Síntomas:**
- Valores anómalos sin alertas correspondientes

**Soluciones:**
1. Verificar umbrales de análisis en `constants.js`
2. Verificar logs de análisis
3. Verificar configuración de alertas

```bash
# Verificar análisis recientes
grep "\[ANALYSIS\]" logs/app.log | tail -20
```

#### 5. Alto Uso de Memoria

**Síntomas:**
- Aplicación lenta o que se cierra inesperadamente

**Soluciones:**
1. Verificar logs de memoria
2. Reiniciar la aplicación
3. Verificar acumulación de datos en memoria

```bash
# Monitorear uso de memoria
ps aux | grep node
top -p $(pgrep node)
```

### Comandos de Diagnóstico

```bash
# Verificar estado general
npm run health-check

# Verificar conectividad MQTT
npm run test-mqtt

# Verificar base de datos
npm run test-database

# Generar reporte de diagnóstico
npm run diagnostic-report
```

### Reinicio de Servicios

```bash
# Reinicio limpio
pkill -f "node.*app.js"
sleep 5
NODE_ENV=production node src/app.js

# Reinicio con Docker
docker restart vibrai-backend

# Reinicio con docker-compose
docker-compose restart
```

## API y Endpoints

### Endpoints de Salud

```http
GET /health
# Respuesta: { "status": "ok", "timestamp": "..." }

GET /health/detailed
# Respuesta detallada con estado de servicios
```

### Endpoints de Sensores

```http
GET /api/sensors
# Lista todos los sensores

GET /api/sensors/:id
# Información de un sensor específico

GET /api/sensors/:id/readings
# Lecturas recientes de un sensor
```

### Endpoints de Alertas

```http
GET /api/alerts
# Lista todas las alertas

GET /api/alerts/active
# Solo alertas activas

POST /api/alerts/:id/acknowledge
# Marcar alerta como reconocida
```

### Endpoints de Análisis

```http
GET /api/analysis/results
# Resultados de análisis recientes

GET /api/analysis/sensors/:id
# Análisis específico de un sensor
```

## Backup y Recuperación

### Backup de Base de Datos

```bash
# Backup automático diario (configurar en cron)
0 2 * * * /path/to/backup-script.sh

# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
gzip backup_$DATE.sql
```

### Backup de Configuración

```bash
# Backup de archivos de configuración
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  .env \
  src/config/ \
  package.json \
  docker-compose.yml
```

### Recuperación

```bash
# Restaurar base de datos
gunzip backup_YYYYMMDD_HHMMSS.sql.gz
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Restaurar configuración
tar -xzf config-backup-YYYYMMDD.tar.gz
```

### Procedimiento de Recuperación de Desastres

1. **Verificar Backup Más Reciente**
   ```bash
   ls -la backups/ | head -5
   ```

2. **Restaurar Base de Datos**
   ```bash
   # Usar backup más reciente
   ./restore-database.sh backup_latest.sql.gz
   ```

3. **Restaurar Configuración**
   ```bash
   # Restaurar archivos de configuración
   ./restore-config.sh config-backup-latest.tar.gz
   ```

4. **Verificar Integridad**
   ```bash
   # Ejecutar verificaciones
   npm run verify-integrity
   ```

5. **Reiniciar Servicios**
   ```bash
   # Reiniciar aplicación
   ./restart-services.sh
   ```

## Scripts de Utilidad

### Script de Monitoreo

```bash
#!/bin/bash
# monitor.sh - Script de monitoreo básico

echo "=== Estado de la Aplicación ==="
curl -s http://localhost:3000/health | jq .

echo "=== Sensores Activos ==="
curl -s http://localhost:3000/api/sensors | jq '.[] | select(.status == "active") | .name'

echo "=== Alertas Críticas ==="
curl -s http://localhost:3000/api/alerts/active | jq '.[] | select(.priority == "high")'

echo "=== Uso de Recursos ==="
ps aux | grep node | grep -v grep
```

### Script de Limpieza

```bash
#!/bin/bash
# cleanup.sh - Limpieza de archivos temporales

# Limpiar logs antiguos
find logs/ -name "*.log" -mtime +30 -delete

# Limpiar backups antiguos
find backups/ -name "*.sql.gz" -mtime +90 -delete

# Limpiar archivos temporales
rm -rf tmp/*

echo "Limpieza completada"
```

---

## Contacto y Soporte

Para soporte técnico o reportar problemas:

1. **Logs**: Siempre incluir logs relevantes
2. **Configuración**: Verificar variables de entorno
3. **Versión**: Indicar versión de la aplicación
4. **Entorno**: Especificar entorno (desarrollo/producción)

### Información de Diagnóstico

```bash
# Generar información de diagnóstico
echo "=== Información del Sistema ===" > diagnostic.txt
date >> diagnostic.txt
node --version >> diagnostic.txt
npm --version >> diagnostic.txt
echo "=== Variables de Entorno ===" >> diagnostic.txt
env | grep -E "(NODE_ENV|SUPABASE|MQTT)" >> diagnostic.txt
echo "=== Estado de Servicios ===" >> diagnostic.txt
curl -s http://localhost:3000/health >> diagnostic.txt
```