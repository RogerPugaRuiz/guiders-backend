#!/usr/bin/env node

/**
 * Script de verificación para configuración E2E en CI
 * Verifica que todos los archivos y configuraciones estén presentes
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración E2E para CI...\n');

const checks = [
  {
    name: 'Configuración Jest E2E CI',
    path: './test/jest-e2e.ci.json',
    required: true
  },
  {
    name: 'Setup Jest E2E CI',
    path: './test/jest-e2e.ci.setup.ts',
    required: true
  },
  {
    name: 'Helper MongoDB Test',
    path: './test/helpers/mongo-test.helper.ts',
    required: true
  },
  {
    name: 'Workflow GitHub Actions',
    path: './.github/workflows/deploy-staging.yml',
    required: true
  }
];

let allGood = true;

checks.forEach(check => {
  const exists = fs.existsSync(check.path);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${check.name}: ${check.path}`);
  
  if (check.required && !exists) {
    allGood = false;
  }
});

console.log('\n📋 Verificando package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const hasE2ECI = packageJson.scripts && packageJson.scripts['test:e2e:ci'];
  console.log(`${hasE2ECI ? '✅' : '❌'} Script test:e2e:ci: ${hasE2ECI ? 'Presente' : 'Faltante'}`);
  
  if (!hasE2ECI) allGood = false;
} catch (error) {
  console.log('❌ Error leyendo package.json:', error.message);
  allGood = false;
}

console.log('\n📋 Verificando contenido de archivos clave...');

// Verificar jest-e2e.ci.json
try {
  const ciConfig = JSON.parse(fs.readFileSync('./test/jest-e2e.ci.json', 'utf8'));
  const hasSetupFile = ciConfig.setupFilesAfterEnv && 
    ciConfig.setupFilesAfterEnv.some(file => file.includes('jest-e2e.ci.setup.ts'));
  console.log(`${hasSetupFile ? '✅' : '❌'} Jest CI config usa setup correcto`);
} catch (error) {
  console.log('❌ Error leyendo jest-e2e.ci.json:', error.message);
  allGood = false;
}

// Verificar GitHub Actions workflow
try {
  const workflow = fs.readFileSync('./.github/workflows/deploy-staging.yml', 'utf8');
  const hasMongoService = workflow.includes('mongodb:') && workflow.includes('27017:27017');
  const hasE2ECommand = workflow.includes('npm run test:e2e:ci');
  const hasEnvVars = workflow.includes('TEST_MONGODB_HOST') && workflow.includes('TEST_MONGODB_PORT');
  
  console.log(`${hasMongoService ? '✅' : '❌'} Workflow tiene servicio MongoDB`);
  console.log(`${hasE2ECommand ? '✅' : '❌'} Workflow ejecuta test:e2e:ci`);
  console.log(`${hasEnvVars ? '✅' : '❌'} Workflow define variables de MongoDB`);
  
  if (!hasMongoService || !hasE2ECommand || !hasEnvVars) {
    allGood = false;
  }
} catch (error) {
  console.log('❌ Error leyendo workflow:', error.message);
  allGood = false;
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('🎉 ¡Configuración E2E para CI está completa!');
  console.log('✅ Todos los archivos y configuraciones están presentes');
  console.log('🚀 Los tests E2E deberían funcionar en GitHub Actions');
} else {
  console.log('⚠️  Hay problemas en la configuración E2E para CI');
  console.log('🔧 Revisa los errores listados arriba');
  process.exit(1);
}