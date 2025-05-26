# Contexto Auth

Este contexto implementa la autenticación y autorización de usuarios y visitantes siguiendo los principios de DDD (Domain-Driven Design) y CQRS (Command Query Responsibility Segregation) usando NestJS v11 y el paquete @nestjs/cqrs.

## Estructura

- **application/**: Contiene la lógica de aplicación dividida en subcarpetas: commands, events, queries y dtos.
- **domain/**: Define las entidades, agregados, repositorios, eventos de dominio y value objects.
- **infrastructure/**: Implementa la persistencia, controladores y adaptadores externos.

### Componentes principales

- **auth-user/**: Gestión de autenticación de usuarios comerciales.
- **auth-visitor/**: Gestión de autenticación de visitantes.
- **api-key/**: Validación de API keys para identificar empresas.

## Principios

- **DDD**: El dominio es el núcleo, modelando reglas de negocio y comportamientos.
- **CQRS**: Se separan los comandos (escritura) de las queries (lectura) para mayor claridad y escalabilidad.
- **Eventos**: Los cambios relevantes generan eventos que pueden ser manejados por EventHandlers siguiendo el patrón `<NewAction>On<OldAction>EventHandler`.

## Flujos principales

### Registro de visitantes

```
┌───────────┐      ┌─────────────────┐      ┌──────────────────┐
│  Cliente  │ ───▶ │  API Gateway    │ ───▶ │ RegisterVisitor  │
└───────────┘      └─────────────────┘      └──────────────────┘
                                                    │
                                                    ▼
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│EventHandler     │ ◀─── │VisitorAccount   │ ◀─── │ValidateDomainAPI │
└─────────────────┘      └─────────────────┘      └──────────────────┘
```

1. El cliente envía una solicitud con apiKey, clientId, userAgent y domain.
2. Se valida que el dominio está autorizado para la apiKey proporcionada.
3. Se crea una cuenta de visitante y se genera un evento de dominio.
4. Se emiten tokens JWT para la autenticación posterior.

### Autenticación con tokens

```typescript
// Ejemplo de autenticación con token
const authHeader = req.headers.authorization;
const token = authHeader.split(' ')[1]; 
const payload = await this.tokenService.verify(token);
if (!payload) {
  throw new UnauthorizedError();
}

// El usuario está autenticado
const userId = payload.sub;
```

## Ejemplos de uso

### Registro de visitante

```typescript
@Controller('auth/visitor')
export class AuthVisitorController {
  constructor(private readonly registerVisitor: RegisterVisitor) {}

  @Post('register')
  async register(@Body() dto: RegisterVisitorDto) {
    await this.registerVisitor.execute(
      dto.apiKey,
      dto.clientId,
      dto.userAgent,
      dto.domain,
    );
    return { success: true };
  }
}
```

### Generación de tokens

```typescript
@Injectable()
export class GenerateVisitorTokens {
  constructor(
    @Inject(AUTH_VISITOR_TOKEN_SERVICE)
    private readonly tokenService: AuthVisitorTokenService,
  ) {}

  async execute(clientId: number): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.tokenService.generateAccessToken(clientId);
    const refreshToken = await this.tokenService.generateRefreshToken(clientId);

    return {
      accessToken,
      refreshToken,
    };
  }
}
```

## Intención

Esta arquitectura permite escalar y mantener el contexto de autenticación de forma robusta, desacoplando la lógica de negocio de la infraestructura y facilitando la extensión de funcionalidades.
