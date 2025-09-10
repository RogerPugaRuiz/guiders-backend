#!/usr/bin/env node

/**
 * Script para verificar si MongoDB Memory Server funciona correctamente
 * Se usa en CI/CD para detectar problemas antes de ejecutar los tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { execSync } = require('child_process');
const fs = require('fs');

async function checkMongoMemoryServer() {
  console.log('🔍 Verificando MongoDB Memory Server...');
  
  const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';
  console.log(`🏗️ Entorno: ${isCI ? 'CI/CD' : 'desarrollo local'}`);
  
  let mongoServer = null;
  
  try {
    // Configuración específica para CI/CD
    const preferredVersion = process.env.MONGOMS_VERSION || (isCI ? '5.0.13' : '6.0.1');
    const options = {
      binary: {
        version: preferredVersion,
        checkMD5: false,
      },
      instance: {
        dbName: 'test-check',
        port: 27018, // Puerto diferente para no interferir
      },
    };

    // En CI intentamos usar el binario del sistema para máxima compatibilidad
    let systemBinary = process.env.MONGOMS_SYSTEM_BINARY;
    if (isCI && !systemBinary) {
      try {
        // Detectar mongod instalado
        const which = execSync('which mongod', { stdio: ['ignore', 'pipe', 'ignore'] })
          .toString()
          .trim();
        if (which) {
          systemBinary = which;
        } else if (fs.existsSync('/usr/bin/mongod')) {
          systemBinary = '/usr/bin/mongod';
        }
      } catch (_) {
        if (fs.existsSync('/usr/bin/mongod')) {
          systemBinary = '/usr/bin/mongod';
        }
      }
    }

    if (systemBinary) {
      options.binary.systemBinary = systemBinary;
      // Evitar conflictos de versión: no pasar "version" si usamos binario del sistema
      if (options.binary && options.binary.version) {
        delete options.binary.version;
      }
      console.log(`🧭 Usando mongod del sistema: ${systemBinary}`);
    }
    
  console.log('⚙️ Opciones de MongoDB Memory Server:', JSON.stringify(options, null, 2));
    
    // Intentar crear instancia
    console.log('🚀 Creando instancia de MongoDB Memory Server...');
    if (systemBinary) {
      console.log('ℹ️ Preferencia: systemBinary (sin descarga de binarios)');
    } else {
      console.log(`ℹ️ Preferencia: descarga de binarios (version=${options.binary.version})`);
    }
    mongoServer = await MongoMemoryServer.create(options);
    
    const uri = mongoServer.getUri();
    console.log('✅ MongoDB Memory Server iniciado correctamente');
    console.log(`📍 URI: ${uri}`);
    
    // Verificar conexión básica
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(uri);
    
    await client.connect();
    console.log('✅ Conexión a MongoDB Memory Server exitosa');
    
    const db = client.db('test-check');
    const collection = db.collection('test');
    
    // Test básico de inserción/consulta
    await collection.insertOne({ test: 'data', timestamp: new Date() });
    const result = await collection.findOne({ test: 'data' });
    
    if (result) {
      console.log('✅ Operaciones de base de datos funcionando correctamente');
    } else {
      throw new Error('No se pudo recuperar el documento insertado');
    }
    
    await client.close();
    
    console.log('🎉 MongoDB Memory Server está funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error en MongoDB Memory Server:');
    console.error('📋 Detalles del error:', error.message);
    
    if (error.message.includes('libcrypto.so.1.1') || error.message.includes('libssl.so.1.1')) {
      console.error('🔧 SOLUCIÓN: Falta compatibilidad OpenSSL 1.1 en el runner');
      console.error('   Acciones posibles:');
      console.error('   1) Instalar libssl3 y crear enlaces simbólicos a *.1.1');
      console.error('      sudo ln -sf /usr/lib/x86_64-linux-gnu/libcrypto.so.3 /usr/lib/x86_64-linux-gnu/libcrypto.so.1.1');
      console.error('      sudo ln -sf /usr/lib/x86_64-linux-gnu/libssl.so.3    /usr/lib/x86_64-linux-gnu/libssl.so.1.1');
      console.error('   2) Preferir binario del sistema configurando MONGOMS_SYSTEM_BINARY=/usr/bin/mongod');
    }
    
    if (error.message.includes('ENOENT') && error.message.includes('mongod')) {
      console.error('🔧 SOLUCIÓN: MongoDB binario no encontrado');
      console.error('   Verificar descarga de binarios de MongoDB Memory Server');
    }
    
    process.exit(1);
    
  } finally {
    // Limpiar recursos
    if (mongoServer) {
      try {
        await mongoServer.stop();
        console.log('🧹 MongoDB Memory Server detenido correctamente');
      } catch (cleanupError) {
        console.warn('⚠️ Error al detener MongoDB Memory Server:', cleanupError.message);
      }
    }
  }
}

// Ejecutar verificación
checkMongoMemoryServer()
  .then(() => {
    console.log('✅ Verificación completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error durante la verificación:', error.message);
    process.exit(1);
  });
