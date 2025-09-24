#!/usr/bin/env node

/**
 * Script para comparar configuraciones entre ci.yml y deploy-staging.yml
 * Verifica que ambos workflows tengan servicios consistentes
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Comparando configuraciones de workflows...\n');

const workflows = [
  { name: 'ci.yml', path: './.github/workflows/ci.yml' },
  { name: 'deploy-staging.yml', path: './.github/workflows/deploy-staging.yml' }
];

const services = ['postgres', 'redis', 'mongodb'];

workflows.forEach(workflow => {
  console.log(`📋 ${workflow.name}:`);
  
  if (!fs.existsSync(workflow.path)) {
    console.log(`  ❌ Archivo no encontrado: ${workflow.path}`);
    return;
  }
  
  const content = fs.readFileSync(workflow.path, 'utf8');
  
  services.forEach(service => {
    const hasService = content.includes(`${service}:`);
    const hasPort = content.includes(`${service === 'postgres' ? '5432' : service === 'redis' ? '6379' : '27017'}:${service === 'postgres' ? '5432' : service === 'redis' ? '6379' : '27017'}`);
    
    console.log(`  ${hasService ? '✅' : '❌'} ${service.toUpperCase()}: ${hasService ? 'Presente' : 'Faltante'}`);
    if (hasService && hasPort) {
      console.log(`    🔌 Puerto configurado correctamente`);
    } else if (hasService && !hasPort) {
      console.log(`    ⚠️ Servicio presente pero puerto no configurado`);
    }
  });
  
  // Verificar variables de entorno clave
  const envVars = ['REDIS_URL', 'DATABASE_HOST', 'MONGODB_HOST'];
  console.log(`  📊 Variables de entorno:`);
  
  envVars.forEach(envVar => {
    const hasVar = content.includes(envVar);
    console.log(`    ${hasVar ? '✅' : '❌'} ${envVar}`);
  });
  
  console.log('');
});

console.log('📋 Comparación de servicios:');

const ciContent = fs.existsSync('./.github/workflows/ci.yml') ? 
  fs.readFileSync('./.github/workflows/ci.yml', 'utf8') : '';
const deployContent = fs.existsSync('./.github/workflows/deploy-staging.yml') ? 
  fs.readFileSync('./.github/workflows/deploy-staging.yml', 'utf8') : '';

services.forEach(service => {
  const inCI = ciContent.includes(`${service}:`);
  const inDeploy = deployContent.includes(`${service}:`);
  
  const status = inCI && inDeploy ? '✅ Ambos' : 
                inCI && !inDeploy ? '⚠️ Solo CI' :
                !inCI && inDeploy ? '⚠️ Solo Deploy' : '❌ Ninguno';
  
  console.log(`  ${service.toUpperCase()}: ${status}`);
});

console.log('\n🎯 Resultado:');
const allServicesInBoth = services.every(service => 
  ciContent.includes(`${service}:`) && deployContent.includes(`${service}:`)
);

if (allServicesInBoth) {
  console.log('✅ Todos los servicios están presentes en ambos workflows');
  console.log('🚀 Los workflows deberían funcionar de manera consistente');
} else {
  console.log('❌ Hay inconsistencias entre los workflows');
  console.log('🔧 Revisar las diferencias listadas arriba');
}