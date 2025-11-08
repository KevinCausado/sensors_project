# Usar imagen base oficial de Node.js
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para algunas librerías de Node.js
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Definir argumentos de construcción para variables de entorno
ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG MQTT_BROKER_URL

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs appuser

# Copiar el código fuente
COPY basic-analysis.js start.js report-scheduler-service.js ./

# Crear directorio para logs si es necesario
RUN mkdir -p /app/logs

# Cambiar propiedad de los archivos al usuario no-root
RUN chown -R appuser:nodejs /app

# Cambiar al usuario no-root
USER appuser

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV TZ=America/Santiago

# Variables de entorno específicas del proyecto
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_KEY=${SUPABASE_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV MQTT_BROKER_URL=${MQTT_BROKER_URL}

# El puerto no es necesario para este servicio MQTT, pero lo mantenemos para healthcheck
EXPOSE 3000

# Comando de salud para verificar que el proceso está corriendo
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD pgrep -f "node basic-analysis.js" || exit 1

# Comando para ejecutar la aplicación
CMD ["node", "start.js"]