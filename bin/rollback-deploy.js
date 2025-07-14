#!/usr/bin/env node

/**
 * Script para hacer rollback en caso de fallo en el deploy
 * Restaura el estado anterior de la aplicación
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function rollbackDeploy() {
  console.log('=== INICIANDO ROLLBACK DEL DEPLOY ===');
  
  try {
    // Detener la aplicación actual
    console.log('🛑 Deteniendo aplicación actual...');
    try {
      execSync('pm2 delete guiders-backend', { stdio: 'inherit' });
    } catch (error) {
      console.log('ℹ️ Aplicación ya estaba detenida');
    }

    // Verificar si existe un backup anterior
    const backupPath = '/var/www/guiders-backend-backup';
    if (fs.existsSync(backupPath)) {
      console.log('🔄 Restaurando desde backup...');
      
      // Mover el directorio actual a un temporal
      const tempPath = '/var/www/guiders-backend-failed';
      if (fs.existsSync(tempPath)) {
        execSync(`rm -rf ${tempPath}`, { stdio: 'inherit' });
      }
      
      execSync('mv /var/www/guiders-backend /var/www/guiders-backend-failed', { stdio: 'inherit' });
      execSync(`mv ${backupPath} /var/www/guiders-backend`, { stdio: 'inherit' });
      
      console.log('✅ Backup restaurado');
    } else {
      console.log('⚠️ No se encontró backup anterior');
    }

    // Restaurar contenedores Docker si es necesario
    console.log('🐳 Verificando contenedores Docker...');
    try {
      execSync('cd /var/www/guiders-backend && docker compose -f docker-compose-prod.yml down', { stdio: 'inherit' });
      execSync('cd /var/www/guiders-backend && docker compose -f docker-compose-prod.yml up -d', { stdio: 'inherit' });
      console.log('✅ Contenedores Docker restaurados');
    } catch (error) {
      console.log('⚠️ Error al restaurar contenedores:', error.message);
    }

    // Reiniciar la aplicación
    console.log('🚀 Reiniciando aplicación...');
    try {
      execSync('cd /var/www/guiders-backend && NODE_ENV=production pm2 start dist/src/main.js --name guiders-backend', { stdio: 'inherit' });
      console.log('✅ Aplicación reiniciada');
    } catch (error) {
      console.log('❌ Error al reiniciar aplicación:', error.message);
    }

    console.log('\n🎯 ROLLBACK COMPLETADO');
    console.log('✅ Se ha restaurado el estado anterior');
    
  } catch (error) {
    console.log(`❌ ERROR en rollback: ${error.message}`);
    console.log('\n💡 Acciones manuales requeridas:');
    console.log('1. Verificar el estado de PM2: pm2 list');
    console.log('2. Verificar contenedores Docker: docker ps');
    console.log('3. Revisar logs: pm2 logs guiders-backend');
    console.log('4. Contactar al administrador del sistema');
    
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  rollbackDeploy().catch(console.error);
}

module.exports = { rollbackDeploy };
