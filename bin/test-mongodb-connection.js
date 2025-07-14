#!/usr/bin/env node

/**
 * Script para probar la conexión a MongoDB usando el mismo patrón que NestJS
 * Sigue exactamente la misma lógica que AppModule.getMongoUri() y AppModule.getMongoOptions()
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Función que replica AppModule.getMongoUri()
function getMongoUri() {
  const nodeEnv = process.env.NODE_ENV;
  const isTest = nodeEnv === 'test';

  console.log('=== MONGODB URI CONSTRUCTION ===');
  console.log(`NODE_ENV: ${nodeEnv}`);
  console.log(`Is Test Environment: ${isTest}`);

  const mongoUser = isTest
    ? process.env.TEST_MONGODB_USERNAME
    : process.env.MONGODB_USERNAME;

  const mongoPassword = isTest
    ? process.env.TEST_MONGODB_PASSWORD
    : process.env.MONGODB_PASSWORD;

  const mongoHost = process.env.MONGODB_HOST || 'localhost';
  const mongoPort = process.env.MONGODB_PORT || '27017';
  const mongoDatabase = isTest
    ? process.env.TEST_MONGODB_DATABASE || 'guiders-test'
    : process.env.MONGODB_DATABASE || 'guiders';

  console.log('Raw Environment Variables:');
  console.log(`  MONGODB_USERNAME: ${mongoUser || 'NOT SET'}`);
  console.log(`  MONGODB_PASSWORD: ${mongoPassword ? '[HIDDEN]' : 'NOT SET'}`);
  console.log(`  MONGODB_HOST: ${mongoHost}`);
  console.log(`  MONGODB_PORT: ${mongoPort}`);
  console.log(`  MONGODB_DATABASE: ${mongoDatabase}`);

  let uri;
  if (mongoUser && mongoPassword) {
    const encodedUser = encodeURIComponent(mongoUser);
    const encodedPassword = encodeURIComponent(mongoPassword);
    uri = `mongodb://${encodedUser}:${encodedPassword}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`;
  } else {
    uri = `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`;
  }

  const safeUri = uri.replace(/:([^:@]+)@/, ':[HIDDEN]@');
  console.log(`Final URI (safe): ${safeUri}`);
  console.log('=== END MONGODB URI CONSTRUCTION ===');

  return uri;
}

// Función que replica AppModule.getMongoOptions()
function getMongoOptions() {
  console.log('=== MONGODB OPTIONS CONSTRUCTION ===');
  
  const mongooseOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
  };

  console.log('MongoDB Options Object:');
  console.log(JSON.stringify(mongooseOptions, null, 2));
  console.log('=== END MONGODB OPTIONS CONSTRUCTION ===');

  return mongooseOptions;
}

async function testMongoConnection() {
  console.log('=== TESTING MONGODB CONNECTION (NestJS Pattern) ===');
  
  const uri = getMongoUri();
  const options = getMongoOptions();

  try {
    const client = new MongoClient(uri, options);
    
    console.log('\nAttempting to connect...');
    await client.connect();
    
    console.log('✅ Connection successful!');
    
    // Probar una operación simple
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log(`📂 Found ${collections.length} collections`);
    
    if (collections.length > 0) {
      console.log('Collections:', collections.map(c => c.name).join(', '));
    }
    
    await client.close();
    console.log('🔌 Connection closed');
    
    console.log('\n🎉 SUCCESS: MongoDB connection works correctly!');
    console.log('Your NestJS application should work with these settings.');
    
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
    console.log('6. Verify the database name exists and user has access');
    
    process.exit(1);
  }
}

testMongoConnection().catch(console.error);
