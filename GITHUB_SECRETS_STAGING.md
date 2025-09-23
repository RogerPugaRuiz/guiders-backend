# GitHub Secrets para Staging - Configuración de Keycloak

## Nuevos Secrets Requeridos

Para que funcionen correctamente las redirect URIs de Keycloak en staging, se necesitan configurar los siguientes secrets en GitHub:

### OIDC_CONSOLE_REDIRECT_URI
- **Valor**: `https://guiders.es/api/bff/auth/callback/console`
- **Descripción**: URL de redirección para la aplicación console después de la autenticación Keycloak
- **Uso**: Reemplaza la construcción dinámica basada en `STAGING_APP_URL`

### OIDC_ADMIN_REDIRECT_URI
- **Valor**: `https://guiders.es/api/bff/auth/callback/admin`
- **Descripción**: URL de redirección para la aplicación admin después de la autenticación Keycloak
- **Uso**: Reemplaza la construcción dinámica basada en `STAGING_APP_URL`

## Configuración en GitHub

1. Ve a **Settings** → **Secrets and variables** → **Actions** en el repositorio
2. Añade estos dos nuevos **Repository secrets**:
   - Nombre: `OIDC_CONSOLE_REDIRECT_URI`
   - Valor: `https://guiders.es/api/bff/auth/callback/console`

   - Nombre: `OIDC_ADMIN_REDIRECT_URI`
   - Valor: `https://guiders.es/api/bff/auth/callback/admin`

## Valores por Defecto

Si no se configuran los secrets, el workflow usará automáticamente los valores por defecto:
- `https://guiders.es/api/bff/auth/callback/console`
- `https://guiders.es/api/bff/auth/callback/admin`

## Configuración en Keycloak

Asegúrate de que en Keycloak, el cliente `console` tenga configurada la redirect URI:
- `https://guiders.es/api/bff/auth/callback/console`

Y el cliente `admin` tenga configurada:
- `https://guiders.es/api/bff/auth/callback/admin`

## Cambios Realizados

- Modificado `.github/workflows/deploy-staging.yml` líneas 322-324
- Las redirect URIs ahora usan variables específicas en lugar de construirse dinámicamente
- Esto corrige el problema de URLs con IP local `http://10.0.0.1:3000`