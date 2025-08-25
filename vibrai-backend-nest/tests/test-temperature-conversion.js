// Test para verificar la nueva conversión de temperatura
const PayloadService = require('./src/services/payload.service.js');

// Mock del database service
const mockDatabaseService = {
  // Mock methods if needed
};

async function testTemperatureConversion() {
    console.log('=== TEST DE CONVERSIÓN DE TEMPERATURA ===\n');
    
    const payloadService = new PayloadService(mockDatabaseService);
    
    // Test con diferentes valores de temperatura
    const testCases = [
        { input: 25312, expected: 25.31, description: "Valor real del sensor (25312 -> 25.31°C)" },
        { input: 25500, expected: 25.50, description: "Valor de prueba (25500 -> 25.50°C)" },
        { input: 20000, expected: 20.00, description: "Valor redondo (20000 -> 20.00°C)" },
        { input: 12345, expected: 12.35, description: "Valor con decimales (12345 -> 12.35°C)" },
        { input: 1234, expected: 1.23, description: "Valor pequeño (1234 -> 1.23°C)" }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n🧪 ${testCase.description}`);
        
        const testPayload = {
            "DeviceCode": "FF907C3C",
            "TempHumi": {
                "Range": 0,
                "SenVal": testCase.input
            },
            "timestamp": new Date().toISOString()
        };
        
        console.log(`   📥 Entrada: TempHumi.SenVal = ${testCase.input}`);
        console.log(`   🎯 Esperado: ${testCase.expected}°C`);
        
        // Extraer lecturas
        const readings = payloadService.extractSensorReadings(testPayload);
        
        // Buscar la lectura de temperatura
        const tempReading = readings.find(r => r.type === 'temperature');
        
        if (tempReading) {
            console.log(`   ✅ Resultado: ${tempReading.value}°C`);
            
            // Verificar que el resultado coincide con lo esperado
            if (tempReading.value === testCase.expected) {
                console.log(`   ✅ CORRECTO: Conversión exitosa`);
            } else {
                console.log(`   ❌ ERROR: Esperado ${testCase.expected}, obtenido ${tempReading.value}`);
            }
            
            // Verificar que tiene exactamente 2 decimales
            const decimalPart = tempReading.value.toString().split('.')[1];
            if (decimalPart && decimalPart.length <= 2) {
                console.log(`   ✅ FORMATO: Máximo 2 decimales (${decimalPart ? decimalPart.length : 0} decimales)`);
            } else {
                console.log(`   ❌ FORMATO: Más de 2 decimales (${decimalPart ? decimalPart.length : 0} decimales)`);
            }
        } else {
            console.log(`   ❌ ERROR: No se encontró lectura de temperatura`);
        }
    }
    
    console.log('\n=== RESUMEN ===');
    console.log('✅ Conversión: Valor / 1000 (corrió el punto decimal una posición más)');
    console.log('✅ Formato: parseFloat().toFixed(2) para exactamente 2 decimales');
    console.log('✅ Ejemplo: 25312 -> 25.31°C (antes era 253.12°C)');
}

// Ejecutar el test
testTemperatureConversion().catch(console.error);