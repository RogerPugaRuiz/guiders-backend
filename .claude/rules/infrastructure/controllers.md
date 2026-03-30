# REST Controllers

## Description

HTTP endpoints that delegate to CommandBus/QueryBus without business logic.

## Reference

`src/context/conversations-v2/infrastructure/controllers/chat-v2.controller.ts`

## Base Structure

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

## Available Guards

| Guard | Usage |
|-------|-------|
| `AuthGuard` | Mandatory JWT Bearer |
| `DualAuthGuard` | JWT or BFF cookies (Keycloak) |
| `OptionalAuthGuard` | Optional auth, doesn't fail |
| `RoleGuard` + `@Roles([])` | Verify roles |
| `ApiKeyGuard` | Validate API key |

## Required Swagger Decorators

```typescript
@ApiTags('Module')           // Group endpoints in Swagger
@ApiBearerAuth()             // Indicates authentication
@ApiOperation({ summary })   // Endpoint description
@ApiResponse({ status, type, description })  // Possible responses
@ApiParam({ name, description })  // Route parameters
@ApiQuery({ name, required, description })  // Query params
```

## Error Handling

```typescript
@Get(':id')
async findById(@Param('id') id: string): Promise<ChatResponseDto> {
  const result = await this.queryBus.execute(new FindChatByIdQuery(id));

  if (result.isErr()) {
    const error = result.error();

    // Map domain errors to HTTP
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

## Authenticated User Access

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

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Controller | `<Entity>Controller` | `ChatController` |
| File | `<entity>.controller.ts` | `chat.controller.ts` |
| Route | kebab-case plural | `/v2/chats` |

## Anti-patterns

- Business logic in controllers
- Direct repository access
- Missing Swagger decorators
- Missing authentication guards
