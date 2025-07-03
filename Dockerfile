# Etapa de construcción
FROM node:22.17.0-alpine3.21 AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar código fuente
COPY . .

# Variables de entorno por defecto (pueden ser sobrescritas)
ARG NODE_ENV=production
ARG NUXT_PUBLIC_SUPABASE_URL=${NUXT_PUBLIC_SUPABASE_URL}
ARG NUXT_PUBLIC_SUPABASE_KEY=${NUXT_PUBLIC_SUPABASE_KEY}
ARG NUXT_PUBLIC_APP_DB_SCHEMA=${NUXT_PUBLIC_APP_DB_SCHEMA}
ARG NUXT_SUPABASE_SERVICE_ROLE_KEY=${NUXT_SUPABASE_SERVICE_ROLE_KEY}

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM node:22.17.0-alpine3.21 AS runner

# Establecer directorio de trabajo
WORKDIR /app

# Instalar solo las dependencias de producción
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar archivos construidos desde la etapa anterior
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/.nuxt ./.nuxt

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxt

# Cambiar propiedad de los archivos
RUN chown -R nuxt:nodejs /app
USER nuxt

# Exponer puerto
EXPOSE 3001

# Comando para ejecutar la aplicación
CMD ["node", ".output/server/index.mjs"] 