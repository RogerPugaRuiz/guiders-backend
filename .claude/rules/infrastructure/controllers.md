# REST Controllers

## Descripción

Endpoints HTTP que delegan a CommandBus/QueryBus sin lógica de negocio.

## Referencia

`src/context/conversations-v2/infrastructure/controllers/chat-v2.controller.ts`

## Estructura Base

```typescript
import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Chats')
@ApiBearerAuth()
@Controller('v2/chats')
@UseGuards(AuthGuard, RoleGuard)
export class ChatController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles(['commercial', 'admin'])
  @ApiOperation({ summary: 'Crear nuevo chat' })
  @ApiResponse({ status: 201, type: ChatResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() dto: CreateChatDto): Promise<ChatResponseDto> {
    const result = await this.commandBus.execute(
      new CreateChatCommand(dto.visitorId, dto.companyId),
    );

    if (result.isErr()) {
      throw new BadRequestException(result.error().message);
    }

    return { id: result.unwrap() };
  }

  @Get(':id')
  @Roles(['commercial', 'admin', 'visitor'])
  @ApiOperation({ summary: 'Obtener chat por ID' })
  @ApiResponse({ status: 200, type: ChatResponseDto })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async findById(@Param('id') id: string): Promise<ChatResponseDto> {
    const result = await this.queryBus.execute(new FindChatByIdQuery(id));

    if (result.isErr()) {
      throw new NotFoundException(result.error().message);
    }

    return result.unwrap();
  }
}
```

## Guards Disponibles

| Guard | Uso |
|-------|-----|
| `AuthGuard` | JWT Bearer obligatorio |
| `DualAuthGuard` | JWT o BFF cookies (Keycloak) |
| `OptionalAuthGuard` | Auth opcional, no falla |
| `RoleGuard` + `@Roles([])` | Verificar roles |
| `ApiKeyGuard` | Validar API key |

## Decoradores Swagger Obligatorios

```typescript
@ApiTags('Módulo')           // Agrupación en Swagger
@ApiBearerAuth()             // Indica autenticación
@ApiOperation({ summary })   // Descripción del endpoint
@ApiResponse({ status, type, description })  // Respuestas posibles
@ApiParam({ name, description })  // Parámetros de ruta
@ApiQuery({ name, required, description })  // Query params
```

## Manejo de Errores

```typescript
@Get(':id')
async findById(@Param('id') id: string): Promise<ChatResponseDto> {
  const result = await this.queryBus.execute(new FindChatByIdQuery(id));

  if (result.isErr()) {
    const error = result.error();

    // Mapear errores de dominio a HTTP
    if (error instanceof ChatNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof InvalidChatStatusError) {
      throw new BadRequestException(error.message);
    }

    throw new InternalServerErrorException('Error interno');
  }

  return result.unwrap();
}
```

## Acceso a Usuario Autenticado

```typescript
@Get('me/chats')
async getMyChats(@Req() request: RequestWithUser): Promise<ChatListDto> {
  const userId = request.user.sub;
  const companyId = request.user.companyId;

  return this.queryBus.execute(
    new FindChatsByUserQuery(userId, companyId),
  );
}
```

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Controller | `<Entity>Controller` | `ChatController` |
| Archivo | `<entity>.controller.ts` | `chat.controller.ts` |
| Ruta | kebab-case plural | `/v2/chats` |

## Anti-patrones

- Lógica de negocio en controllers
- Acceso directo a repositorios
- Olvidar decoradores Swagger
- Olvidar guards de autenticación
