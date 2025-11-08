#!/bin/bash

# Script de construcción y despliegue para el servicio de análisis básico

set -e

echo "🔧 Construyendo servicio de análisis básico..."

# Verificar que existe el archivo .env
if [ ! -f .env ]; then
    echo "❌ Error: No se encontró el archivo .env"
    echo "📝 Copia .env.example como .env y configura las variables necesarias"
    exit 1
fi

# Cargar variables de entorno
source .env

# Verificar variables críticas
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Variables de entorno críticas no configuradas"
    echo "   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas"
    exit 1
fi

echo "✅ Variables de entorno verificadas"

# Construir la imagen Docker
echo "🐳 Construyendo imagen Docker..."
docker build \
    --build-arg SUPABASE_URL="$SUPABASE_URL" \
    --build-arg SUPABASE_KEY="$SUPABASE_KEY" \
    --build-arg SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    --build-arg MQTT_BROKER_URL="$MQTT_BROKER_URL" \
    -t basic-analysis-service:latest \
    .

echo "✅ Imagen construida exitosamente"

# Opción para ejecutar directamente
if [ "$1" = "--run" ]; then
    echo "🚀 Iniciando servicio..."
    docker-compose up -d
    echo "✅ Servicio iniciado. Para ver logs: docker-compose logs -f"
elif [ "$1" = "--dev" ]; then
    echo "🔧 Iniciando en modo desarrollo..."
    docker-compose up
else
    echo "📝 Para ejecutar el servicio:"
    echo "   docker-compose up -d"
    echo "📝 Para ver logs:"
    echo "   docker-compose logs -f"
fi