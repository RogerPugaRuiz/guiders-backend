/**
 * Script de verificación de cobertura de código para el proyecto Guiders Backend
 * 
 * Este script verifica que la cobertura de código cumpla con el umbral mínimo establecido.
 * Se puede usar localmente para probar si se cumple el umbral antes de hacer un push.
 * 
 * Características:
 * - Excluye automáticamente archivos que no requieren testing (configuración, DTOs, entidades, etc.)
 * - Proporciona un análisis detallado de qué archivos se incluyen/excluyen
 * - Muestra estadísticas organizadas por categorías de exclusión
 * - Diseñado específicamente para proyectos NestJS con DDD y CQRS
 * 
 * Tipos de archivos excluidos:
 * - Módulos NestJS y configuración de aplicación
 * - Entidades de base de datos y migraciones
 * - DTOs, mappers y adaptadores de infraestructura
 * - Archivos de testing y documentación
 * - Definiciones de tipos, interfaces y enums
 * - Scripts de utilidad y herramientas
 * - Contratos de dominio (interfaces de repositorios/servicios)
 * - Infraestructura específica de NestJS (guards, pipes, etc.)
 * 
 * Uso:
 *   node src/scripts/check-coverage-threshold.js
 * 
 * Requisitos:
 *   Debe existir el archivo coverage/lcov.info generado por Jest
 */
const fs = require('fs');
const path = require('path');

// Configuración
const THRESHOLD = 80; // Umbral mínimo de cobertura (porcentaje)
const LCOV_PATH = path.join(__dirname, '../../coverage/lcov.info');

// Patrones de archivos a excluir del cálculo de cobertura
const EXCLUDE_PATTERNS = [
  // Configuración y setup de aplicación
  /\.module\.ts$/, // Módulos NestJS
  /main\.ts$/, // Punto de entrada de la aplicación
  /data-source\.ts$/, // Configuración de base de datos
  /app\.controller\.ts$/, // Controlador principal de la app
  /app\.service\.ts$/, // Servicio principal de la app
  
  // Archivos de infraestructura que no requieren testing
  /\/migrations\/.*\.ts$/, // Archivos de migración
  /\/index\.ts$/, // Archivos barrel que solo re-exportan
  /\.config\.ts$/, // Archivos de configuración
  /\.constants\.ts$/, // Archivos de constantes
  /\/scripts\/.*\.js$/, // Scripts de utilidad
  /\/scripts\/.*\.ts$/, // Scripts de utilidad TypeScript
  
  // Archivos de definición de tipos y contratos
  /\.enum\.ts$/, // Archivos de enums
  /\.interface\.ts$/, // Interfaces de TypeScript puras
  /\.type\.ts$/, // Tipos de TypeScript
  /\.d\.ts$/, // Archivos de definición de tipos
  
  // Entidades de base de datos y mappers (infraestructura)
  /\.entity\.ts$/, // Entidades de TypeORM
  /\.mapper\.ts$/, // Mappers de infraestructura
  /\.adapter\.ts$/, // Adaptadores de infraestructura
  
  // DTOs y documentación
  /\.dto\.ts$/, // Data Transfer Objects
  /\.swagger\.ts$/, // Configuración de Swagger
  /\/docs\/.*\.ts$/, // Archivos de documentación
  
  // Archivos de testing y configuración del entorno
  /\.spec\.ts$/, // Archivos de test
  /\.test\.ts$/, // Archivos de test alternativos
  /jest\.config/, // Configuración de Jest
  /\.e2e-spec\.ts$/, // Tests end-to-end
  
  // Archivos de configuración de herramientas
  /Dockerfile/, // Archivos Docker
  /\.json$/, // Archivos de configuración JSON
  /\.yaml$/, // Archivos YAML
  /\.yml$/, // Archivos YML
  /\.md$/, // Archivos Markdown
  /\.mmd$/, // Archivos Mermaid
  
  // Directorios específicos que no requieren coverage
  /\/config\/.*\.ts$/, // Directorio de configuración
  /\/examples\/.*\.ts$/, // Directorio de ejemplos
  /\/tools\/.*\.ts$/, // Directorio de herramientas
  /\/bin\/.*\.js$/, // Scripts binarios
  
  // Archivos específicos del dominio que son solo definiciones
  /\/domain\/.*\.error\.ts$/, // Clases de error de dominio
  /\/domain\/.*\.exception\.ts$/, // Excepciones de dominio
  /\/domain\/.*\.repository\.ts$/, // Interfaces de repositorios (solo contratos)
  /\/domain\/.*\.service\.ts$/, // Interfaces de servicios de dominio (solo contratos)
  
  // Archivos de infraestructura específicos
  /\/infrastructure\/.*\.guard\.ts$/, // Guards de NestJS
  /\/infrastructure\/.*\.decorator\.ts$/, // Decoradores personalizados
  /\/infrastructure\/.*\.strategy\.ts$/, // Estrategias de Passport/Auth
  /\/infrastructure\/.*\.interceptor\.ts$/, // Interceptors de NestJS
  /\/infrastructure\/.*\.filter\.ts$/, // Exception filters
  /\/infrastructure\/.*\.pipe\.ts$/, // Pipes de validación
];

