const MainService = require('./src/main.service.js');

async function testCompleteDbWrite() {
    console.log('=== INICIANDO TEST DE ESCRITURA COMPLETA EN BD ===');
    
    const mainService = new MainService();
    
    try {
        // Inicializar servicios
        console.log('Inicializando servicios...');
        await mainService.start();
        console.log('✓ Servicios inicializados correctamente');
        
        // Esperar un momento para que se establezcan las conexiones
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simular mensaje MQTT con formato real del firmware
        const testMessage = {
            topic: 'vibrai/FF907C3C',
            message: JSON.stringify({
                "DeviceCode": "FF907C3C",
                "TempHumi": {
                    "Range": 0,
                    "Status": 0,
                    "Event": 0,
                    "SenVal": 2550  // 25.50°C (valor realista)
                },
                "Accelerometer": {
                    "X": {
                        "Range": 0,
                        "Status": 0,
                        "Event": 0,
                        "SenVal": 1024
                    },
                    "Y": {
                        "Range": 0,
                        "Status": 0,
                        "Event": 0,
                        "SenVal": 2048
                    },
                    "Z": {
                        "Range": 0,
                        "Status": 0,
                        "Event": 0,
                        "SenVal": 4096
                    }
                },
                "timestamp": new Date().toISOString()
            })
        };
        
        console.log('\n=== PROCESANDO MENSAJE DE TEST ===');
        console.log('Mensaje:', JSON.stringify(JSON.parse(testMessage.message), null, 2));
        
        // Procesar el mensaje usando el método correcto
        await mainService.handleMqttMessage(testMessage.topic, testMessage.message);
        
        console.log('\n=== TEST COMPLETADO ===');
        console.log('✓ Mensaje procesado correctamente');
        console.log('✓ Verificar logs arriba para confirmar escritura de temperatura y vibración');
        
    } catch (error) {
        console.error('❌ Error durante el test:', error);
    } finally {
        // Detener servicios
        console.log('\nDeteniendo servicios...');
        await mainService.stop();
        console.log('✓ Servicios detenidos');
        process.exit(0);
    }
}

// Ejecutar el test
testCompleteDbWrite().catch(console.error);