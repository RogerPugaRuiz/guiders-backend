/**
 * Este script se encarga de crear la carpeta de coverage si no existe
 * para evitar errores en el pipeline de CI/CD
 */
const fs = require('fs');
const path = require('path');

// Ruta a la carpeta coverage desde la raíz del proyecto
const coveragePath = path.join(__dirname, '../../coverage');

// Verificar si la carpeta existe
if (!fs.existsSync(coveragePath)) {
  console.log('Creando carpeta de coverage...');
  try {
    // Crear la carpeta
    fs.mkdirSync(coveragePath, { recursive: true });
    
    // Crear un archivo de placeholder para asegurar que la carpeta no esté vacía
    fs.writeFileSync(
      path.join(coveragePath, '.placeholder'), 
      'Este archivo se crea para asegurar que la carpeta coverage exista y no esté vacía.'
    );
    
    console.log('Carpeta de coverage creada con éxito');
  } catch (error) {
    console.error('Error al crear la carpeta de coverage:', error);
  }
} else {
  console.log('La carpeta de coverage ya existe');
}
