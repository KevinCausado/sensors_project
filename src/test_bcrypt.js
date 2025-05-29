import bcrypt from 'bcryptjs';

async function testBcrypt() {
    const passwordToHash = 'admin123';
    const hardcodedHashFromDB = '$2a$10$X7cqhOYR2h4RzY5IH.Lw2uwAhmp3XvFHRpoLXWx0tQ5WgEcnAv74i'; // <-- Pega AQUÍ el hash EXACTO de tu último log en la DB

    console.log('--- TEST BCrypt ---');
    console.log('Contraseña de prueba (texto plano):', passwordToHash);
    console.log('Hash de la DB (copiado):', hardcodedHashFromDB);

    // 1. Hash de la contraseña de prueba
    const generatedHash = await bcrypt.hash(passwordToHash, 10);
    console.log('Hash generado a partir de la contraseña de prueba:', generatedHash);

    // 2. Comparar la contraseña de prueba con el hash generado
    const compareGenerated = await bcrypt.compare(passwordToHash, generatedHash);
    console.log('Comparación (contraseña_prueba vs hash_generado):', compareGenerated); // DEBERÍA SER TRUE

    // 3. Comparar la contraseña de prueba con el hash de la DB
    const compareWithDB = await bcrypt.compare(passwordToHash, hardcodedHashFromDB);
    console.log('Comparación (contraseña_prueba vs hash_de_DB):', compareWithDB); // ESTO ES LO QUE QUEREMOS QUE SEA TRUE
}

testBcrypt();