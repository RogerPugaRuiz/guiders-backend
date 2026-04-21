import { applyDecorators } from '@nestjs/common';
import { ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';

/**
 * Decorador compuesto que documenta las respuestas de error de autenticación
 * y autorización comunes a todos los endpoints protegidos por guards.
 *
 * Aplica:
 * - 401 Unauthorized: cuando faltan credenciales o son inválidas/expiradas.
 * - 403 Forbidden: cuando el usuario autenticado no tiene permisos suficientes
 *   (rol o scope insuficiente para acceder al recurso).
 *
 * Uso típico a nivel de clase del controller:
 *
 * ```ts
 * @ApiBearerAuth()
 * @ApiAuthErrors()
 * @Controller('recurso')
 * export class RecursoController {}
 * ```
 */
export const ApiAuthErrors = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiUnauthorizedResponse({
      description:
        'No autenticado: faltan credenciales, token ausente, inválido o expirado.',
    }),
    ApiForbiddenResponse({
      description:
        'Acceso denegado: el usuario autenticado no tiene permisos suficientes para esta operación.',
    }),
  );
