# Contexto OIDC

Este contexto implementa la autenticación mediante OpenID Connect (OIDC) usando NestJS Passport, siguiendo los principios de DDD (Domain-Driven Design) y proporcionando integración con proveedores OIDC estándar como Google, Microsoft Azure, Auth0, etc.

## Estructura

- **domain/**: Define las entidades, agregados, repositorios, eventos de dominio y value objects para OIDC
- **application/**: Contiene la lógica de aplicación dividida en comandos, consultas, servicios y DTOs
- **infrastructure/**: Implementa la persistencia, controladores, guards y estrategias de Passport

## Funcionalidades Implementadas

### 1. Autenticación OIDC Básica

- **Passport Strategy**: Estrategia personalizada para OIDC usando `passport-openidconnect`
- **Guards**: Guards de autenticación para proteger rutas
- **Controladores**: Endpoints para iniciar y manejar callbacks de OIDC

### 2. Integración con Sistema Existente

- **Extended Auth Guard**: Guard extendido que soporta tanto autenticación JWT existente como OIDC
- **Compatibilidad**: Mantiene compatibilidad con el sistema de autenticación actual

## Configuración

### Variables de Entorno

```env
# Configuración OIDC
OIDC_ISSUER_URL=https://accounts.google.com
OIDC_AUTH_URL=https://accounts.google.com/o/oauth2/v2/auth
OIDC_TOKEN_URL=https://oauth2.googleapis.com/token
OIDC_USERINFO_URL=https://openidconnect.googleapis.com/v1/userinfo
OIDC_CLIENT_ID=your-client-id.apps.googleusercontent.com
OIDC_CLIENT_SECRET=your-client-secret
OIDC_CALLBACK_URL=http://localhost:3000/auth/oidc/callback
```

### Ejemplo de Configuración para Google

1. Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Habilitar Google+ API
3. Crear credenciales OAuth 2.0
4. Configurar URL de redirección autorizada: `http://localhost:3000/auth/oidc/callback`

## Endpoints Disponibles

### Autenticación OIDC

```typescript
GET /auth/oidc/login
```
- Inicia el flujo de autenticación OIDC
- Redirecciona al proveedor OIDC configurado

```typescript
GET /auth/oidc/callback
```
- Maneja la respuesta del proveedor OIDC
- Procesa tokens y crea sesión de usuario

```typescript
GET /auth/oidc/profile
```
- Obtiene el perfil del usuario autenticado via OIDC
- Requiere autenticación previa

## Uso Básico

### 1. Importar el Módulo

```typescript
import { Module } from '@nestjs/common';
import { SimpleOidcModule } from './context/auth/oidc/simple-oidc.module';

@Module({
  imports: [SimpleOidcModule],
})
export class AppModule {}
```

### 2. Proteger Rutas

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { OidcAuthGuard } from './context/auth/oidc/infrastructure/guards/oidc-auth.guard';

@Controller('protected')
export class ProtectedController {
  @Get()
  @UseGuards(OidcAuthGuard)
  getProtectedResource() {
    return { message: 'Este recurso requiere autenticación OIDC' };
  }
}
```

### 3. Autenticación Híbrida (JWT + OIDC)

```typescript
import { ExtendedAuthGuard } from './context/auth/oidc/infrastructure/guards/extended-auth.guard';

@Controller('hybrid')
export class HybridController {
  @Get()
  @UseGuards(ExtendedAuthGuard) // Soporta tanto JWT como OIDC
  getResource(@Req() req) {
    const user = req.user;
    return {
      message: `Hola ${user.name}`,
      provider: user.provider, // 'jwt' o 'oidc'
    };
  }
}
```

## Arquitectura Completa (Pendiente)

El contexto incluye una implementación completa siguiendo DDD con:

- **Value Objects**: OidcProviderId, OidcClientId, OidcScopes, etc.
- **Agregados**: OidcProvider para gestionar configuraciones de proveedores
- **Eventos de Dominio**: OidcAuthenticationStarted, OidcAuthenticationCompleted, etc.
- **Comandos**: CreateOidcProvider, InitiateOidcAuthentication, CompleteOidcAuthentication
- **Consultas**: GetOidcProviders

*Nota: La implementación completa está temporalmente deshabilitada mientras se resuelven dependencias.*

## Flujo de Autenticación

1. **Inicio**: Usuario accede a `/auth/oidc/login`
2. **Redirección**: Sistema redirecciona a proveedor OIDC
3. **Autorización**: Usuario autoriza en el proveedor
4. **Callback**: Proveedor redirecciona a `/auth/oidc/callback`
5. **Validación**: Sistema valida tokens y crea sesión
6. **Acceso**: Usuario puede acceder a recursos protegidos

## Extensibilidad

### Agregar Nuevos Proveedores

1. Configurar variables de entorno específicas del proveedor
2. Extender la estrategia OIDC si es necesario
3. Implementar validaciones específicas del proveedor

### Integración con Base de Datos

El sistema está preparado para:
- Almacenar configuraciones de proveedores OIDC
- Vincular usuarios OIDC con usuarios existentes
- Gestionar tokens de renovación

## Próximos Pasos

1. Completar implementación del domain layer
2. Implementar persistencia de configuraciones OIDC
3. Agregar soporte para múltiples proveedores
4. Implementar renovación automática de tokens
5. Agregar tests de integración

## Ejemplos de Proveedores

### Google
```env
OIDC_ISSUER_URL=https://accounts.google.com
OIDC_CLIENT_ID=xxx.apps.googleusercontent.com
```

### Microsoft Azure
```env
OIDC_ISSUER_URL=https://login.microsoftonline.com/{tenant}/v2.0
OIDC_CLIENT_ID=your-application-id
```

### Auth0
```env
OIDC_ISSUER_URL=https://your-domain.auth0.com
OIDC_CLIENT_ID=your-auth0-client-id
```