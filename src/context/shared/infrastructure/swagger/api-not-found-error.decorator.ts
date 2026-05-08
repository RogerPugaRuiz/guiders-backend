import { applyDecorators } from '@nestjs/common';
import { ApiNotFoundResponse, ApiExtraModels } from '@nestjs/swagger';
import { ErrorResponseDto } from './error-response.dto';

/**
 * Decorador compuesto que documenta una respuesta 404 Not Found.
 *
 * Uso típico a nivel de método:
 *
 * ```ts
 * @Get(':id')
 * @ApiNotFoundError('Chat')
 * async findOne(@Param('id') id: string) {}
 * ```
 *
 * @param resource - Nombre del recurso que no se encontró (p.ej. 'Chat', 'Usuario').
 * @param description - Descripción opcional que sobrescribe la generada por defecto.
 */
export const ApiNotFoundError = (
  resource: string,
  description?: string,
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ApiNotFoundResponse({
      description: description ?? `${resource} no encontrado`,
      type: ErrorResponseDto,
    }),
  );
