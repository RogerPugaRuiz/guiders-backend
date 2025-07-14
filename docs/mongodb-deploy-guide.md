# Guía de Scripts de Deploy y MongoDB

## Scripts Disponibles

### 1. `test-mongodb-connection.js`
Script básico para probar la conexión a MongoDB durante el desarrollo.

**Uso:**
```bash
cd /var/www/guiders-backend
node test-mongodb-connection.js
```

**Propósito:**
- Verificar que MongoDB esté accesible
- Probar credenciales de autenticación
- Listar colecciones existentes

### 2. `verify-mongodb-deploy.js`
Script completo para verificar MongoDB después del deploy.

**Uso:**
```bash
cd /var/www/guiders-backend
node verify-mongodb-deploy.js
```

**Propósito:**
- Verificación exhaustiva post-deploy
- Pruebas de lectura y escritura
- Validación de índices
- Estadísticas de la base de datos

### 3. `rollback-deploy.js`
Script para hacer rollback en caso de fallo del deploy.

**Uso:**
```bash
cd /var/www/guiders-backend
node rollback-deploy.js
```

**Propósito:**
- Restaurar estado anterior de la aplicación
- Rollback de contenedores Docker
- Restaurar PM2 a estado funcional

## Integración en el Workflow de Deploy

### Flujo del Deploy

1. **Backup**: Se crea un backup antes del deploy
2. **Deploy**: Se despliega la nueva versión
3. **Test MongoDB**: Se verifica la conexión básica
4. **Migraciones**: Se ejecutan migraciones de TypeORM
5. **Restart App**: Se reinicia la aplicación con PM2
6. **Verificación Final**: Se ejecuta verificación completa de MongoDB

### Manejo de Errores

Si algún paso falla:
- El workflow de GitHub Actions se detiene
- Se conserva el backup anterior
- Se puede ejecutar manualmente `rollback-deploy.js`

### Variables de Entorno Necesarias

En el archivo `.env.production`:
```env
MONGODB_HOST=localhost
MONGODB_USERNAME=admin
MONGODB_PASSWORD=your_password
MONGODB_DATABASE=guiders
MONGODB_PORT=27017
```

## Uso Manual en Producción

### Verificar Estado de MongoDB
```bash
# Verificación básica
node test-mongodb-connection.js

# Verificación completa
node verify-mongodb-deploy.js
```

### En Caso de Problemas

1. **Verificar contenedores Docker:**
   ```bash
   docker ps | grep mongodb-prod
   docker logs mongodb-prod
   ```

2. **Verificar aplicación:**
   ```bash
   pm2 list
   pm2 logs guiders-backend
   ```

3. **Hacer rollback si es necesario:**
   ```bash
   node rollback-deploy.js
   ```

## Logs y Debugging

### Logs de MongoDB
```bash
docker logs mongodb-prod
```

### Logs de la aplicación
```bash
pm2 logs guiders-backend
```

### Verificar conectividad
```bash
# Desde dentro del contenedor
docker exec -it mongodb-prod mongosh -u admin -p password
```

## Troubleshooting Común

### Error de autenticación
- Verificar MONGODB_USERNAME y MONGODB_PASSWORD
- Comprobar que authSource=admin sea correcto

### Timeout de conexión
- Verificar que el contenedor MongoDB esté ejecutándose
- Comprobar configuración de red

### Error de permisos
- Verificar que el usuario tenga permisos en la base de datos
- Comprobar configuración de usuarios en MongoDB

## Mejores Prácticas

1. **Siempre hacer backup antes del deploy**
2. **Ejecutar tests de MongoDB después de cambios**
3. **Monitorear logs durante el deploy**
4. **Tener plan de rollback preparado**
5. **Documentar cambios en la configuración**

## Contacto

Para problemas con el deploy o MongoDB:
- Revisar logs primero
- Ejecutar scripts de verificación
- Contactar al equipo de DevOps si persisten los problemas
