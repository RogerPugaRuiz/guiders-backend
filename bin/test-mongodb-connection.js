#!/usr/bin/env node

/**
 * Script simplificado para probar la conexión a MongoDB
 * Prueba diferentes configuraciones de autenticación
 */

const { MongoClient } = require('mongodb');
const path = require('path');

// Configurar dotenv según NODE_ENV, igual que en app.module.ts
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.resolve(process.cwd(), envFile);

console.log(`Loading environment from: ${envFile}`);
require('dotenv').config({ path: envPath });

async function testConnection(uri, label, options = {}) {
  const defaultOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
    ...options
  };

  const safeUri = uri.replace(/:([^:@]+)@/, ':[HIDDEN]@');
  console.log(`\n--- ${label} ---`);
  console.log(`URI: ${safeUri}`);

  try {
    const client = new MongoClient(uri, defaultOptions);
    
    console.log('Attempting to connect...');
    await client.connect();
    
    console.log('✅ Connection successful!');
    
    // Probar una operación simple
    const mongoDatabase = process.env.MONGODB_DATABASE || 'guiders';
    const db = client.db(mongoDatabase);
    const collections = await db.listCollections().toArray();
    console.log(`📂 Found ${collections.length} collections`);
    
    if (collections.length > 0) {
      console.log('Collections:', collections.map(c => c.name).join(', '));
    }
    
    await client.close();
    console.log('🔌 Connection closed');
    
    return true;
    
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    if (error.code) {
      console.log(`Error code: ${error.code}`);
    }
    return false;
  }
}

async function testMongoConnection() {
  console.log('=== TESTING MONGODB CONNECTION ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Config file: ${envFile}`);
  
  const mongoUser = 'admin';
  const mongoPassword = process.env.MONGODB_ROOT_PASSWORD || 'password';
  const mongoHost = process.env.MONGODB_HOST || 'localhost';
  const mongoPort = process.env.MONGODB_PORT || '27017';
  const mongoDatabase = process.env.MONGODB_DATABASE || 'guiders';

  console.log('MongoDB Configuration:');
  console.log(`  User: ${mongoUser}`);
  console.log(`  Password: ${mongoPassword ? '[SET]' : '[NOT SET]'}`);
  console.log(`  Host: ${mongoHost}`);
  console.log(`  Port: ${mongoPort}`);
  console.log(`  Database: ${mongoDatabase}`);

  // Diferentes configuraciones de autenticación para probar
  const configurations = [
    {
      label: 'Testing with authSource=database (Recommended for app user)',
      uri: `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=${mongoDatabase}`
    },
    {
      label: 'Testing with authSource=admin (Standard)',
      uri: `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`
    },
    {
      label: 'Testing without authSource (default)',
      uri: `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}`
    },
    {
      label: 'Testing with root user (admin:admin123)',
      uri: `mongodb://admin:${encodeURIComponent(process.env.MONGODB_ROOT_PASSWORD || 'admin123')}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`
    },
    {
      label: 'Testing with authMechanism=SCRAM-SHA-1',
      uri: `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=${mongoDatabase}&authMechanism=SCRAM-SHA-1`
    },
    {
      label: 'Testing with authMechanism=SCRAM-SHA-256',
      uri: `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=${mongoDatabase}&authMechanism=SCRAM-SHA-256`
    },
    {
      label: 'Testing without credentials (no auth)',
      uri: `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`
    }
  ];

  let successfulConnection = false;

  for (const config of configurations) {
    const success = await testConnection(config.uri, config.label);
    if (success) {
      successfulConnection = true;
      console.log(`\n🎉 SUCCESS: MongoDB connection works with configuration: ${config.label}`);
      console.log(`✅ Use this URI pattern: ${config.uri.replace(/:([^:@]+)@/, ':[PASSWORD]@')}`);
      break;
    }
  }

  if (!successfulConnection) {
    console.log('\n❌ ALL CONFIGURATIONS FAILED');
    console.log('\n� Troubleshooting steps:');
    console.log('1. Check if MongoDB server is running:');
    console.log('   sudo systemctl status mongod');
    console.log('   OR');
    console.log('   ps aux | grep mongod');
    
    console.log('\n2. Try connecting directly with mongo CLI:');
    console.log(`   mongo mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`);
    
    console.log('\n3. Check MongoDB logs:');
    console.log('   sudo tail -f /var/log/mongodb/mongod.log');
    
    console.log('\n4. Verify user exists and has proper permissions:');
    console.log('   # Connect as root user');
    console.log('   mongosh "mongodb://admin:admin123@localhost:27017/admin"');
    console.log('   # Check users in your database');
    console.log(`   use ${mongoDatabase}`);
    console.log('   db.getUsers()');
    
    console.log('\n5. Create user manually if needed:');
    console.log('   # Connect as root');
    console.log('   mongosh "mongodb://admin:admin123@localhost:27017/admin"');
    console.log(`   use ${mongoDatabase}`);
    console.log(`   db.createUser({user:"${mongoUser}",pwd:"${mongoPassword}",roles:[{role:"readWrite",db:"${mongoDatabase}"},{role:"dbAdmin",db:"${mongoDatabase}"}]})`);
    
    console.log('\n6. If using Docker, recreate the container:');
    console.log('   docker-compose -f docker-compose-prod.yml down mongodb');
    console.log('   docker volume rm guiders-backend_mongodb-data');
    console.log('   docker-compose -f docker-compose-prod.yml up -d mongodb');
    process.exit(1);
  }
}

testMongoConnection().catch(console.error);
