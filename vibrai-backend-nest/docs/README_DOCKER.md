# Docker - Vibrai Backend Service

Esta guía explica cómo usar Docker con la aplicación Vibrai Backend Service refactorizada.

## Índice
1. [Archivos Docker](#archivos-docker)
2. [Build de la Imagen](#build-de-la-imagen)
3. [Ejecución con Docker](#ejecución-con-docker)
4. [Docker Compose](#docker-compose)
5. [Desarrollo con Docker](#desarrollo-con-docker)
6. [Troubleshooting](#troubleshooting)

## Archivos Docker

### `Dockerfile`
Dockerfile principal optimizado para la nueva arquitectura:
- **Base**: Node.js 18 Alpine
- **Usuario no-root** para seguridad
- **Multi-stage build** optimizado
- **Healthcheck** integrado
- **Variables de entorno** configurables

### `docker-compose.yml`
Configuración para producción:
- **Servicio principal** con configuración optimizada
- **Volúmenes** para logs y archivos temporales
- **Red dedicada** para aislamiento
- **Logging** configurado con rotación

### `docker-compose.dev.yml`
Configuración para desarrollo:
- **Hot reload** con volúmenes montados
- **Puerto expuesto** para debugging
- **Servicios adicionales** (log viewer, simulator)
- **Configuración de debugging** habilitada

### `docker-build.sh`
Script automatizado de build:
- **Verificación de prerrequisitos**
- **Build con argumentos** dinámicos
- **Testing automático** de la imagen
- **Push opcional** al registry

### `.dockerignore`
Optimización del contexto de build:
- **Excluye archivos** innecesarios
- **Reduce tamaño** del contexto
- **Mejora velocidad** de build

## Build de la Imagen

### Build Básico

```bash
# Build simple
docker build -t vibrai-backend .

# Build con variables de entorno
docker build \
  --build-arg SUPABASE_URL=your_url \
  --build-arg SUPABASE_SERVICE_ROLE_KEY=your_key \
  --build-arg MQTT_BROKER_URL=mqtt://broker.url \
  -t vibrai-backend:v1.0.0 .
```

### Build con Script Automatizado

```bash
# Build básico
./docker-build.sh

# Build con tag específico
./docker-build.sh -t v1.0.0

# Build para desarrollo
./docker-build.sh --dev

# Build con archivo de entorno específico
./docker-build.sh -e .env.production

# Build sin cache
./docker-build.sh --no-cache

# Build y push
./docker-build.sh -t v1.0.0 --push
```

### Opciones del Script de Build

```bash
# Mostrar ayuda
./docker-build.sh --help

# Opciones disponibles:
#   -t, --tag TAG          Tag de la imagen
#   -n, --name NAME        Nombre de la imagen
#   -e, --env-file FILE    Archivo de variables de entorno
#   --no-cache             Build sin cache
#   --push                 Push después del build
#   --dev                  Build para desarrollo
#   -h, --help             Mostrar ayuda
```

## Ejecución con Docker

### Ejecución Básica

```bash
# Ejecutar con variables de entorno
docker run -d \
  --name vibrai-backend \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  vibrai-backend:latest

# Ejecutar con variables específicas
docker run -d \
  --name vibrai-backend \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  -e MQTT_BROKER_URL=mqtt://broker.url \
  -v $(pwd)/logs:/app/logs \
  vibrai-backend:latest
```

### Comandos Útiles

```bash
# Ver logs en tiempo real
docker logs -f vibrai-backend

# Acceder al contenedor
docker exec -it vibrai-backend sh

# Verificar salud del contenedor
docker inspect --format='{{.State.Health.Status}}' vibrai-backend

# Reiniciar contenedor
docker restart vibrai-backend

# Detener y eliminar
docker stop vibrai-backend
docker rm vibrai-backend
```

## Docker Compose

### Producción

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Rebuild y reiniciar
docker-compose up -d --build

# Ver estado de servicios
docker-compose ps
```

### Configuración de Variables de Entorno

Crear archivo `.env`:

```env
# Variables requeridas
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MQTT_BROKER_URL=mqtt://direct.miobox.io

# Variables opcionales
NODE_ENV=production
TZ=America/Santiago
```

## Desarrollo con Docker

### Configuración de Desarrollo

```bash
# Usar configuración de desarrollo
docker-compose -f docker-compose.dev.yml up -d

# Con servicios adicionales (logs y simulación)
docker-compose -f docker-compose.dev.yml --profile monitoring --profile simulation up -d

# Solo el servicio principal
docker-compose -f docker-compose.dev.yml up vibrai-backend-dev -d
```

### Servicios de Desarrollo

#### Servicio Principal (`vibrai-backend-dev`)
- **Hot reload** habilitado
- **Puerto 3000** expuesto
- **Debugging** configurado
- **Logs detallados**

#### Log Viewer (`log-viewer`)
- **Dozzle** para visualización de logs
- **Acceso**: http://localhost:8080
- **Perfil**: `monitoring`

#### MQTT Simulator (`mqtt-simulator`)
- **Simulación** de datos de sensores
- **Intervalo configurable**
- **Perfil**: `simulation`

### Comandos de Desarrollo

```bash
# Iniciar solo desarrollo
docker-compose -f docker-compose.dev.yml up vibrai-backend-dev

# Iniciar con monitoreo
docker-compose -f docker-compose.dev.yml --profile monitoring up

# Iniciar todo (desarrollo + monitoreo + simulación)
docker-compose -f docker-compose.dev.yml --profile monitoring --profile simulation up

# Rebuild para desarrollo
docker-compose -f docker-compose.dev.yml up --build

# Ver logs específicos
docker-compose -f docker-compose.dev.yml logs -f vibrai-backend-dev
```

## Troubleshooting

### Problemas Comunes

#### 1. Error de Variables de Entorno

```bash
# Verificar variables
docker run --rm vibrai-backend env | grep -E "(SUPABASE|MQTT)"

# Verificar archivo .env
cat .env | grep -v "^#"
```

#### 2. Problemas de Conectividad

```bash
# Verificar red
docker network ls
docker network inspect vibrai-network

# Verificar conectividad MQTT
docker run --rm --network vibrai-network alpine/curl \
  telnet direct.miobox.io 1883
```

#### 3. Problemas de Permisos

```bash
# Verificar permisos de volúmenes
ls -la logs/
sudo chown -R 1001:1001 logs/

# Verificar usuario en contenedor
docker exec vibrai-backend id
```

#### 4. Problemas de Memoria

```bash
# Verificar uso de recursos
docker stats vibrai-backend

# Verificar logs de memoria
docker logs vibrai-backend | grep -i memory
```

### Comandos de Diagnóstico

```bash
# Información completa del contenedor
docker inspect vibrai-backend

# Verificar healthcheck
docker inspect --format='{{json .State.Health}}' vibrai-backend | jq

# Verificar procesos en el contenedor
docker exec vibrai-backend ps aux

# Verificar conectividad de red
docker exec vibrai-backend ping -c 3 direct.miobox.io
```

### Limpieza del Sistema

```bash
# Limpiar contenedores parados
docker container prune

# Limpiar imágenes no utilizadas
docker image prune

# Limpiar volúmenes no utilizados
docker volume prune

# Limpiar redes no utilizadas
docker network prune

# Limpieza completa (¡CUIDADO!)
docker system prune -a
```

## Optimizaciones de Rendimiento

### Build Optimizado

```bash
# Usar BuildKit para builds más rápidos
DOCKER_BUILDKIT=1 docker build -t vibrai-backend .

# Build con cache de registry
docker build --cache-from vibrai-backend:latest -t vibrai-backend:new .
```

### Configuración de Recursos

```yaml
# En docker-compose.yml
services:
  vibrai-backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Monitoreo de Recursos

```bash
# Monitoreo en tiempo real
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Logs de recursos
docker exec vibrai-backend cat /proc/meminfo
docker exec vibrai-backend cat /proc/cpuinfo
```

## Seguridad

### Mejores Prácticas

1. **Usuario no-root**: La imagen usa usuario `appuser` (UID 1001)
2. **Variables de entorno**: Nunca incluir secretos en la imagen
3. **Volúmenes**: Usar volúmenes para datos persistentes
4. **Red**: Usar redes dedicadas para aislamiento
5. **Actualizaciones**: Mantener imagen base actualizada

### Verificación de Seguridad

```bash
# Verificar usuario
docker exec vibrai-backend whoami

# Verificar permisos
docker exec vibrai-backend ls -la /app

# Escanear vulnerabilidades (si tienes docker scan)
docker scan vibrai-backend:latest
```

---

## Comandos de Referencia Rápida

```bash
# Build y ejecutar
./docker-build.sh -t latest
docker-compose up -d

# Desarrollo
docker-compose -f docker-compose.dev.yml up -d

# Logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Limpiar
docker-compose down
docker system prune
```

Para más información, consultar la [Documentación de Arquitectura](DOCUMENTACION_ARQUITECTURA.md) y la [Guía de Operación](GUIA_OPERACION.md).