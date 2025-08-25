// Aplicación Principal - Punto de entrada refactorizado
const MainService = require('./main.service');

class Application {
  constructor() {
    this.mainService = new MainService();
    this.setupSignalHandlers();
  }

  // Configura manejadores de señales para cierre limpio
  setupSignalHandlers() {
    const gracefulShutdown = async (signal) => {
      console.log(`[APP] Recibida señal ${signal}. Iniciando cierre limpio...`);
      
      try {
        await this.mainService.stop();
        console.log('[APP] Aplicación cerrada correctamente');
        process.exit(0);
      } catch (error) {
        console.error('[APP] Error durante el cierre:', error.message);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      console.error('[APP] Excepción no capturada:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[APP] Promesa rechazada no manejada:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }

  // Inicia la aplicación
  async start() {
    try {
      console.log('[APP] Iniciando aplicación Basic Analysis Service...');
      
      await this.mainService.start();
      
      console.log('[APP] Aplicación iniciada correctamente');
      console.log('[APP] Presiona Ctrl+C para detener el servicio');

      // Mantener la aplicación corriendo
      this.keepAlive();

    } catch (error) {
      console.error('[APP] Error al iniciar la aplicación:', error.message);
      process.exit(1);
    }
  }

  // Mantiene la aplicación corriendo
  keepAlive() {
    setInterval(() => {
      const status = this.mainService.getStatus();
      if (!status.isRunning) {
        console.log('[APP] Servicio no está corriendo. Cerrando aplicación...');
        process.exit(1);
      }
    }, 30000); // Verificar cada 30 segundos
  }
}

// Crear e iniciar la aplicación
const app = new Application();
app.start().catch(error => {
  console.error('[APP] Error fatal:', error.message);
  process.exit(1);
});

module.exports = Application;