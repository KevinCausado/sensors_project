# Usar imagen base oficial de Node.js
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para algunas librerías de Node.js
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Definir argumentos de construcción para variables de entorno
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG MQTT_BROKER_URL
ARG NODE_ENV=production

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs appuser

# Copiar la estructura completa de la aplicación refactorizada
COPY src/ ./src/
COPY basic-analysis.js start.js ./

# Crear directorios necesarios
RUN mkdir -p /app/logs /app/tmp

# Cambiar propiedad de los archivos al usuario no-root
RUN chown -R appuser:nodejs /app

# Cambiar al usuario no-root
USER appuser

# Variables de entorno por defecto
ENV NODE_ENV=${NODE_ENV}
ENV TZ=America/Santiago

# Variables de entorno específicas del proyecto
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV MQTT_BROKER_URL=${MQTT_BROKER_URL}

# Exponer puerto para healthcheck y posibles endpoints futuros
EXPOSE 3000

# Comando de salud mejorado para verificar que la aplicación está funcionando
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD pgrep -f "node.*app.js" > /dev/null || exit 1

# Comando para ejecutar la aplicación refactorizada
CMD ["node", "src/app.js"]