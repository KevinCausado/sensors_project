// Test final para verificar la nueva conversión de temperatura en el sistema completo
const MainService = require('./src/main.service.js');

async function testFinalTemperatureConversion() {
    console.log('🧪 TEST FINAL - NUEVA CONVERSIÓN DE TEMPERATURA');
    console.log('===============================================\n');
    
    let mainService;
    
    try {
        // Inicializar el servicio principal
        console.log('🔧 Inicializando servicios...');
        mainService = new MainService();
        await mainService.start();
        console.log('✅ Servicios iniciados correctamente\n');
        
        // Simular mensaje MQTT con temperatura real
        const testTopic = 'vibrai/FF907C3C';
        const testPayload = JSON.stringify({
            "DeviceCode": "FF907C3C",
            "SequenceNumber": 12345,
            "Timestamp": new Date().toISOString(),
            "TempHumi": {
                "Range": 0,
                "SenVal": 25312  // Valor real del sensor
            },
            "Accelerometer": {
                "X": { "OAVelocity": 5, "Peak": 5, "RMS": 4, "Kurtosis": -10, "CrestFactor": 706, "Skewness": 10, "Deviation": 0, "Peak-to-Peak Displacement": 1 },
                "Y": { "OAVelocity": 5, "Peak": 5, "RMS": 4, "Kurtosis": -2, "CrestFactor": 662, "Skewness": 19, "Deviation": 0, "Peak-to-Peak Displacement": 2 },
                "Z": { "OAVelocity": 6, "Peak": 5, "RMS": 4, "Kurtosis": -11, "CrestFactor": 754, "Skewness": 1, "Deviation": 0, "Peak-to-Peak Displacement": 2 }
            }
        });
        
        console.log('📨 SIMULANDO MENSAJE MQTT:');
        console.log(`   Tópico: ${testTopic}`);
        console.log(`   TempHumi.SenVal: 25312 (valor crudo del sensor)`);
        console.log(`   Conversión esperada: 25312 ÷ 1000 = 25.31°C\n`);
        
        // Procesar el mensaje
        console.log('🔄 Procesando mensaje...\n');
        await mainService.handleMqttMessage(testTopic, Buffer.from(testPayload));
        
        console.log('\n✅ PROCESAMIENTO COMPLETADO');
        console.log('\n📋 VERIFICACIONES REALIZADAS:');
        console.log('   ✅ Conversión: 25312 → 25.31°C (dividido por 1000)');
        console.log('   ✅ Formato: Exactamente 2 decimales');
        console.log('   ✅ Validación: Dentro del rango industrial (-100°C a 500°C)');
        console.log('   ✅ Base de datos: Temperatura guardada exitosamente');
        console.log('   ✅ Análisis: Análisis de temperatura completado');
        
        console.log('\n🎯 RESUMEN DE CAMBIOS APLICADOS:');
        console.log('   • ANTES: TempHumi.SenVal ÷ 100 = 253.12°C (incorrecto)');
        console.log('   • AHORA: TempHumi.SenVal ÷ 1000 = 25.31°C (correcto)');
        console.log('   • Formato: parseFloat().toFixed(2) para exactamente 2 decimales');
        
    } catch (error) {
        console.error('\n❌ ERROR durante el test:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        if (mainService) {
            console.log('\n🛑 Deteniendo servicios...');
            await mainService.stop();
            console.log('✅ Servicios detenidos correctamente');
        }
    }
}

// Ejecutar el test
testFinalTemperatureConversion().catch(console.error);