#!/usr/bin/env node

/**
 * Script para verificar la conectividad de Mongo Express con MongoDB
 * Útil para diagnosticar problemas de conexión en staging
 */

const { spawn } = require('child_process');

console.log('🔍 Verificando conectividad de Mongo Express...');

// Función para ejecutar comandos Docker
function runDockerCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', ['exec', ...args, command], {
      stdio: 'pipe'
    });

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Command failed with code ${code}: ${error}`));
      }
    });
  });
}

async function verifyMongoExpress() {
  try {
    console.log('1. Verificando estado del contenedor mongo-express-staging...');
    
    // Verificar si el contenedor existe y está corriendo
    try {
      const containerStatus = await runDockerCommand('docker', ['ps', '--filter', 'name=mongo-express-staging', '--format', 'table {{.Names}}\t{{.Status}}']);
      console.log('📋 Estado del contenedor:', containerStatus);
    } catch (error) {
      console.log('❌ Error verificando contenedor:', error.message);
    }

    console.log('\n2. Verificando conectividad desde mongo-express a mongodb-staging...');
    
    // Verificar conectividad de red
    try {
      await runDockerCommand('mongo-express-staging', ['ping', '-c', '2', 'mongodb-staging']);
      console.log('✅ Ping a mongodb-staging exitoso');
    } catch (error) {
      console.log('❌ No se puede hacer ping a mongodb-staging:', error.message);
    }

    console.log('\n3. Verificando resolución DNS...');
    
    // Verificar resolución DNS
    try {
      const dnsResult = await runDockerCommand('mongo-express-staging', ['nslookup', 'mongodb-staging']);
      console.log('✅ Resolución DNS exitosa:', dnsResult);
    } catch (error) {
      console.log('❌ Error de resolución DNS:', error.message);
    }

    console.log('\n4. Verificando variables de entorno en mongo-express...');
    
    // Verificar variables de entorno críticas
    try {
      const envVars = await runDockerCommand('mongo-express-staging', ['env']);
      const mongoVars = envVars.split('\n').filter(line => 
        line.includes('ME_CONFIG_MONGODB') || 
        line.includes('MONGODB')
      );
      console.log('📋 Variables de MongoDB en mongo-express:');
      mongoVars.forEach(line => console.log(`  ${line}`));
    } catch (error) {
      console.log('❌ Error verificando variables de entorno:', error.message);
    }

    console.log('\n5. Verificando logs de mongo-express...');
    
    // Mostrar logs recientes
    try {
      const logs = await runDockerCommand('docker', ['logs', 'mongo-express-staging', '--tail', '20']);
      console.log('📋 Logs recientes de mongo-express:');
      console.log(logs);
    } catch (error) {
      console.log('❌ Error obteniendo logs:', error.message);
    }

    console.log('\n6. Verificando puertos expuestos...');
    
    // Verificar puertos
    try {
      const ports = await runDockerCommand('docker', ['port', 'mongo-express-staging']);
      console.log('📋 Puertos expuestos:', ports);
    } catch (error) {
      console.log('❌ Error verificando puertos:', error.message);
    }

    console.log('\n✅ Verificación de Mongo Express completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    process.exit(1);
  }
}

// Ejecutar verificación si se llama directamente
if (require.main === module) {
  verifyMongoExpress();
}

module.exports = { verifyMongoExpress };