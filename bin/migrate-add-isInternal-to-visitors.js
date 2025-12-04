#!/usr/bin/env node

/**
 * Migración MongoDB: Agregar campo isInternal a visitantes (visitors-v2)
 *
 * Esta migración añade el campo isInternal (boolean) a todos los documentos
 * de la colección visitorsv2 que no lo tengan, estableciendo su valor por
 * defecto en false.
 *
 * También crea los índices necesarios para optimizar queries de visitantes internos.
 *
 * Uso:
 *   node bin/migrate-add-isInternal-to-visitors.js         # Ejecutar migración
 *   node bin/migrate-add-isInternal-to-visitors.js verify  # Verificar migración
 *   node bin/migrate-add-isInternal-to-visitors.js rollback # Revertir migración
 */

const { MongoClient } = require('mongodb');

// Configuración de conexión
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'guiders';
const COLLECTION_NAME = 'visitorsv2';

/**
 * Conectar a MongoDB
 */
async function connectToMongo() {
  console.log(`🔗 Conectando a MongoDB: ${MONGODB_URI}`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Conexión exitosa a MongoDB');
  return client;
}

/**
 * Ejecutar migración: agregar isInternal a visitantes
 */
async function migrate() {
  const client = await connectToMongo();

  try {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log(`\n📝 Iniciando migración para colección: ${COLLECTION_NAME}`);

    // 1. Contar documentos sin campo isInternal
    const countWithoutField = await collection.countDocuments({
      isInternal: { $exists: false }
    });

    console.log(`📊 Documentos sin campo isInternal: ${countWithoutField}`);

    if (countWithoutField === 0) {
      console.log('✅ Todos los documentos ya tienen el campo isInternal');
      return;
    }

    // 2. Actualizar documentos: agregar isInternal: false
    console.log('🔄 Agregando campo isInternal: false a documentos...');
    const updateResult = await collection.updateMany(
      { isInternal: { $exists: false } },
      { $set: { isInternal: false } }
    );

    console.log(`✅ Documentos actualizados: ${updateResult.modifiedCount}`);

    // 3. Crear índices
    console.log('\n🔧 Creando índices...');

    // Índice simple para isInternal
    try {
      await collection.createIndex({ isInternal: 1 }, { name: 'idx_isInternal' });
      console.log('✅ Índice creado: idx_isInternal');
    } catch (error) {
      if (error.code === 85) { // IndexOptionsConflict
        console.log('⚠️  Índice idx_isInternal ya existe');
      } else {
        throw error;
      }
    }

    // Índice compuesto para queries de búsqueda
    try {
      await collection.createIndex(
        { tenantId: 1, isInternal: 1, updatedAt: -1 },
        { name: 'idx_tenant_isInternal_updated' }
      );
      console.log('✅ Índice creado: idx_tenant_isInternal_updated');
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠️  Índice idx_tenant_isInternal_updated ya existe');
      } else {
        throw error;
      }
    }

    // 4. Verificar migración
    console.log('\n🔍 Verificando migración...');
    const totalDocs = await collection.countDocuments({});
    const docsWithIsInternal = await collection.countDocuments({
      isInternal: { $exists: true }
    });
    const internalDocs = await collection.countDocuments({ isInternal: true });
    const externalDocs = await collection.countDocuments({ isInternal: false });

    console.log(`📊 Estadísticas post-migración:`);
    console.log(`   Total de documentos: ${totalDocs}`);
    console.log(`   Con campo isInternal: ${docsWithIsInternal}`);
    console.log(`   Visitantes internos (true): ${internalDocs}`);
    console.log(`   Visitantes externos (false): ${externalDocs}`);

    if (totalDocs === docsWithIsInternal) {
      console.log('\n✅ Migración completada exitosamente');
    } else {
      console.log('\n⚠️  Advertencia: Algunos documentos no tienen el campo isInternal');
    }

  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

/**
 * Verificar estado de la migración
 */
async function verify() {
  const client = await connectToMongo();

  try {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log(`\n🔍 Verificando migración para colección: ${COLLECTION_NAME}`);

    const totalDocs = await collection.countDocuments({});
    const docsWithIsInternal = await collection.countDocuments({
      isInternal: { $exists: true }
    });
    const docsWithoutIsInternal = await collection.countDocuments({
      isInternal: { $exists: false }
    });
    const internalDocs = await collection.countDocuments({ isInternal: true });
    const externalDocs = await collection.countDocuments({ isInternal: false });

    console.log(`\n📊 Estado de la migración:`);
    console.log(`   Total de documentos: ${totalDocs}`);
    console.log(`   Con campo isInternal: ${docsWithIsInternal}`);
    console.log(`   Sin campo isInternal: ${docsWithoutIsInternal}`);
    console.log(`   Visitantes internos (true): ${internalDocs}`);
    console.log(`   Visitantes externos (false): ${externalDocs}`);

    // Verificar índices
    console.log(`\n🔧 Verificando índices...`);
    const indexes = await collection.indexes();
    const hasSimpleIndex = indexes.some(idx => idx.name === 'idx_isInternal');
    const hasCompoundIndex = indexes.some(idx => idx.name === 'idx_tenant_isInternal_updated');

    console.log(`   idx_isInternal: ${hasSimpleIndex ? '✅' : '❌'}`);
    console.log(`   idx_tenant_isInternal_updated: ${hasCompoundIndex ? '✅' : '❌'}`);

    if (totalDocs === docsWithIsInternal && hasSimpleIndex && hasCompoundIndex) {
      console.log('\n✅ Migración verificada correctamente');
    } else {
      console.log('\n⚠️  Advertencia: La migración no está completa');
      if (docsWithoutIsInternal > 0) {
        console.log(`   - ${docsWithoutIsInternal} documentos sin campo isInternal`);
      }
      if (!hasSimpleIndex) {
        console.log('   - Falta índice idx_isInternal');
      }
      if (!hasCompoundIndex) {
        console.log('   - Falta índice idx_tenant_isInternal_updated');
      }
    }

  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

/**
 * Revertir migración (rollback)
 */
async function rollback() {
  const client = await connectToMongo();

  try {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log(`\n⚠️  ROLLBACK: Revirtiendo migración para colección: ${COLLECTION_NAME}`);
    console.log('⚠️  Esto eliminará el campo isInternal de todos los documentos');

    // Eliminar campo isInternal
    console.log('🔄 Eliminando campo isInternal...');
    const updateResult = await collection.updateMany(
      { isInternal: { $exists: true } },
      { $unset: { isInternal: '' } }
    );

    console.log(`✅ Documentos actualizados: ${updateResult.modifiedCount}`);

    // Eliminar índices
    console.log('\n🔧 Eliminando índices...');

    try {
      await collection.dropIndex('idx_isInternal');
      console.log('✅ Índice eliminado: idx_isInternal');
    } catch (error) {
      if (error.code === 27) { // IndexNotFound
        console.log('⚠️  Índice idx_isInternal no existe');
      } else {
        throw error;
      }
    }

    try {
      await collection.dropIndex('idx_tenant_isInternal_updated');
      console.log('✅ Índice eliminado: idx_tenant_isInternal_updated');
    } catch (error) {
      if (error.code === 27) {
        console.log('⚠️  Índice idx_tenant_isInternal_updated no existe');
      } else {
        throw error;
      }
    }

    // Verificar rollback
    console.log('\n🔍 Verificando rollback...');
    const docsWithIsInternal = await collection.countDocuments({
      isInternal: { $exists: true }
    });

    if (docsWithIsInternal === 0) {
      console.log('✅ Rollback completado exitosamente');
    } else {
      console.log(`⚠️  Advertencia: ${docsWithIsInternal} documentos aún tienen el campo isInternal`);
    }

  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

/**
 * Mostrar uso
 */
function showUsage() {
  console.log(`
=== MIGRACIÓN: Agregar isInternal a Visitantes ===

Uso: node bin/migrate-add-isInternal-to-visitors.js [comando]

Comandos disponibles:
  (sin comando)   - Ejecutar migración (agregar campo isInternal)
  verify          - Verificar estado de la migración
  rollback        - Revertir migración (eliminar campo isInternal)
  help            - Mostrar esta ayuda

Variables de entorno:
  MONGODB_URI       - URI de conexión a MongoDB (default: mongodb://localhost:27017)
  MONGODB_DATABASE  - Nombre de la base de datos (default: guiders)

Ejemplos:
  node bin/migrate-add-isInternal-to-visitors.js
  node bin/migrate-add-isInternal-to-visitors.js verify
  node bin/migrate-add-isInternal-to-visitors.js rollback

  MONGODB_URI=mongodb://prod-server:27017 node bin/migrate-add-isInternal-to-visitors.js
`);
}

/**
 * Main
 */
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'verify':
        await verify();
        break;
      case 'rollback':
        await rollback();
        break;
      case 'help':
      case '--help':
      case '-h':
        showUsage();
        break;
      case undefined:
        await migrate();
        break;
      default:
        console.log(`❌ Comando desconocido: ${command}`);
        showUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error durante la ejecución:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = { migrate, verify, rollback };
