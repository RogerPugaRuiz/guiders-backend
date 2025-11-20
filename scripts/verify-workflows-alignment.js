#!/usr/bin/env node

/**
 * Script de verificación integral para alineación entre ci.yml y deploy-staging.yml
 * Verifica que las configuraciones de servicios y variables de entorno sean consistentes
 */

const fs = require('fs');
const yaml = require('js-yaml');

console.log('🔍 Verificando alineación entre workflows CI y Deploy Staging...\n');

let allGood = true;

// Función para extraer configuración de servicio
function extractServiceConfig(workflow, serviceName) {
  const jobs = workflow.jobs || {};
  for (const [jobName, job] of Object.entries(jobs)) {
    if (job.services && job.services[serviceName]) {
      return {
        jobName,
        service: job.services[serviceName]
      };
    }
  }
  return null;
}

// Función para extraer variables de entorno E2E
function extractE2EEnvVars(workflow) {
  const jobs = workflow.jobs || {};
  for (const [jobName, job] of Object.entries(jobs)) {
    if (job.steps) {
      for (const step of job.steps) {
        if (step.name && step.name.includes('E2E') && step.env) {
          return { jobName, env: step.env };
        }
      }
    }
  }
  return null;
}

try {
  // Leer workflows
  console.log('📁 Leyendo archivos de workflow...');
  
  let ciWorkflow, deployWorkflow;
  
  try {
    const ciContent = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
    ciWorkflow = yaml.load(ciContent);
    console.log('✅ ci.yml cargado correctamente');
  } catch (error) {
    console.log('❌ Error leyendo ci.yml:', error.message);
    allGood = false;
  }
  
  try {
    const deployContent = fs.readFileSync('.github/workflows/deploy-staging.yml', 'utf8');
    deployWorkflow = yaml.load(deployContent);
    console.log('✅ deploy-staging.yml cargado correctamente');
  } catch (error) {
    console.log('❌ Error leyendo deploy-staging.yml:', error.message);
    allGood = false;
  }
  
  if (!allGood) {
    process.exit(1);
  }
  
  console.log('\n🔍 Verificando configuraciones de servicios...\n');
  
  // Verificar PostgreSQL
  console.log('📊 PostgreSQL:');
  const ciPostgres = extractServiceConfig(ciWorkflow, 'postgres');
  const deployPostgres = extractServiceConfig(deployWorkflow, 'postgres');
  
  if (ciPostgres && deployPostgres) {
    const ciEnv = ciPostgres.service.env || {};
    const deployEnv = deployPostgres.service.env || {};
    
    console.log(`  CI (${ciPostgres.jobName}):`, JSON.stringify(ciEnv, null, 4));
    console.log(`  Deploy (${deployPostgres.jobName}):`, JSON.stringify(deployEnv, null, 4));
    
    const matches = 
      ciEnv.POSTGRES_USER === deployEnv.POSTGRES_USER &&
      ciEnv.POSTGRES_PASSWORD === deployEnv.POSTGRES_PASSWORD &&
      ciEnv.POSTGRES_DB === deployEnv.POSTGRES_DB;
    
    console.log(`  ${matches ? '✅' : '❌'} Configuración PostgreSQL ${matches ? 'coincide' : 'NO coincide'}`);
    if (!matches) allGood = false;
  } else {
    console.log('  ❌ No se pudo extraer configuración de PostgreSQL de ambos workflows');
    allGood = false;
  }
  
  console.log('\n📊 MongoDB:');
  const ciMongodb = extractServiceConfig(ciWorkflow, 'mongodb');
  const deployMongodb = extractServiceConfig(deployWorkflow, 'mongodb');
  
  if (ciMongodb && deployMongodb) {
    const ciEnv = ciMongodb.service.env || {};
    const deployEnv = deployMongodb.service.env || {};
    
    console.log(`  CI (${ciMongodb.jobName}):`, JSON.stringify(ciEnv, null, 4));
    console.log(`  Deploy (${deployMongodb.jobName}):`, JSON.stringify(deployEnv, null, 4));
    
    const matches = 
      ciEnv.MONGO_INITDB_ROOT_USERNAME === deployEnv.MONGO_INITDB_ROOT_USERNAME &&
      ciEnv.MONGO_INITDB_ROOT_PASSWORD === deployEnv.MONGO_INITDB_ROOT_PASSWORD &&
      ciEnv.MONGO_INITDB_DATABASE === deployEnv.MONGO_INITDB_DATABASE;
    
    console.log(`  ${matches ? '✅' : '❌'} Configuración MongoDB ${matches ? 'coincide' : 'NO coincide'}`);
    if (!matches) allGood = false;
  } else {
    console.log('  ❌ No se pudo extraer configuración de MongoDB de ambos workflows');
    allGood = false;
  }
  
  console.log('\n🔍 Verificando variables de entorno E2E...\n');
  
  const ciE2E = extractE2EEnvVars(ciWorkflow);
  const deployE2E = extractE2EEnvVars(deployWorkflow);
  
  if (ciE2E && deployE2E) {
    console.log('📊 Variables E2E críticas:');
    
    const criticalVars = [
      'TEST_DATABASE_HOST',
      'TEST_DATABASE_PORT', 
      'TEST_DATABASE_USERNAME',
      'TEST_DATABASE_PASSWORD',
      'TEST_DATABASE',
      'TEST_MONGODB_HOST',
      'TEST_MONGODB_PORT',
      'TEST_MONGODB_DATABASE',
      'TEST_MONGODB_ROOT_USERNAME',
      'TEST_MONGODB_ROOT_PASSWORD'
    ];
    
    let envMatches = true;
    for (const varName of criticalVars) {
      const ciValue = ciE2E.env[varName];
      const deployValue = deployE2E.env[varName];
      
      const matches = ciValue === deployValue;
      console.log(`  ${matches ? '✅' : '❌'} ${varName}:`);
      console.log(`    CI: "${ciValue}"`);
      console.log(`    Deploy: "${deployValue}"`);
      
      if (!matches) {
        envMatches = false;
        allGood = false;
      }
    }
    
    console.log(`\n  ${envMatches ? '✅' : '❌'} Variables E2E ${envMatches ? 'coinciden' : 'NO coinciden'}`);
  } else {
    console.log('❌ No se pudo extraer variables E2E de ambos workflows');
    allGood = false;
  }
  
} catch (error) {
  console.error('❌ Error durante verificación:', error.message);
  allGood = false;
}

console.log('\n' + '='.repeat(80));
if (allGood) {
  console.log('🎉 ¡Workflows CI y Deploy Staging están correctamente alineados!');
  console.log('✅ Configuraciones de servicios coinciden');
  console.log('✅ Variables de entorno E2E coinciden');
  console.log('🚀 Los errores de MongoDB y PostgreSQL deberían estar resueltos');
} else {
  console.log('❌ Hay inconsistencias entre workflows CI y Deploy Staging');
  console.log('🔧 Revisa los errores listados arriba y alinea las configuraciones');
  process.exit(1);
}