// Función para verificar si un archivo debe ser excluido
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

// Función para parsear el archivo lcov.info y calcular la cobertura total
function calculateCoverage(lcovContent) {
  const lines = lcovContent.split('\n');
  let totalLines = 0;
  let coveredLines = 0;
  let currentFile = null;
  let excludedFiles = [];
  let includedFiles = [];
  let filesWithCoverage = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar el archivo actual
    if (line.startsWith('SF:')) {
      currentFile = line.substring(3);
    }
    
    // Si encontramos líneas de cobertura, verificamos si debemos incluir el archivo
    if (line.startsWith('LF:')) {
      const fileLines = parseInt(line.substring(3), 10);
      
      if (currentFile && shouldExcludeFile(currentFile)) {
        excludedFiles.push({
          file: currentFile,
          lines: fileLines,
          reason: getExclusionReason(currentFile)
        });
        // Saltamos las líneas de este archivo
        continue;
      } else if (currentFile) {
        includedFiles.push(currentFile);
        totalLines += fileLines;
      }
    } else if (line.startsWith('LH:')) {
      const fileCoveredLines = parseInt(line.substring(3), 10);
      
      if (currentFile && !shouldExcludeFile(currentFile)) {
        coveredLines += fileCoveredLines;
        filesWithCoverage.push({
          file: currentFile,
          covered: fileCoveredLines,
          total: totalLines - (filesWithCoverage.reduce((acc, f) => acc + f.total, 0) || 0)
        });
      }
    }
  }

  // Mostrar información detallada de archivos excluidos por categoría
  if (excludedFiles.length > 0) {
    console.log(`\n📋 Archivos excluidos del cálculo de cobertura (${excludedFiles.length}):`);
    
    // Agrupar por razón de exclusión
    const exclusionGroups = excludedFiles.reduce((groups, item) => {
      const reason = item.reason;
      if (!groups[reason]) {
        groups[reason] = [];
      }
      groups[reason].push(item);
      return groups;
    }, {});

    Object.entries(exclusionGroups).forEach(([reason, files]) => {
      console.log(`\n  ${reason} (${files.length} archivos):`);
      files.forEach(fileInfo => {
        const relativePath = fileInfo.file.replace(process.cwd(), '.');
        console.log(`    - ${relativePath} (${fileInfo.lines} líneas)`);
      });
    });

    const totalExcludedLines = excludedFiles.reduce((acc, f) => acc + f.lines, 0);
    console.log(`\n  📊 Total de líneas excluidas: ${totalExcludedLines}`);
  }

  console.log(`\n📊 Resumen de análisis de cobertura:`);
  console.log(`  - Archivos incluidos en el cálculo: ${includedFiles.length}`);
  console.log(`  - Archivos excluidos del cálculo: ${excludedFiles.length}`);
  console.log(`  - Total de líneas analizadas: ${totalLines}`);
  console.log(`  - Líneas cubiertas por tests: ${coveredLines}`);

  if (totalLines === 0) {
    console.error('\n❌ No se encontraron líneas para calcular cobertura');
    console.error('   Verifica que el archivo lcov.info contenga datos válidos');
    return 0;
  }

  return (coveredLines / totalLines) * 100;
}

