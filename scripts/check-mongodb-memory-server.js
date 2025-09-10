#!/usr/bin/env node

/**
 * Script para verificar si MongoDB Memory Server funciona correctamente
 * Se usa en CI/CD para detectar problemas antes de ejecutar los tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

async function checkMongoMemoryServer() {
  console.log('🔍 Verificando MongoDB Memory Server...');
  
  const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';
  console.log(`🏗️ Entorno: ${isCI ? 'CI/CD' : 'desarrollo local'}`);
  
  let mongoServer = null;
  
  try {
    // Configuración específica para CI/CD
    const options = {
      binary: {
        version: '6.0.1',
        checkMD5: false,
      },
      instance: {
        dbName: 'test-check',
        port: 27018, // Puerto diferente para no interferir
      },
    };
    
    console.log('⚙️ Opciones de MongoDB Memory Server:', JSON.stringify(options, null, 2));
    
    // Intentar crear instancia
    console.log('🚀 Creando instancia de MongoDB Memory Server...');
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
    
    if (error.message.includes('libcrypto.so.1.1')) {
      console.error('🔧 SOLUCIÓN: Falta la biblioteca libcrypto.so.1.1');
      console.error('   En Ubuntu/Debian, instalar con:');
      console.error('   sudo apt-get install libssl-dev libssl1.1');
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
