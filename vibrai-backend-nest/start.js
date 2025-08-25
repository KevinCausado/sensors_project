const { spawn } = require('child_process');

let childProcess;

function startBasicAnalysis() {
  console.log('Iniciando aplicación refactorizada...');
  
  childProcess = spawn('node', ['src/app.js'], {
    stdio: 'inherit'
  });

  childProcess.on('close', (code) => {
    console.log(`Aplicación terminó con código: ${code}`);
    if (code !== 0) {
      console.log('Reiniciando aplicación en 5 segundos...');
      setTimeout(startBasicAnalysis, 5000);
    }
  });

  childProcess.on('error', (err) => {
    console.error('Error al ejecutar aplicación:', err);
    setTimeout(startBasicAnalysis, 5000);
  });
}

function gracefulShutdown() {
  console.log('Cerrando aplicación...');
  if (childProcess) {
    childProcess.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startBasicAnalysis();
