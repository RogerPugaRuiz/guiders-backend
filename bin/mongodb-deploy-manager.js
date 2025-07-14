#!/usr/bin/env node

/**
 * Script principal para gestionar operaciones de MongoDB en deploy
 * Combina todos los scripts de verificación y rollback
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Importar otros scripts
const { verifyMongoDeployment } = require('./verify-mongodb-deploy');
const { rollbackDeploy } = require('./rollback-deploy');

function showUsage() {
  console.log(`
=== MONGODB DEPLOY MANAGER ===

Uso: node mongodb-deploy-manager.js [comando] [opciones]

Comandos disponibles:
  test                    - Ejecutar test básico de conexión
  verify                  - Verificación completa post-deploy
  rollback                - Hacer rollback del deploy
  full-check             - Ejecutar verificación completa con reporte
  help                   - Mostrar esta ayuda

Ejemplos:
  node mongodb-deploy-manager.js test
  node mongodb-deploy-manager.js verify
  node mongodb-deploy-manager.js rollback
  node mongodb-deploy-manager.js full-check
`);
}

async function runBasicTest() {
  console.log('🔍 Ejecutando test básico de MongoDB...');
  try {
    execSync('node test-mongodb-connection.js', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log('❌ Test básico falló');
    return false;
  }
}

async function runFullCheck() {
  console.log('=== VERIFICACIÓN COMPLETA DE MONGODB ===');
  
  let allPassed = true;
  
  // Test 1: Conexión básica
  console.log('\n1️⃣ Test de conexión básica...');
  const basicTest = await runBasicTest();
  if (!basicTest) allPassed = false;
  
  // Test 2: Verificación completa
  console.log('\n2️⃣ Verificación completa...');
  try {
    await verifyMongoDeployment();
    console.log('✅ Verificación completa exitosa');
  } catch (error) {
    console.log('❌ Verificación completa falló:', error.message);
    allPassed = false;
  }
  
  // Test 3: Verificar Docker
  console.log('\n3️⃣ Verificando contenedores Docker...');
  try {
    const dockerStatus = execSync('docker ps --format "table {{.Names}}\\t{{.Status}}" | grep mongodb-prod', { encoding: 'utf8' });
    console.log('✅ Docker MongoDB:', dockerStatus.trim());
  } catch (error) {
    console.log('❌ Contenedor MongoDB no encontrado o no ejecutándose');
    allPassed = false;
  }
  
  // Test 4: Verificar PM2
  console.log('\n4️⃣ Verificando aplicación PM2...');
  try {
    const pm2Status = execSync('pm2 list | grep guiders-backend', { encoding: 'utf8' });
    console.log('✅ PM2 Status:', pm2Status.trim());
  } catch (error) {
    console.log('❌ Aplicación no encontrada en PM2');
    allPassed = false;
  }
  
  // Generar reporte
  console.log('\n📊 REPORTE FINAL:');
  console.log('==================');
  console.log(`Estado general: ${allPassed ? '✅ EXITOSO' : '❌ CON ERRORES'}`);
  console.log(`Conexión MongoDB: ${basicTest ? '✅' : '❌'}`);
  console.log(`Verificación completa: ${allPassed ? '✅' : '❌'}`);
  
  if (!allPassed) {
    console.log('\n💡 Acciones recomendadas:');
    console.log('1. Revisar logs: pm2 logs guiders-backend');
    console.log('2. Verificar Docker: docker logs mongodb-prod');
    console.log('3. Considerar rollback si es necesario');
    console.log('4. Contactar al equipo de DevOps');
  }
  
  return allPassed;
}

async function main() {
  const command = process.argv[2];
  
  if (!command || command === 'help') {
    showUsage();
    return;
  }
  
  try {
    switch (command) {
      case 'test':
        await runBasicTest();
        break;
        
      case 'verify':
        await verifyMongoDeployment();
        break;
        
      case 'rollback':
        await rollbackDeploy();
        break;
        
      case 'full-check':
        const success = await runFullCheck();
        process.exit(success ? 0 : 1);
        break;
        
      default:
        console.log(`❌ Comando desconocido: ${command}`);
        showUsage();
        process.exit(1);
    }
  } catch (error) {
    console.log(`❌ Error ejecutando comando '${command}':`, error.message);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runBasicTest,
  runFullCheck,
  verifyMongoDeployment,
  rollbackDeploy
};
