#!/bin/bash

# Script de build optimizado para Vibrai Backend Service
# Versión: 2.0 - Arquitectura Refactorizada

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
IMAGE_NAME="vibrai-backend"
IMAGE_TAG="latest"
DOCKERFILE_PATH="."

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  -t, --tag TAG          Especificar tag de la imagen (default: latest)"
    echo "  -n, --name NAME        Especificar nombre de la imagen (default: vibrai-backend)"
    echo "  -e, --env-file FILE    Especificar archivo de variables de entorno"
    echo "  --no-cache             Construir sin usar cache"
    echo "  --push                 Push de la imagen después del build"
    echo "  --dev                  Build para desarrollo (incluye herramientas de debug)"
    echo "  -h, --help             Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0                                    # Build básico"
    echo "  $0 -t v1.0.0                        # Build con tag específico"
    echo "  $0 --env-file .env.production        # Build con variables específicas"
    echo "  $0 --dev                             # Build para desarrollo"
}

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para verificar prerrequisitos
check_prerequisites() {
    log "Verificando prerrequisitos..."
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker no está instalado"
        exit 1
    fi
    
    # Verificar que Docker está corriendo
    if ! docker info &> /dev/null; then
        log_error "Docker no está corriendo"
        exit 1
    fi
    
    # Verificar archivos necesarios
    if [ ! -f "package.json" ]; then
        log_error "package.json no encontrado"
        exit 1
    fi
    
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile no encontrado"
        exit 1
    fi
    
    if [ ! -d "src" ]; then
        log_error "Directorio src/ no encontrado"
        exit 1
    fi
    
    log_success "Prerrequisitos verificados"
}

# Función para leer variables de entorno
load_env_vars() {
    local env_file="$1"
    
    if [ -n "$env_file" ] && [ -f "$env_file" ]; then
        log "Cargando variables de entorno desde $env_file"
        set -a
        source "$env_file"
        set +a
    elif [ -f ".env" ]; then
        log "Cargando variables de entorno desde .env"
        set -a
        source ".env"
        set +a
    else
        log_warning "No se encontró archivo de variables de entorno"
    fi
}

# Función para construir argumentos de build
build_args() {
    local args=""
    
    # Variables de entorno requeridas
    if [ -n "$SUPABASE_URL" ]; then
        args="$args --build-arg SUPABASE_URL=$SUPABASE_URL"
    fi
    
    if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        args="$args --build-arg SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"
    fi
    
    if [ -n "$MQTT_BROKER_URL" ]; then
        args="$args --build-arg MQTT_BROKER_URL=$MQTT_BROKER_URL"
    fi
    
    # Configuración de entorno
    if [ "$DEV_MODE" = "true" ]; then
        args="$args --build-arg NODE_ENV=development"
    else
        args="$args --build-arg NODE_ENV=production"
    fi
    
    echo "$args"
}

# Función principal de build
build_image() {
    local full_image_name="${IMAGE_NAME}:${IMAGE_TAG}"
    
    log "Iniciando build de la imagen: $full_image_name"
    
    # Preparar comando de build
    local build_cmd="docker build"
    
    # Agregar argumentos de build
    local build_args_str=$(build_args)
    if [ -n "$build_args_str" ]; then
        build_cmd="$build_cmd $build_args_str"
    fi
    
    # Agregar opciones adicionales
    if [ "$NO_CACHE" = "true" ]; then
        build_cmd="$build_cmd --no-cache"
    fi
    
    # Agregar tag y contexto
    build_cmd="$build_cmd -t $full_image_name $DOCKERFILE_PATH"
    
    log "Ejecutando: $build_cmd"
    
    # Ejecutar build
    if eval "$build_cmd"; then
        log_success "Imagen construida exitosamente: $full_image_name"
    else
        log_error "Error al construir la imagen"
        exit 1
    fi
}

# Función para verificar la imagen
verify_image() {
    local full_image_name="${IMAGE_NAME}:${IMAGE_TAG}"
    
    log "Verificando imagen construida..."
    
    # Verificar que la imagen existe
    if docker image inspect "$full_image_name" &> /dev/null; then
        log_success "Imagen verificada correctamente"
        
        # Mostrar información de la imagen
        local image_size=$(docker image inspect "$full_image_name" --format='{{.Size}}' | numfmt --to=iec)
        local image_id=$(docker image inspect "$full_image_name" --format='{{.Id}}' | cut -d: -f2 | cut -c1-12)
        
        echo ""
        echo "=== Información de la Imagen ==="
        echo "Nombre: $full_image_name"
        echo "ID: $image_id"
        echo "Tamaño: $image_size"
        echo "================================"
        echo ""
    else
        log_error "Error al verificar la imagen"
        exit 1
    fi
}

# Función para push de la imagen
push_image() {
    local full_image_name="${IMAGE_NAME}:${IMAGE_TAG}"
    
    log "Realizando push de la imagen: $full_image_name"
    
    if docker push "$full_image_name"; then
        log_success "Push completado exitosamente"
    else
        log_error "Error al realizar push de la imagen"
        exit 1
    fi
}

# Función para test rápido de la imagen
test_image() {
    local full_image_name="${IMAGE_NAME}:${IMAGE_TAG}"
    
    log "Realizando test rápido de la imagen..."
    
    # Test básico: verificar que la aplicación inicia
    local container_id=$(docker run -d --rm "$full_image_name")
    
    if [ -n "$container_id" ]; then
        sleep 5
        
        # Verificar que el contenedor está corriendo
        if docker ps | grep -q "$container_id"; then
            log_success "Test básico pasado - La aplicación inicia correctamente"
            docker stop "$container_id" &> /dev/null
        else
            log_error "Test fallido - La aplicación no inicia correctamente"
            docker logs "$container_id"
            exit 1
        fi
    else
        log_error "Error al crear contenedor de test"
        exit 1
    fi
}

# Parsear argumentos de línea de comandos
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -e|--env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --no-cache)
            NO_CACHE="true"
            shift
            ;;
        --push)
            PUSH_IMAGE="true"
            shift
            ;;
        --dev)
            DEV_MODE="true"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Función principal
main() {
    echo ""
    echo "🐳 Vibrai Backend Service - Docker Build Script"
    echo "================================================"
    echo ""
    
    # Verificar prerrequisitos
    check_prerequisites
    
    # Cargar variables de entorno
    load_env_vars "$ENV_FILE"
    
    # Construir imagen
    build_image
    
    # Verificar imagen
    verify_image
    
    # Test rápido
    test_image
    
    # Push si se solicita
    if [ "$PUSH_IMAGE" = "true" ]; then
        push_image
    fi
    
    echo ""
    log_success "Build completado exitosamente!"
    echo ""
    echo "Para ejecutar la imagen:"
    echo "  docker run -d --name vibrai-backend --env-file .env ${IMAGE_NAME}:${IMAGE_TAG}"
    echo ""
    echo "Para ver logs:"
    echo "  docker logs -f vibrai-backend"
    echo ""
}

# Ejecutar función principal
main "$@"