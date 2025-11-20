#!/usr/bin/env node

/**
 * Script para verificar conectividad MongoDB en tests E2E
 * Verifica que MongoDB esté disponible en el puerto configurado
 */

const { MongoClient } = require('mongodb');

async function checkMongoConnection() {
  console.log('🔍 Verificando conectividad MongoDB para tests E2E...\n');

  // Cargar variables de entorno como lo haría el test
  const mongoHost = process.env.TEST_MONGODB_HOST || 'localhost';
  const mongoPort = process.env.TEST_MONGODB_PORT || '27017';
  const mongoDatabase = process.env.TEST_MONGODB_DATABASE || 'guiders-test';
  const mongoUser = process.env.TEST_MONGODB_ROOT_USERNAME || 'admin_test';
  const mongoPassword = process.env.TEST_MONGODB_ROOT_PASSWORD || 'admin123';

  const uri = `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`;

  console.log(`📋 Configuración MongoDB:`);
  console.log(`   Host: ${mongoHost}`);
  console.log(`   Puerto: ${mongoPort}`);
  console.log(`   Database: ${mongoDatabase}`);
  console.log(`   Usuario: ${mongoUser}`);
  console.log(`   URI: mongodb://${mongoUser}:***@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin\n`);

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    console.log('🔌 Intentando conectar...');
    await client.connect();
    
    console.log('✅ Conexión exitosa!');
    
    // Verificar ping
    const adminDb = client.db().admin();
    const pingResult = await adminDb.ping();
    console.log('🏓 Ping exitoso:', pingResult);

    // Listar databases
    const databases = await adminDb.listDatabases();
    console.log('📊 Databases disponibles:', databases.databases.map(db => db.name));

    console.log('\n🎉 MongoDB está listo para tests E2E!');
    
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Sugerencias:');
      console.log('   • Verifica que MongoDB esté corriendo localmente');
      console.log('   • Para desarrollo: docker-compose up -d mongodb-test');
      console.log('   • Para CI: El servicio MongoDB debe estar configurado en el workflow');
      console.log(`   • Verifica que el puerto ${mongoPort} esté disponible`);
    }
    
    process.exit(1);
  } finally {
    await client.close();
  }
}

checkMongoConnection().catch(console.error);