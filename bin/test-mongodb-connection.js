#!/usr/bin/env node

/**
 * Script simplificado para probar la conexión a MongoDB
 * Prueba diferentes configuraciones de autenticación
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testMongoConnection() {
  console.log('=== TESTING MONGODB CONNECTION ===');
  
  const mongoUser = process.env.MONGODB_USERNAME || 'admin';
  const mongoPassword = process.env.MONGODB_PASSWORD || 'password';
  const mongoHost = process.env.MONGODB_HOST || 'localhost';
  const mongoPort = process.env.MONGODB_PORT || '27017';
  const mongoDatabase = process.env.MONGODB_DATABASE || 'guiders';

  console.log('MongoDB Configuration:');
  console.log(`  User: ${mongoUser}`);
  console.log(`  Password: ${mongoPassword ? '[HIDDEN - Length: ' + mongoPassword.length + ']' : '[NOT SET]'}`);
  console.log(`  Host: ${mongoHost}`);
  console.log(`  Port: ${mongoPort}`);
  console.log(`  Database: ${mongoDatabase}`);

  // Configuración estándar de NestJS
  const uri = `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`;
  const safeUri = uri.replace(/:([^:@]+)@/, ':[HIDDEN]@');
  
  console.log(`\n--- Testing Standard NestJS Configuration ---`);
  console.log(`URI: ${safeUri}`);

  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
  };

  console.log('Options:', JSON.stringify(options, null, 2));

  try {
    const client = new MongoClient(uri, options);
    
    console.log('Attempting to connect...');
    await client.connect();
    
    console.log('✅ Connection successful!');
    
    // Probar una operación simple
    const db = client.db(mongoDatabase);
    const collections = await db.listCollections().toArray();
    console.log(`📂 Found ${collections.length} collections`);
    
    if (collections.length > 0) {
      console.log('Collections:', collections.map(c => c.name).join(', '));
    }
    
    await client.close();
    console.log('🔌 Connection closed');
    
    console.log('\n🎉 SUCCESS: MongoDB connection works correctly!');
    
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    
    if (error.code) {
      console.log(`Error code: ${error.code}`);
    }
    
    console.log('\n💡 Common solutions:');
    console.log('1. Verify MongoDB credentials in environment variables');
    console.log('2. Check if MongoDB server is running');
    console.log('3. Ensure the user has proper permissions');
    console.log('4. Try connecting to MongoDB directly with mongo CLI');
    console.log('5. Check if authSource=admin is correct for your setup');
    
    process.exit(1);
  }
}

testMongoConnection().catch(console.error);
