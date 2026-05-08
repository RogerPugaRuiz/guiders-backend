import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO estándar de error siguiendo el formato de NestJS.
 *
 * Todos los errores HTTP de la API siguen esta estructura:
 * `{ statusCode, message, error }`. Se expone como `$ref` en el OpenAPI
 * para evitar repetir el schema inline en cada `@ApiResponse`.
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description:
      'Mensaje de error. Puede ser un string o un array de strings (validación)',
    oneOf: [
      { type: 'string', example: 'Datos de entrada inválidos' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['field should not be empty'],
      },
    ],
  })
  message!: string | string[];

  @ApiProperty({
    description: 'Nombre del error HTTP',
    example: 'Bad Request',
  })
  error!: string;
}
