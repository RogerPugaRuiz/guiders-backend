# Variables de Entorno de Keycloak

## Resumen de Cambios

Se han extraído las URLs hardcodeadas de Keycloak del código fuente y se han convertido en variables de entorno configurables. Esto permite tener diferentes configuraciones para desarrollo, staging y producción.

## Variables Extraídas

Las siguientes variables se han extraído del archivo `jwt.strategy.ts`:

- `KEYCLOAK_ISSUER`: URL del issuer de Keycloak
- `KEYCLOAK_JWKS_URI`: URL del endpoint JWKS de Keycloak
- `KEYCLOAK_AUDIENCE`: Audiencia del token JWT

## Configuración por Entorno

### Desarrollo (`.env`)

```bash
KEYCLOAK_ISSUER=http://localhost:8080/realms/guiders
KEYCLOAK_JWKS_URI=http://localhost:8080/realms/guiders/protocol/openid-connect/certs
KEYCLOAK_AUDIENCE=console
```

### Staging

Las siguientes variables deben configurarse como **GitHub Secrets** en el repositorio:

- `STAGING_KEYCLOAK_ISSUER`: URL del issuer para staging (ej: `https://auth-staging.guiders.es/realms/guiders`)
- `STAGING_KEYCLOAK_JWKS_URI`: URL del JWKS para staging (ej: `https://auth-staging.guiders.es/realms/guiders/protocol/openid-connect/certs`)
- `STAGING_KEYCLOAK_AUDIENCE`: Audiencia para staging (opcional, por defecto: `console`)

### Producción

Las siguientes variables deben configurarse como **GitHub Secrets** en el repositorio:

- `KEYCLOAK_ISSUER`: URL del issuer para producción (ej: `https://auth.guiders.es/realms/guiders`)
- `KEYCLOAK_JWKS_URI`: URL del JWKS para producción (ej: `https://auth.guiders.es/realms/guiders/protocol/openid-connect/certs`)
- `KEYCLOAK_AUDIENCE`: Audiencia para producción (opcional, por defecto: `console`)

## Configuración en GitHub

Para configurar estas variables en GitHub:

1. Ve a tu repositorio en GitHub
2. Navega a `Settings` > `Secrets and variables` > `Actions`
3. Haz clic en `New repository secret`
4. Añade cada variable con su valor correspondiente

### Ejemplo de valores típicos

```bash
# Staging
STAGING_KEYCLOAK_ISSUER=https://auth-staging.guiders.es/realms/guiders
STAGING_KEYCLOAK_JWKS_URI=https://auth-staging.guiders.es/realms/guiders/protocol/openid-connect/certs
STAGING_KEYCLOAK_AUDIENCE=console

# Producción
KEYCLOAK_ISSUER=https://auth.guiders.es/realms/guiders
KEYCLOAK_JWKS_URI=https://auth.guiders.es/realms/guiders/protocol/openid-connect/certs
KEYCLOAK_AUDIENCE=console
```

## Fallback Values

El código incluye valores de fallback que apuntan a la configuración de producción actual:

```typescript
issuer: process.env.KEYCLOAK_ISSUER || 'https://auth.guiders.es/realms/guiders'
jwksUri: process.env.KEYCLOAK_JWKS_URI || 'https://auth.guiders.es/realms/guiders/protocol/openid-connect/certs'
audience: process.env.KEYCLOAK_AUDIENCE || 'console'
```

Esto garantiza que la aplicación siga funcionando incluso si las variables de entorno no están configuradas.

## Verificación

Para verificar que las variables están correctamente configuradas:

1. **Desarrollo**: Revisar el archivo `.env` local
2. **Staging/Producción**: Verificar los logs de deployment en GitHub Actions
3. **Runtime**: Verificar que la autenticación JWT funciona correctamente

## Troubleshooting

### Error: "Invalid issuer"

Verifica que la variable `KEYCLOAK_ISSUER` esté correctamente configurada y que apunte al realm correcto de Keycloak.

### Error: "Unable to verify signature"

Verifica que la variable `KEYCLOAK_JWKS_URI` esté correctamente configurada y sea accesible desde el servidor de la aplicación.

### Error: "Invalid audience"

Verifica que la variable `KEYCLOAK_AUDIENCE` coincida con la audiencia configurada en el cliente de Keycloak.
