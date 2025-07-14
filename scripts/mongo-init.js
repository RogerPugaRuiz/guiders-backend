// Script de inicialización de MongoDB para crear usuario de aplicación
// Se ejecuta automáticamente cuando el contenedor se inicia por primera vez

print('====== INICIANDO CONFIGURACIÓN DE MONGODB ======');

// Obtener variables de entorno
const username = process.env.MONGODB_USERNAME || 'guiders_admin';
const password = process.env.MONGODB_PASSWORD || 'password';
const database = process.env.MONGODB_DATABASE || 'guiders_production';

print(`Configurando base de datos: ${database}`);
print(`Creando usuario: ${username}`);

// Cambiar a la base de datos de la aplicación
db = db.getSiblingDB(database);

// Crear el usuario con permisos de lectura y escritura
try {
  db.createUser({
    user: username,
    pwd: password,
    roles: [
      {
        role: 'readWrite',
        db: database
      },
      {
        role: 'dbAdmin',
        db: database
      }
    ]
  });
  
  print(`✅ Usuario '${username}' creado exitosamente en la base de datos '${database}'`);
  
  // Verificar que el usuario fue creado
  const users = db.getUsers();
  print(`📋 Usuarios en la base de datos '${database}':`);
  users.users.forEach(user => {
    print(`  - ${user.user} (roles: ${user.roles.map(r => r.role).join(', ')})`);
  });
  
} catch (error) {
  if (error.code === 51003) {
    print(`⚠️  Usuario '${username}' ya existe en la base de datos '${database}'`);
  } else {
    print(`❌ Error creando usuario: ${error.message}`);
    throw error;
  }
}

// Crear una colección de prueba para verificar que todo funciona
try {
  db.test_connection.insertOne({
    message: 'MongoDB initialization successful',
    timestamp: new Date(),
    user: username,
    database: database
  });
  
  print('✅ Colección de prueba creada exitosamente');
  
  // Limpiar la colección de prueba
  db.test_connection.drop();
  print('🧹 Colección de prueba eliminada');
  
} catch (error) {
  print(`❌ Error en prueba de inserción: ${error.message}`);
}

print('====== CONFIGURACIÓN DE MONGODB COMPLETADA ======');
