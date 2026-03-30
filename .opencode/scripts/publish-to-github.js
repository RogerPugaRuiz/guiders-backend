#!/usr/bin/env node

/**
 * OpenCode Skill: Publish to GitHub
 *
 * Automatiza el proceso de publicación con validaciones de calidad
 *
 * Usage:
 *   node .opencode/scripts/publish-to-github.js [options]
 *
 * Options:
 *   --with-e2e     Incluir tests E2E
 *   --quick        Solo lint y unit tests (rápido)
 *   --skip-tests   Saltar tests (NO RECOMENDADO)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) =>
    console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`),
};

// Parse arguments
const args = process.argv.slice(2);
const options = {
  withE2E: args.includes('--with-e2e'),
  quick: args.includes('--quick'),
  skipTests: args.includes('--skip-tests'),
};

/**
 * Ejecuta un comando y retorna el resultado
 */
function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: path.resolve(__dirname, '../..'),
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || '',
    };
  }
}

/**
 * Verifica el estado de Git
 */
function checkGitStatus() {
  log.step('🔍 Verificando estado del repositorio...');

  const branch = exec('git branch --show-current', { silent: true });
  if (!branch.success) {
    log.error('No estás en un repositorio Git válido');
    process.exit(1);
  }

  const currentBranch = branch.output.trim();
  log.info(`Rama actual: ${currentBranch}`);

  // Advertencia si está en main/master
  if (currentBranch === 'main' || currentBranch === 'master') {
    log.warning('⚠️  ADVERTENCIA: Estás en la rama principal');
    log.warning('    Se recomienda trabajar en una rama de desarrollo');
  }

  // Verificar si hay cambios
  const status = exec('git status --porcelain', { silent: true });
  const hasUncommitted = status.output.trim().length > 0;

  // Verificar si hay commits sin pushear
  const unpushed = exec(`git log origin/${currentBranch}..HEAD --oneline`, {
    silent: true,
  });
  const hasUnpushed = unpushed.output.trim().length > 0;

  if (!hasUncommitted && !hasUnpushed) {
    log.info('No hay cambios para publicar');
    process.exit(0);
  }

  if (hasUncommitted) {
    log.info('📝 Cambios sin commitear detectados');
    exec('git status --short');
  }

  if (hasUnpushed) {
    log.info(
      `📤 ${unpushed.output.trim().split('\n').length} commit(s) sin pushear`,
    );
  }

  return { currentBranch, hasUncommitted, hasUnpushed };
}

/**
 * Ejecuta lint
 */
function runLint() {
  log.step('🔍 Ejecutando Lint...');
  const result = exec('npm run lint');

  if (!result.success) {
    log.error('Lint falló');
    log.error('Ejecuta "npm run lint" para ver los detalles');
    process.exit(1);
  }

  log.success('Lint: PASSED');
  return true;
}

/**
 * Ejecuta tests unitarios
 */
function runUnitTests() {
  log.step('🧪 Ejecutando Tests Unitarios...');
  const result = exec('npm run test:unit');

  if (!result.success) {
    log.error('Tests unitarios fallaron');
    log.error('Ejecuta "npm run test:unit" para ver los detalles');
    process.exit(1);
  }

  log.success('Unit Tests: PASSED');
  return true;
}

/**
 * Ejecuta tests de integración
 */
function runIntegrationTests() {
  log.step('🔗 Ejecutando Tests de Integración...');
  const result = exec('npm run test:int:dev');

  if (!result.success) {
    log.error('Tests de integración fallaron');
    log.error('Verifica que MongoDB y PostgreSQL estén corriendo');
    log.error('Ejecuta "npm run test:int:dev" para ver los detalles');
    process.exit(1);
  }

  log.success('Integration Tests: PASSED');
  return true;
}

/**
 * Ejecuta tests E2E
 */
function runE2ETests() {
  log.step('🌐 Ejecutando Tests E2E...');
  const result = exec('npm run test:e2e');

  if (!result.success) {
    log.error('Tests E2E fallaron');
    log.error('Ejecuta "npm run test:e2e" para ver los detalles');
    process.exit(1);
  }

  log.success('E2E Tests: PASSED');
  return true;
}

