# Proyecto de Análisis Básico

Este proyecto implementa un servicio de análisis básico que se encarga de procesar datos y generar informes. Utiliza tecnologías como Node.js, Supabase y Docker para su funcionamiento.

## Estructura del Proyecto

- **basic-analysis.js**: Contiene la lógica principal para el análisis básico. Se encarga de procesar datos y generar informes.
- **start.js**: Script de inicio del servicio de análisis básico. Maneja la creación de un proceso hijo para ejecutar `basic-analysis.js` y gestiona las señales de terminación.
- **report-scheduler-service.js**: Implementa un servicio que ejecuta tareas programadas, como el envío de informes. Utiliza cron para programar la ejecución y se conecta a Supabase para obtener datos.
- **package.json**: Configuración de npm que enumera las dependencias del proyecto, como Supabase, nodemailer, y otras bibliotecas necesarias.
- **package-lock.json**: Bloquea las versiones de las dependencias instaladas, asegurando que se instalen las mismas versiones en diferentes entornos.
- **Dockerfile**: Define la imagen Docker para el proyecto. Establece el entorno de trabajo, instala dependencias y configura el contenedor para ejecutar el servicio.
- **docker-compose.yml**: Define los servicios y configuraciones para Docker Compose. Especifica cómo construir la imagen y las variables de entorno necesarias para el servicio.
- **captain-definition**: Utilizado por CapRover para definir la configuración del despliegue. Especifica la versión del esquema y la ruta del Dockerfile.
- **build.sh**: Script de construcción y despliegue que verifica la existencia del archivo .env, carga las variables de entorno y construye la imagen Docker.
- **.env**: Contiene las variables de entorno necesarias para la configuración del proyecto, como las credenciales de Supabase.
- **.gitignore**: Especifica los archivos y directorios que deben ser ignorados por Git, como `node_modules` y archivos de configuración local.
- **.dockerignore**: Especifica los archivos y directorios que deben ser ignorados al construir la imagen Docker, como `node_modules` y archivos de entorno.

## Instrucciones de Uso

1. **Configuración del Entorno**: Asegúrate de tener un archivo `.env` configurado con las variables necesarias.
2. **Construcción del Proyecto**: Ejecuta el script `build.sh` para construir la imagen Docker.
3. **Despliegue**: Utiliza `docker-compose up -d` para iniciar el servicio en segundo plano.
4. **Ver Logs**: Para ver los logs del servicio, utiliza `docker-compose logs -f`.

## Requisitos

- Node.js
- Docker
- Docker Compose

## Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o un pull request para discutir cambios o mejoras.