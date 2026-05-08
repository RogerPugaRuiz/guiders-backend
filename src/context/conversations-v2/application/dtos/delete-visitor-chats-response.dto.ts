import { ApiProperty } from '@nestjs/swagger';

/**
 * Respuesta del endpoint DELETE /v2/chats/visitor/:visitorId.
 * Confirma cuántos chats fueron eliminados para el visitante indicado.
 */
export class DeleteVisitorChatsResponseDto {
  @ApiProperty({ example: 'Todos los chats del visitante han sido eliminados' })
  message!: string;

  @ApiProperty({
    description: 'Número de chats eliminados',
    example: 5,
  })
  deletedCount!: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  visitorId!: string;
}
