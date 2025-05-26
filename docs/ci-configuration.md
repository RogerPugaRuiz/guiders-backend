# Configuración de CI

Este documento describe la configuración de integración continua (CI) en el proyecto, con enfoque en la ejecución de tests.

## Configuración de los tests en CI

### Configuración general

El workflow de CI está definido en `.github/workflows/ci.yml` y ejecuta varios trabajos (jobs):

- **lint**: Verifica el formato y lint del código
- **build**: Compila el proyecto
- **test-unit**: Ejecuta los tests unitarios
- **test-integration**: Ejecuta los tests de integración
- **test-e2e**: Ejecuta los tests end-to-end
- **ci-success**: Job final que se ejecuta si todos los anteriores son exitosos

### Configuración de servicios

Para los tests de integración y e2e, configuramos servicios de base de datos:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: guiders_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
  
  redis:
    image: redis:7-alpine
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 6379:6379
```

### Variables de entorno

Para el correcto funcionamiento de los tests en CI, configuramos las siguientes variables de entorno:

```bash
CI=true
NODE_ENV=test
DATABASE_URL=******postgres:5432/guiders_test
REDIS_URL=redis://redis:6379
TEST_DATABASE_HOST=postgres  # Nota: En local sería 'localhost'
TEST_DATABASE_PORT=5432
TEST_DATABASE_USERNAME=test
TEST_DATABASE_PASSWORD=test
TEST_DATABASE=guiders_test
```

### Archivos de configuración de tests

- **jest-unit.json**: Configuración para tests unitarios
- **jest-int.json**: Configuración para tests de integración
- **test/jest-e2e.json**: Configuración para tests e2e

Se han añadido archivos de inicialización para configurar el entorno:

- **test/setup.ts**: Configuración global para tests e2e
- **test/setup-int.ts**: Configuración global para tests de integración

Estos archivos de configuración determinan:

1. Aumentan el timeout de los tests a 30000 ms (30 segundos)
2. Configuran las variables de entorno necesarias
3. Adaptan las conexiones a servicios según el entorno (CI vs local)

## Resolución de problemas comunes

### Problemas de conexión a la base de datos

Si hay problemas de conexión a la base de datos, verificar:

1. En entorno CI: Los servicios deben accederse por su nombre (`postgres`, `redis`)
2. En entorno local: Los servicios deben accederse por `localhost`

### Timeouts en los tests

Si los tests fallan por timeout:

1. Aumentar el valor de `testTimeout` en los archivos de configuración Jest
2. Verificar la configuración `JEST_TIMEOUT` en los jobs de CI
3. Usar `jest.setTimeout()` para tests específicos que requieran más tiempo

## Nota importante

El archivo `setup.ts` (para e2e tests) y `setup-int.ts` (para tests de integración) detectan automáticamente si se están ejecutando en un entorno CI o local y configuran las variables de entorno adecuadamente.