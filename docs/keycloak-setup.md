# Configuración de Keycloak para Desarrollo

Este documento describe cómo configurar y usar Keycloak en el entorno de desarrollo del proyecto guiders-backend.

## Variables de Entorno

Añade estas variables a tu archivo `.env` para configurar Keycloak:

```bash
# Configuración de Keycloak
KEYCLOAK_PORT=8080
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin123
KEYCLOAK_LOG_LEVEL=INFO

# Base de datos de Keycloak
KEYCLOAK_DB_PORT=5434
KEYCLOAK_DB_USERNAME=keycloak
KEYCLOAK_DB_PASSWORD=keycloak
KEYCLOAK_DB_NAME=keycloak
```

## Inicio de Servicios

Para iniciar Keycloak junto con todos los servicios:

```bash
docker-compose up -d
```

Para iniciar solo Keycloak y su base de datos:

```bash
docker-compose up -d keycloak-postgres keycloak
```

## Acceso a la Consola de Administración

Una vez iniciado, puedes acceder a la consola de administración de Keycloak en:

- URL: <http://localhost:8080>
- Usuario: admin (o el valor de `KEYCLOAK_ADMIN_USERNAME`)
- Contraseña: admin123 (o el valor de `KEYCLOAK_ADMIN_PASSWORD`)

## Configuración Inicial

### 1. Crear un Realm

1. Accede a la consola de administración
2. En el menú desplegable superior izquierdo (donde dice "Keycloak"), haz clic para crear un nuevo realm
3. Haz clic en "Create realm"
4. Nombre sugerido: `guiders`
5. Habilita el realm

### 2. Crear un Cliente

1. Dentro del realm `guiders`, ve a "Clients"
2. Haz clic en "Create client"
3. Configuración sugerida:
   - Client ID: `guiders-backend`
   - Client type: `OpenID Connect`
   - Authentication: Habilitado
4. En la configuración del cliente:
   - Valid redirect URIs: `http://localhost:3000/*`
   - Web origins: `http://localhost:3000`

### 3. Crear Usuarios de Prueba

1. Ve a "Users" en el realm `guiders`
2. Haz clic en "Create new user"
3. Completa los datos del usuario
4. En la pestaña "Credentials", establece una contraseña temporal

## Integración con guiders-backend

Para integrar Keycloak con el backend, necesitarás:

1. **Instalar dependencias de Keycloak:**

   ```bash
   npm install keycloak-connect nest-keycloak-connect
   ```

2. **Configurar el módulo de Keycloak** en tu aplicación NestJS

3. **Obtener el client secret** desde la consola de administración:
   - Ve a tu cliente `guiders-backend`
   - En la pestaña "Credentials", copia el "Client secret"

## Endpoints Útiles

- **Admin Console:** <http://localhost:8080>
- **Realm endpoint:** <http://localhost:8080/realms/guiders>
- **Token endpoint:** <http://localhost:8080/realms/guiders/protocol/openid-connect/token>
- **Auth endpoint:** <http://localhost:8080/realms/guiders/protocol/openid-connect/auth>

## Troubleshooting

### Keycloak no inicia

1. Verifica que PostgreSQL esté corriendo: `docker-compose ps keycloak-postgres`
2. Revisa los logs: `docker-compose logs keycloak`
3. Asegúrate de que el puerto 8080 esté disponible

### Error de conexión a la base de datos

1. Verifica las variables de entorno en tu archivo `.env`
2. Confirma que el servicio `keycloak-postgres` esté corriendo
3. Revisa los logs de ambos servicios

### Problemas de memoria

Si Keycloak consume mucha memoria en desarrollo, puedes limitar el heap:

```yaml
# En docker-compose.yml, en el servicio keycloak
environment:
  JAVA_OPTS: "-Xms512m -Xmx1024m"
```

## Comandos Útiles

```bash
# Ver logs de Keycloak
docker-compose logs -f keycloak

# Reiniciar Keycloak
docker-compose restart keycloak

# Parar solo Keycloak
docker-compose stop keycloak

# Limpiar datos de Keycloak (cuidado: elimina todos los datos)
docker-compose down -v
```
