#!/usr/bin/env node

/**
 * Script específico para verificar MongoDB después del deploy
 * Realiza pruebas más exhaustivas que el test básico
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function verifyMongoDeployment() {
  console.log('=== VERIFICACIÓN POST-DEPLOY MONGODB ===');
  
  const mongoUser = process.env.MONGODB_USERNAME || 'admin';
  const mongoPassword = process.env.MONGODB_PASSWORD || 'password';
  const mongoHost = process.env.MONGODB_HOST || 'localhost';
  const mongoPort = process.env.MONGODB_PORT || '27017';
  const mongoDatabase = process.env.MONGODB_DATABASE || 'guiders';

  console.log('📋 Configuración MongoDB:');
  console.log(`  Usuario: ${mongoUser}`);
  console.log(`  Host: ${mongoHost}`);
  console.log(`  Puerto: ${mongoPort}`);
  console.log(`  Base de datos: ${mongoDatabase}`);
  console.log(`  Contraseña: ${mongoPassword ? '✅ Configurada' : '❌ No configurada'}`);

  const uri = `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`;
  
  const options = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000,
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
  };

  let client;
  
  try {
    console.log('\n🔄 Conectando a MongoDB...');
    client = new MongoClient(uri, options);
    await client.connect();
    console.log('✅ Conexión establecida exitosamente');

    // Verificar base de datos
    const db = client.db(mongoDatabase);
    
    // Test 1: Listar colecciones
    console.log('\n📂 Verificando colecciones...');
    const collections = await db.listCollections().toArray();
    console.log(`✅ Encontradas ${collections.length} colecciones`);
    
    if (collections.length > 0) {
      console.log('  Colecciones:', collections.map(c => c.name).join(', '));
    }

    // Test 2: Verificar permisos de escritura
    console.log('\n✍️ Verificando permisos de escritura...');
    const testCollection = db.collection('_deployment_test');
    const testDoc = { 
      timestamp: new Date(), 
      test: 'deployment_verification',
      deployedAt: new Date().toISOString() 
    };
    
    await testCollection.insertOne(testDoc);
    console.log('✅ Escritura exitosa');

    // Test 3: Verificar permisos de lectura
    console.log('\n📖 Verificando permisos de lectura...');
    const readDoc = await testCollection.findOne({ test: 'deployment_verification' });
    if (readDoc) {
      console.log('✅ Lectura exitosa');
    } else {
      throw new Error('No se pudo leer el documento de prueba');
    }

    // Test 4: Limpiar documento de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    await testCollection.deleteMany({ test: 'deployment_verification' });
    console.log('✅ Limpieza exitosa');

    // Test 5: Verificar índices (si existen)
    console.log('\n🔍 Verificando índices...');
    const collections_with_indexes = [];
    for (const collection of collections) {
      const indexes = await db.collection(collection.name).indexes();
      if (indexes.length > 1) { // Más que solo el índice _id
        collections_with_indexes.push({
          name: collection.name,
          indexes: indexes.length
        });
      }
    }
    
    if (collections_with_indexes.length > 0) {
      console.log('✅ Índices encontrados:');
      collections_with_indexes.forEach(col => {
        console.log(`  - ${col.name}: ${col.indexes} índices`);
      });
    } else {
      console.log('ℹ️ No se encontraron índices personalizados');
    }

    // Test 6: Verificar estadísticas de la base de datos
    console.log('\n📊 Estadísticas de la base de datos...');
    const stats = await db.stats();
    console.log(`✅ Tamaño de datos: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`✅ Número de documentos: ${stats.objects || 0}`);

    console.log('\n🎉 ÉXITO: Verificación completa de MongoDB terminada');
    console.log('✅ Todos los tests pasaron correctamente');
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    
    if (error.code) {
      console.log(`Código de error: ${error.code}`);
    }
    
    console.log('\n💡 Acciones recomendadas:');
    console.log('1. Verificar que el contenedor MongoDB esté ejecutándose');
    console.log('2. Validar las credenciales en el archivo .env.production');
    console.log('3. Comprobar la conectividad de red');
    console.log('4. Revisar los logs de Docker: docker logs mongodb-prod');
    console.log('5. Verificar que authSource=admin sea correcto');
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  verifyMongoDeployment().catch(console.error);
}

module.exports = { verifyMongoDeployment };
