# Solución de Problemas MongoDB - Tests E2E

## Problema Común: Error de Conexión MongoDB

Si estás viendo errores como:
```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27018
MongooseServerSelectionError: connect ECONNREFUSED ::1:27017
Unable to connect to the database
```

## ✅ Solución Rápida

### 1. Verificar la Configuración
```bash
# Verificar la conectividad MongoDB
npm run test:check-mongo
```

### 2. Para Desarrollo Local
```bash
# Levantar MongoDB con docker-compose
docker-compose up -d mongodb-test

# Ejecutar tests E2E localmente
npm run test:e2e
```

### 3. Para CI/GitHub Actions
```bash
# Ejecutar tests con configuración CI
npm run test:e2e:ci
```

## 🔧 Configuración Actual

### Puertos
- **Desarrollo Local**: MongoDB en puerto `27017` (ya no se usa 27018)
- **CI/GitHub Actions**: MongoDB en puerto `27017`
- **Docker Compose**: Expone en puerto `27017`

### Variables de Entorno
```bash
TEST_MONGODB_HOST=localhost
TEST_MONGODB_PORT=27017
TEST_MONGODB_DATABASE=guiders-test
TEST_MONGODB_ROOT_USERNAME=admin_test
TEST_MONGODB_ROOT_PASSWORD=admin123
```

## 🐛 Diagnóstico de Problemas

### 1. MongoDB no está corriendo
```bash
# Verificar si MongoDB está corriendo
docker ps | grep mongo

# Si no está corriendo, levantarlo
docker-compose up -d mongodb-test
```

### 2. Puerto ocupado o incorrecto
```bash
# Verificar qué está usando el puerto 27017
lsof -i :27017

# Si hay conflicto, detener el servicio conflictivo o cambiar puerto
```

### 3. Credenciales incorrectas
El script `npm run test:check-mongo` te dirá si hay problemas de autenticación.

### 4. En GitHub Actions
Verifica que el workflow tenga:
```yaml
services:
  mongodb:
    image: mongo:5.0.13
    env:
      MONGO_INITDB_ROOT_USERNAME: admin_test
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: guiders-test
    ports:
      - 27017:27017
    options: >-
      --health-cmd "mongosh --eval 'db.runCommand({ping: 1})'"
      --health-interval 10s
      --health-timeout 10s
      --health-retries 5
```

## 📁 Archivos de Configuración

### Configuración Jest E2E Regular (`test/jest-e2e.json`)
- Usa `jest-e2e.setup.ts`
- Para desarrollo local
- Puerto por defecto: 27017

### Configuración Jest E2E CI (`test/jest-e2e.ci.json`)
- Usa `jest-e2e.ci.setup.ts`
- Para GitHub Actions CI/CD
- Puerto fijo: 27017

### Helper MongoDB (`test/helpers/mongo-test.helper.ts`)
- Detecta automáticamente si está en CI
- CI: Usa servicio MongoDB real
- Local: Usa configuración estándar MongoDB

## 🚀 Comandos Útiles

```bash
# Verificar configuración completa E2E
node scripts/verify-e2e-ci-setup.js

# Verificar conectividad MongoDB
npm run test:check-mongo

# Limpiar y reiniciar servicios
docker-compose down
docker-compose up -d mongodb-test postgres-test

# Ejecutar tests específicos
npm run test:e2e -- --testNamePattern="Chat"
npm run test:e2e:ci -- --testNamePattern="Visitor"
```

## 📋 Checklist de Verificación

- [ ] MongoDB corriendo en puerto 27017
- [ ] Variables de entorno configuradas
- [ ] Docker compose funcional
- [ ] Script de verificación pasa: `npm run test:check-mongo`
- [ ] Setup E2E configurado correctamente
- [ ] Workflow GitHub Actions actualizado

Si sigues teniendo problemas, ejecuta `npm run test:check-mongo` para obtener información detallada del problema.