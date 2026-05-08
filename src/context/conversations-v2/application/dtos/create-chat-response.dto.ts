import { ApiProperty } from '@nestjs/swagger';

/**
 * Respuesta del endpoint POST /v2/chats (crear chat).
 * Devuelve el identificador del chat creado y la posición en la cola de espera.
 */
export class CreateChatResponseDto {
  @ApiProperty({
    description: 'ID único del chat creado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  chatId!: string;

  @ApiProperty({
    description: 'Posición en la cola de espera',
    example: 3,
  })
  position!: number;
}

/**
 * Respuesta del endpoint POST /v2/chats/with-message (crear chat con primer mensaje).
 * Devuelve los identificadores del chat y del mensaje creados, así como la posición en cola.
 */
export class CreateChatWithMessageResponseDto {
  @ApiProperty({
    description: 'ID único del chat creado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  chatId!: string;

  @ApiProperty({
    description: 'ID único del primer mensaje creado',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  messageId!: string;

  @ApiProperty({
    description: 'Posición del chat en la cola de espera',
    example: 3,
    minimum: 1,
  })
  position!: number;
}