// Función para obtener la razón de exclusión de un archivo
function getExclusionReason(filePath) {
  if (/\.module\.ts$/.test(filePath)) return '🏗️  Módulos NestJS';
  if (/main\.ts$|app\.controller\.ts$|app\.service\.ts$/.test(filePath)) return '🚀 Configuración de aplicación';
  if (/data-source\.ts$/.test(filePath)) return '🗄️  Configuración de base de datos';
  if (/\/migrations\/.*\.ts$/.test(filePath)) return '📊 Migraciones de base de datos';
  if (/\.entity\.ts$/.test(filePath)) return '🗃️  Entidades de base de datos';
  if (/\.mapper\.ts$|\.adapter\.ts$/.test(filePath)) return '🔄 Adaptadores y mappers';
  if (/\.dto\.ts$/.test(filePath)) return '📝 Data Transfer Objects';
  if (/\.spec\.ts$|\.test\.ts$|\.e2e-spec\.ts$/.test(filePath)) return '🧪 Archivos de testing';
  if (/\.enum\.ts$|\.interface\.ts$|\.type\.ts$|\.d\.ts$/.test(filePath)) return '📋 Definiciones de tipos';
  if (/\.config\.ts$|\.constants\.ts$/.test(filePath)) return '⚙️  Configuración y constantes';
  if (/\.swagger\.ts$|\/docs\/.*\.ts$/.test(filePath)) return '📚 Documentación';
  if (/\/scripts\/.*\.(js|ts)$/.test(filePath)) return '🛠️  Scripts de utilidad';
  if (/\/config\/.*\.ts$|\/examples\/.*\.ts$|\/tools\/.*\.ts$/.test(filePath)) return '📁 Directorios auxiliares';
  if (/\/domain\/.*\.(error|exception|repository|service)\.ts$/.test(filePath)) return '🏛️  Contratos de dominio';
  if (/\/infrastructure\/.*\.(guard|decorator|strategy|interceptor|filter|pipe)\.ts$/.test(filePath)) return '🔧 Infraestructura NestJS';
  if (/\/index\.ts$/.test(filePath)) return '📦 Archivos barrel';
  if (/\.(json|yaml|yml|md|mmd)$/.test(filePath)) return '📄 Archivos de configuración';
  
  return '🔍 Otros archivos excluidos';
}

// Verifica si el archivo lcov.info existe
if (!fs.existsSync(LCOV_PATH)) {
  console.error(`El archivo ${LCOV_PATH} no existe.`);
  console.error('Ejecuta los tests con cobertura primero: npm run test:unit -- --coverage');
  process.exit(1);
}

// Lee el contenido del archivo lcov.info
const lcovContent = fs.readFileSync(LCOV_PATH, 'utf8');
const coverage = calculateCoverage(lcovContent);

console.log(`\n🎯 Resultado del análisis de cobertura:`);
console.log(`   Cobertura actual: ${coverage.toFixed(2)}%`);
console.log(`   Umbral mínimo requerido: ${THRESHOLD}%`);

// Verifica si la cobertura cumple con el umbral
if (coverage < THRESHOLD) {
  const deficit = THRESHOLD - coverage;
  console.error(`\n❌ La cobertura (${coverage.toFixed(2)}%) está por debajo del umbral mínimo (${THRESHOLD}%)`);
  console.error(`   Necesitas incrementar la cobertura en ${deficit.toFixed(2)} puntos porcentuales`);
  console.log('\n💡 Notas importantes:');
  console.log('   • Los archivos de configuración, entidades, DTOs y testing están excluidos del cálculo');
  console.log('   • Solo se evalúa la lógica de aplicación y dominio que requiere testing');
  console.log('   • Enfócate en escribir tests para comandos, queries, handlers y servicios de dominio');
  process.exit(1);
} else {
  const surplus = coverage - THRESHOLD;
  console.log(`\n✅ La cobertura (${coverage.toFixed(2)}%) cumple con el umbral mínimo (${THRESHOLD}%)`);
  if (surplus > 10) {
    console.log(`🌟 ¡Excelente! Tienes ${surplus.toFixed(2)} puntos porcentuales por encima del mínimo`);
  }
  console.log('🎉 ¡Excelente cobertura de código!');
}