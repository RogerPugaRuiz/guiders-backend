/**
 * Script de verificación de cobertura de código para el proyecto Guiders Backend
 * 
 * Este script verifica que la cobertura de código cumpla con el umbral mínimo establecido.
 * Se enfoca ÚNICAMENTE en la carpeta 'context' que contiene la lógica de negocio principal.
 * 
 * Características:
 * - Solo analiza archivos dentro de src/context/
 * - Excluye automáticamente archivos que no requieren testing dentro de context
 * - Proporciona un análisis detallado de qué archivos se incluyen/excluyen
 * - Muestra estadísticas organizadas por categorías de exclusión
 * - Diseñado específicamente para proyectos NestJS con DDD y CQRS
 * 
 * Tipos de archivos excluidos en context:
 * - Módulos NestJS y configuración
 * - Entidades de base de datos y migraciones
 * - DTOs, mappers y adaptadores de infraestructura
 * - Archivos de testing
 * - Definiciones de tipos, interfaces y enums
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

// Patrones de archivos a excluir del cálculo de cobertura EN LA CARPETA CONTEXT
const EXCLUDE_PATTERNS = [
  // Configuración y setup dentro de context
  /\/context\/.*\.module\.ts$/, // Módulos NestJS dentro de context
  /\/context\/.*\/index\.ts$/, // Archivos barrel dentro de context
  /\/context\/.*\.config\.ts$/, // Archivos de configuración dentro de context
  /\/context\/.*\.constants\.ts$/, // Archivos de constantes dentro de context
  
  // Archivos de definición de tipos y contratos dentro de context
  /\/context\/.*\.enum\.ts$/, // Archivos de enums
  /\/context\/.*\.interface\.ts$/, // Interfaces de TypeScript puras
  /\/context\/.*\.type\.ts$/, // Tipos de TypeScript
  /\/context\/.*\.d\.ts$/, // Archivos de definición de tipos
  
  // Entidades de base de datos y mappers dentro de context
  /\/context\/.*\.entity\.ts$/, // Entidades de TypeORM
  /\/context\/.*\.mapper\.ts$/, // Mappers de infraestructura
  /\/context\/.*\.adapter\.ts$/, // Adaptadores de infraestructura
  
  // DTOs dentro de context
  /\/context\/.*\.dto\.ts$/, // Data Transfer Objects
  
  // Archivos de testing dentro de context
  /\/context\/.*\.spec\.ts$/, // Archivos de test
  /\/context\/.*\.test\.ts$/, // Archivos de test alternativos
  /\/context\/.*\.int-spec\.ts$/, // Tests de integración
  /\/context\/.*\.e2e-spec\.ts$/, // Tests end-to-end
  
  // Archivos específicos del dominio que son solo definiciones dentro de context
  /\/context\/.*\/domain\/.*\.error\.ts$/, // Clases de error de dominio
  /\/context\/.*\/domain\/.*\.exception\.ts$/, // Excepciones de dominio
  /\/context\/.*\/domain\/.*\.repository\.ts$/, // Interfaces de repositorios (solo contratos)
  /\/context\/.*\/domain\/.*\.service\.ts$/, // Interfaces de servicios de dominio (solo contratos)
  
  // Archivos de infraestructura específicos dentro de context
  /\/context\/.*\/infrastructure\/.*\.guard\.ts$/, // Guards de NestJS
  /\/context\/.*\/infrastructure\/.*\.decorator\.ts$/, // Decoradores personalizados
  /\/context\/.*\/infrastructure\/.*\.strategy\.ts$/, // Estrategias de Passport/Auth
  /\/context\/.*\/infrastructure\/.*\.interceptor\.ts$/, // Interceptors de NestJS
  /\/context\/.*\/infrastructure\/.*\.filter\.ts$/, // Exception filters
  /\/context\/.*\/infrastructure\/.*\.pipe\.ts$/, // Pipes de validación
];

// Función para verificar si un archivo debe ser excluido
function shouldExcludeFile(filePath) {
  // Primero verificar que el archivo esté dentro de context
  if (!filePath.includes('/context/')) {
    return true; // Excluir todo lo que no esté en context
  }
  
  // Luego verificar patrones específicos de exclusión
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
  // Si no está en context
  if (!filePath.includes('/context/')) {
    return '🚫 Fuera del directorio context';
  }
  
  // Patrones específicos para archivos en context
  if (/\/context\/.*\.module\.ts$/.test(filePath)) return '🏗️  Módulos NestJS';
  if (/\/context\/.*\.entity\.ts$/.test(filePath)) return '🗃️  Entidades de base de datos';
  if (/\/context\/.*\.mapper\.ts$|\/context\/.*\.adapter\.ts$/.test(filePath)) return '🔄 Adaptadores y mappers';
  if (/\/context\/.*\.dto\.ts$/.test(filePath)) return '📝 Data Transfer Objects';
  if (/\/context\/.*\.spec\.ts$|\/context\/.*\.test\.ts$|\/context\/.*\.int-spec\.ts$|\/context\/.*\.e2e-spec\.ts$/.test(filePath)) return '🧪 Archivos de testing';
  if (/\/context\/.*\.enum\.ts$|\/context\/.*\.interface\.ts$|\/context\/.*\.type\.ts$|\/context\/.*\.d\.ts$/.test(filePath)) return '📋 Definiciones de tipos';
  if (/\/context\/.*\.config\.ts$|\/context\/.*\.constants\.ts$/.test(filePath)) return '⚙️  Configuración y constantes';
  if (/\/context\/.*\/domain\/.*\.(error|exception|repository|service)\.ts$/.test(filePath)) return '🏛️  Contratos de dominio';
  if (/\/context\/.*\/infrastructure\/.*\.(guard|decorator|strategy|interceptor|filter|pipe)\.ts$/.test(filePath)) return '🔧 Infraestructura NestJS';
  if (/\/context\/.*\/index\.ts$/.test(filePath)) return '📦 Archivos barrel';
  
  return '🔍 Otros archivos excluidos en context';
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

console.log(`\n🎯 Resultado del análisis de cobertura (solo carpeta context):`);
console.log(`   Cobertura actual: ${coverage.toFixed(2)}%`);
console.log(`   Umbral mínimo requerido: ${THRESHOLD}%`);

// Verifica si la cobertura cumple con el umbral
if (coverage < THRESHOLD) {
  const deficit = THRESHOLD - coverage;
  console.error(`\n❌ La cobertura (${coverage.toFixed(2)}%) está por debajo del umbral mínimo (${THRESHOLD}%)`);
  console.error(`   Necesitas incrementar la cobertura en ${deficit.toFixed(2)} puntos porcentuales`);
  console.log('\n💡 Notas importantes:');
  console.log('   • Solo se evalúa código dentro de src/context/ (lógica de negocio principal)');
  console.log('   • Los archivos de configuración, entidades, DTOs y testing están excluidos del cálculo');
  console.log('   • Enfócate en escribir tests para comandos, queries, handlers y servicios de dominio');
  console.log('   • Los contratos de dominio (interfaces) no requieren coverage directo');
  process.exit(1);
} else {
  const surplus = coverage - THRESHOLD;
  console.log(`\n✅ La cobertura (${coverage.toFixed(2)}%) cumple con el umbral mínimo (${THRESHOLD}%)`);
  if (surplus > 10) {
    console.log(`🌟 ¡Excelente! Tienes ${surplus.toFixed(2)} puntos porcentuales por encima del mínimo`);
  }
  console.log('🎉 ¡Excelente cobertura de código en la lógica de negocio!');
}