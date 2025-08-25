const PayloadService = require('./src/services/payload.service.js');

// Mock del database service
const mockDatabaseService = {
  getSensorsByCode: async (code) => {
    return [
      {
        id: 'test-sensor-id',
        name: 'Sensor de Temperatura Test',
        type: 'temperature',
        status: 'active'
      }
    ];
  }
};

async function testTemperatureValidation() {
    console.log('=== TEST DE VALIDACIÓN DE TEMPERATURA ===\n');
    
    const payloadService = new PayloadService(mockDatabaseService);
    
    // Test con temperatura real del sensor (253°C)
    const testPayload = {
        "DeviceCode": "FF907C3C",
        "TempHumi": {
            "Range": 0,
            "Status": 0,
            "Event": 0,
            "SenVal": 25312  // 253.12°C (valor real del sensor)
        },
        "timestamp": new Date().toISOString()
    };
    
    console.log('📄 Payload de prueba:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    console.log('\n🔍 Procesando payload...');
    const result = await payloadService.processPayload('FF907C3C', JSON.stringify(testPayload));
    
    if (result.success) {
        console.log('\n✅ Payload procesado exitosamente');
        console.log(`📊 Lecturas extraídas: ${result.readings.length}`);
        
        if (result.readings.length > 0) {
            const tempReading = result.readings.find(r => r.type === 'temperature');
            if (tempReading) {
                console.log(`🌡️ Temperatura encontrada: ${tempReading.value} °C`);
                
                console.log('\n🔍 Validando lectura...');
                const isValid = payloadService.isValidReading(tempReading);
                console.log(`✅ Validación: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
                
                console.log('\n🔍 Filtrando lecturas...');
                const validReadings = payloadService.filterValidReadings(result.readings);
                console.log(`📊 Lecturas válidas después del filtro: ${validReadings.length}/${result.readings.length}`);
                
                if (validReadings.length > 0) {
                    console.log('\n🎉 ¡ÉXITO! La temperatura ahora pasa la validación');
                } else {
                    console.log('\n❌ ERROR: La temperatura sigue siendo filtrada');
                }
            } else {
                console.log('\n❌ No se encontró lectura de temperatura');
            }
        } else {
            console.log('\n❌ No se extrajeron lecturas');
        }
    } else {
        console.log('\n❌ Error al procesar payload:', result.error);
    }
}

testTemperatureValidation().catch(console.error);