# DTOs (Data Transfer Objects)

## Descripción

Objetos para transferencia de datos con validación y documentación Swagger.

## Referencia
`src/context/conversations-v2/application/dtos/`

## Request DTO (Input)

```typescript
import { IsString, IsUUID, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty({
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  visitorId: string;

  @ApiProperty({
    description: 'ID de la empresa',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional({
    description: 'Mensaje inicial opcional',
    example: 'Hola, necesito ayuda',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  initialMessage?: string;
}
```

## Response DTO (Output)

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty({ description: 'ID del chat' })
  id: string;

  @ApiProperty({ description: 'Estado del chat', enum: ['PENDING', 'ACTIVE', 'CLOSED'] })
  status: string;

  @ApiProperty({ description: 'ID del visitante' })
  visitorId: string;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: string;

  // Factory desde dominio
  static fromDomain(chat: Chat): ChatResponseDto {
    const primitives = chat.toPrimitives();
    const dto = new ChatResponseDto();
    dto.id = primitives.id;
    dto.status = primitives.status;
    dto.visitorId = primitives.visitorId;
    dto.createdAt = primitives.createdAt;
    return dto;
  }

  // Factory desde primitivos
  static fromPrimitives(data: ChatPrimitives): ChatResponseDto {
    const dto = new ChatResponseDto();
    dto.id = data.id;
    dto.status = data.status;
    dto.visitorId = data.visitorId;
    dto.createdAt = data.createdAt;
    return dto;
  }
}
```

## List Response DTO

```typescript
export class ChatListResponseDto {
  @ApiProperty({ type: [ChatResponseDto] })
  items: ChatResponseDto[];

  @ApiProperty({ description: 'Total de elementos' })
  total: number;

  @ApiProperty({ description: 'Límite por página' })
  limit: number;

  @ApiProperty({ description: 'Offset actual' })
  offset: number;

  static create(
    items: ChatResponseDto[],
    total: number,
    limit: number,
    offset: number,
  ): ChatListResponseDto {
    const dto = new ChatListResponseDto();
    dto.items = items;
    dto.total = total;
    dto.limit = limit;
    dto.offset = offset;
    return dto;
  }
}
```

## Query Params DTO

```typescript
export class FindChatsQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por estado' })
  @IsOptional()
  @IsEnum(['PENDING', 'ACTIVE', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Límite de resultados', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Offset para paginación', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
```

## Validadores Comunes

| Decorador | Uso |
|-----------|-----|
| `@IsUUID()` | IDs |
| `@IsString()` | Textos |
| `@IsEmail()` | Emails |
| `@IsEnum(Enum)` | Valores fijos |
| `@IsOptional()` | Campos opcionales |
| `@MinLength(n)` | Longitud mínima |
| `@MaxLength(n)` | Longitud máxima |
| `@Type(() => Number)` | Transformar query params |

## Reglas de Naming

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Request | `<Action><Entity>Dto` | `CreateChatDto` |
| Response | `<Entity>ResponseDto` | `ChatResponseDto` |
| Query | `Find<Entity>QueryDto` | `FindChatsQueryDto` |

## Anti-patrones

- DTOs sin validación
- DTOs sin documentación Swagger
- Reusar DTOs de request como response
- Exponer campos internos sensibles
