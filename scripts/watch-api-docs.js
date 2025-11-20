#!/usr/bin/env node

/**
 * Script de monitoreo continuo de documentación API
 * Vigila cambios en controllers y regenera automáticamente
 */

const chokidar = require('chokidar');
const path = require('path');
const { execSync } = require('child_process');

class ApiDocumentationWatcher {
  constructor() {
    this.baseDir = path.resolve(__dirname, '..');
    this.watchPaths = [
      path.join(this.baseDir, 'src/context/**/controllers/*.controller.ts'),
      path.join(this.baseDir, 'src/context/**/application/dtos/*.dto.ts')
    ];
    this.debounceTimeout = null;
    this.isGenerating = false;
  }

  start() {
    console.log('👀 Iniciando vigilancia de documentación API...');
    console.log('📂 Vigilando:', this.watchPaths);

    const watcher = chokidar.watch(this.watchPaths, {
      ignored: [
        /node_modules/,
        /\.git/,
        /\.spec\.ts$/,
        /\.test\.ts$/
      ],
      persistent: true
    });

    watcher
      .on('change', (filePath) => this.handleChange(filePath, 'modificado'))
      .on('add', (filePath) => this.handleChange(filePath, 'agregado'))
      .on('unlink', (filePath) => this.handleChange(filePath, 'eliminado'))
      .on('ready', () => {
        console.log('✅ Vigilancia iniciada. Esperando cambios...');
        console.log('💡 Presiona Ctrl+C para detener');
      })
      .on('error', (error) => {
        console.error('❌ Error en vigilancia:', error);
      });

    // Manejar cierre graceful
    process.on('SIGINT', () => {
      console.log('\n👋 Deteniendo vigilancia...');
      watcher.close();
      process.exit(0);
    });
  }

  handleChange(filePath, action) {
    if (this.isGenerating) {
      console.log('⏳ Generación en progreso, ignorando cambio...');
      return;
    }

    console.log(`\n📝 Archivo ${action}: ${path.relative(this.baseDir, filePath)}`);

    // Debounce para evitar regeneraciones múltiples
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.regenerateDocumentation();
    }, 2000); // 2 segundos de debounce
  }

  async regenerateDocumentation() {
    if (this.isGenerating) return;
    
    this.isGenerating = true;
    console.log('🔄 Regenerando documentación...');

    try {
      const startTime = Date.now();
      
      // Ejecutar generador
      execSync('node scripts/generate-api-docs.js', {
        cwd: this.baseDir,
        stdio: 'inherit'
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Documentación regenerada en ${duration}ms`);
      console.log('👀 Continúa vigilando cambios...\n');

    } catch (error) {
      console.error('❌ Error regenerando documentación:', error.message);
    } finally {
      this.isGenerating = false;
    }
  }
}

if (require.main === module) {
  const watcher = new ApiDocumentationWatcher();
  watcher.start();
}

module.exports = ApiDocumentationWatcher;