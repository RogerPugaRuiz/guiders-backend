import { applyDecorators } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ErrorResponseDto } from './error-response.dto';

/**
 * Decorador compuesto que documenta una respuesta 500 Internal Server Error.
 *
 * Aplicar idealmente a nivel de clase del controller, ya que cualquier
 * endpoint puede fallar con 500 ante errores inesperados del servidor.
 *
 * ```ts
 * @ApiBearerAuth()
 * @ApiAuthErrors()
 * @ApiInternalServerError()
 * @Controller('recurso')
 * export class RecursoController {}
 * ```
 */
export const ApiInternalServerError = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ApiInternalServerErrorResponse({
      description:
        'Error interno del servidor. Indica una condición inesperada que impidió completar la petición.',
      type: ErrorResponseDto,
    }),
  );
