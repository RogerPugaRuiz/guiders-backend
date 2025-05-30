/**
 * Este script verifica que la cobertura de código cumpla con el umbral mínimo establecido.
 * Se puede usar localmente para probar si se cumple el umbral antes de hacer un push.
 */
const fs = require('fs');
const path = require('path');

// Configuración
const THRESHOLD = 80; // Umbral mínimo de cobertura (porcentaje)
const LCOV_PATH = path.join(__dirname, '../../coverage/lcov.info');

// Función para parsear el archivo lcov.info y calcular la cobertura total
function calculateCoverage(lcovContent) {
  const lines = lcovContent.split('\n');
  let totalLines = 0;
  let coveredLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('LF:')) {
      totalLines += parseInt(line.substring(3), 10);
    } else if (line.startsWith('LH:')) {
      coveredLines += parseInt(line.substring(3), 10);
    }
  }

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
  process.exit(1);
} else {
  console.log(`✅ La cobertura (${coverage.toFixed(2)}%) cumple con el umbral mínimo (${THRESHOLD}%)`);
}