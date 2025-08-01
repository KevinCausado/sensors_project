// filepath: /Users/maser/Documents/reportes-vibrai/start.js
#!/usr/bin/env node

// Script de inicio mejorado para el servicio de análisis básico
// Maneja señales de terminación de manera adecuada

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servicio de análisis básico...');

// Crear proceso hijo para ejecutar basic-analysis.js
const child = spawn('node', [path.join(__dirname, 'basic-analysis.js')], {
    stdio: 'inherit',
    env: process.env
});

// Manejar señales de terminación
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
signals.forEach(signal => {
    process.on(signal, () => {
        console.log(`\n⚠️  Recibida señal ${signal}, terminando el servicio...`);
        child.kill(signal);
    });
});

// Manejar la salida del proceso hijo
child.on('close', (code, signal) => {
    if (signal) {
        console.log(`✅ Servicio terminado por señal: ${signal}`);
        process.exit(0);
    } else {
        console.log(`❌ Servicio terminado con código: ${code}`);
        process.exit(code);
    }
});

child.on('error', (error) => {
    console.error('❌ Error al iniciar el servicio:', error);
    process.exit(1);
});

console.log('✅ Servicio iniciado correctamente');