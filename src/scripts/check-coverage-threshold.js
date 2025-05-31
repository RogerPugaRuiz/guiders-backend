/**
 * Este script verifica que la cobertura de código cumpla con el umbral mínimo establecido.
 * Se puede usar localmente para probar si se cumple el umbral antes de hacer un push.
 * Excluye archivos que no requieren testing como módulos, configuración, etc.
 */
const fs = require('fs');
const path = require('path');

// Configuración
const THRESHOLD = 80; // Umbral mínimo de cobertura (porcentaje)
const LCOV_PATH = path.join(__dirname, '../../coverage/lcov.info');

// Patrones de archivos a excluir del cálculo de cobertura
const EXCLUDE_PATTERNS = [
  /\.module\.ts$/, // Módulos NestJS
  /main\.ts$/, // Punto de entrada de la aplicación
  /data-source\.ts$/, // Configuración de base de datos
  /\/migrations\/.*\.ts$/, // Archivos de migración
  /\/index\.ts$/, // Archivos barrel que solo re-exportan
  /\.config\.ts$/, // Archivos de configuración
  /\.constants\.ts$/, // Archivos de constantes
  /\/scripts\/.*\.js$/, // Scripts de utilidad
  /\.enum\.ts$/, // Archivos de enums
  /\.interface\.ts$/, // Interfaces de TypeScript puras
  /\.type\.ts$/, // Tipos de TypeScript
  /Dockerfile/, // Archivos Docker
  /\.json$/, // Archivos de configuración JSON
  /jest\.config/, // Configuración de Jest
  /\.d\.ts$/, // Archivos de definición de tipos
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar el archivo actual
    if (line.startsWith('SF:')) {
      currentFile = line.substring(3);
    }
    
    // Si encontramos líneas de cobertura, verificamos si debemos incluir el archivo
    if (line.startsWith('LF:')) {
      if (currentFile && shouldExcludeFile(currentFile)) {
        excludedFiles.push(currentFile);
        // Saltamos las líneas de este archivo
        continue;
      } else if (currentFile) {
        includedFiles.push(currentFile);
      }
      
      totalLines += parseInt(line.substring(3), 10);
    } else if (line.startsWith('LH:')) {
      if (currentFile && !shouldExcludeFile(currentFile)) {
        coveredLines += parseInt(line.substring(3), 10);
      }
    }
  }

  // Mostrar información de archivos excluidos
  if (excludedFiles.length > 0) {
    console.log(`\n📋 Archivos excluidos del cálculo de cobertura (${excludedFiles.length}):`);
    excludedFiles.forEach(file => {
      const relativePath = file.replace(process.cwd(), '.');
      console.log(`  - ${relativePath}`);
    });
  }

  console.log(`\n📊 Archivos incluidos en el cálculo: ${includedFiles.length}`);

  if (totalLines === 0) {
    console.error('No se encontraron líneas para calcular cobertura');
    return 0;
  }

  return (coveredLines / totalLines) * 100;
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

console.log(`Cobertura total: ${coverage.toFixed(2)}%`);
console.log(`Umbral mínimo: ${THRESHOLD}%`);

// Verifica si la cobertura cumple con el umbral
if (coverage < THRESHOLD) {
  console.error(`❌ La cobertura (${coverage.toFixed(2)}%) está por debajo del umbral mínimo (${THRESHOLD}%)`);
  console.log('\n💡 Nota: Los archivos de módulos, configuración y utilidades están excluidos del cálculo.');
  process.exit(1);
} else {
  console.log(`✅ La cobertura (${coverage.toFixed(2)}%) cumple con el umbral mínimo (${THRESHOLD}%)`);
  console.log('🎉 ¡Excelente cobertura de código!');
}