/**
 * Ejecuta build
 */
function runBuild() {
  log.step('🏗️  Ejecutando Build...');
  const result = exec('npm run build');

  if (!result.success) {
    log.error('Build falló');
    log.error('Hay errores de TypeScript en el código');
    log.error('Ejecuta "npm run build" para ver los detalles');
    process.exit(1);
  }

  log.success('Build: PASSED');
  return true;
}

/**
 * Crea commit si hay cambios sin commitear
 */
function createCommitIfNeeded(hasUncommitted) {
  if (!hasUncommitted) {
    return null;
  }

  log.step('📝 Creando commit...');

  // Mostrar diff
  log.info('Cambios a commitear:');
  exec('git diff --stat');

  // Analizar cambios para generar mensaje
  const diff = exec('git diff --cached --name-only', { silent: true });
  const files = diff.output.trim().split('\n').filter(Boolean);

  // TODO: Aquí se podría implementar lógica más sofisticada para generar el mensaje
  // Por ahora, pedimos al usuario que lo proporcione o usamos uno genérico

  log.info('\nGenerando mensaje de commit automático...');

  // Add all changes
  const addResult = exec('git add -A');
  if (!addResult.success) {
    log.error('Error al hacer git add');
    process.exit(1);
  }

  // Para automatización completa, se necesitaría analizar los cambios
  // Por ahora, retornamos sin hacer commit y dejamos que OpenCode lo maneje
  log.warning('⚠️  Se requiere mensaje de commit manual');
  log.info('Los cambios están staged. Por favor, crea el commit manualmente.');

  return null;
}

/**
 * Push a GitHub
 */
function pushToGitHub(branch) {
  log.step('🚀 Publicando a GitHub...');

  const result = exec(`git push origin ${branch}`);

  if (!result.success) {
    log.error('Error al hacer push');
    log.error(result.error);
    process.exit(1);
  }

  log.success(`Cambios publicados a origin/${branch}`);
  return true;
}

/**
 * Main function
 */
async function main() {
  console.log(`
${colors.cyan}${colors.bright}╔════════════════════════════════════════╗
║  🚀 Publish to GitHub - OpenCode Skill ║
╚════════════════════════════════════════╝${colors.reset}
`);

  // Mostrar configuración
  if (options.withE2E) {
    log.info('Modo: Completo con E2E tests');
  } else if (options.quick) {
    log.info('Modo: Rápido (lint + unit tests)');
  } else if (options.skipTests) {
    log.warning('Modo: Sin tests (NO RECOMENDADO)');
  } else {
    log.info('Modo: Estándar (lint + unit tests + integration tests)');
  }

  // 1. Verificar Git
  const { currentBranch, hasUncommitted, hasUnpushed } = checkGitStatus();

  // 2. Lint
  runLint();

  // 3. Tests (según configuración)
  if (!options.skipTests) {
    runUnitTests();

    if (!options.quick) {
      runIntegrationTests();

      if (options.withE2E) {
        runE2ETests();
      }
    }
  } else {
    log.warning('⚠️  Tests omitidos');
  }

  // 4. Build
  runBuild();

  // 5. Git operations
  if (hasUncommitted) {
    log.step('📝 Cambios sin commitear detectados');
    log.warning('⚠️  Este script no crea commits automáticamente');
    log.info(
      'Por favor, crea el commit manualmente y vuelve a ejecutar /publish',
    );
    log.info(
      'O usa el comando completo de OpenCode para que el agente lo maneje',
    );
    process.exit(0);
  }

  // 6. Push
  if (hasUnpushed) {
    pushToGitHub(currentBranch);
  }

  // Success
  console.log(`
${colors.green}${colors.bright}╔════════════════════════════════════════╗
║  ✅ Publicación completada exitosamente ║
╚════════════════════════════════════════╝${colors.reset}
`);
}

// Run
main().catch((error) => {
  log.error(`Error inesperado: ${error.message}`);
  process.exit(1);
});
