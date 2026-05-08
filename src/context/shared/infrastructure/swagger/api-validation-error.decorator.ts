import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiExtraModels } from '@nestjs/swagger';
import { ErrorResponseDto } from './error-response.dto';

/**
 * Decorador compuesto que documenta una respuesta 400 Bad Request causada
 * por validación de DTO (ValidationPipe) o por validaciones de negocio que
 * lanzan `HttpException` con `BAD_REQUEST`.
 *
 * Uso típico a nivel de método:
 *
 * ```ts
 * @Post()
 * @ApiValidationError()
 * async create(@Body() dto: CreateDto) {}
 * ```
 *
 * @param description - Descripción opcional. Por defecto: mensaje genérico de validación.
 */
export const ApiValidationError = (
  description = 'Datos de entrada inválidos',
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ApiBadRequestResponse({
      description,
      type: ErrorResponseDto,
    }),
  );
