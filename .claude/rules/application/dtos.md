# DTOs (Data Transfer Objects)

## Description

Objects for data transfer with validation and Swagger documentation.

## Reference
`src/context/conversations-v2/application/dtos/`

## Request DTO (Input)

```typescript
import { IsString, IsUUID, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty({
    description: 'Visitor ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  visitorId: string;

  @ApiProperty({
    description: 'Company ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional({
    description: 'Optional initial message',
    example: 'Hello, I need help',
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
  @ApiProperty({ description: 'Chat ID' })
  id: string;

  @ApiProperty({ description: 'Chat status', enum: ['PENDING', 'ACTIVE', 'CLOSED'] })
  status: string;

  @ApiProperty({ description: 'Visitor ID' })
  visitorId: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  // Factory from domain
  static fromDomain(chat: Chat): ChatResponseDto {
    const primitives = chat.toPrimitives();
    const dto = new ChatResponseDto();
    dto.id = primitives.id;
    dto.status = primitives.status;
    dto.visitorId = primitives.visitorId;
    dto.createdAt = primitives.createdAt;
    return dto;
  }

  // Factory from primitives
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

  @ApiProperty({ description: 'Total items' })
  total: number;

  @ApiProperty({ description: 'Page limit' })
  limit: number;

  @ApiProperty({ description: 'Current offset' })
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
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(['PENDING', 'ACTIVE', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Results limit', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Pagination offset', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
```

## Common Validators

| Decorator | Usage |
|-----------|-------|
| `@IsUUID()` | IDs |
| `@IsString()` | Text |
| `@IsEmail()` | Emails |
| `@IsEnum(Enum)` | Fixed values |
| `@IsOptional()` | Optional fields |
| `@MinLength(n)` | Minimum length |
| `@MaxLength(n)` | Maximum length |
| `@Type(() => Number)` | Transform query params |

## Naming Rules

| Type | Pattern | Example |
|------|---------|---------|
| Request | `<Action><Entity>Dto` | `CreateChatDto` |
| Response | `<Entity>ResponseDto` | `ChatResponseDto` |
| Query | `Find<Entity>QueryDto` | `FindChatsQueryDto` |

## Anti-patterns

- DTOs without validation
- DTOs without Swagger documentation
- Reusing request DTOs as response
- Exposing sensitive internal fields
