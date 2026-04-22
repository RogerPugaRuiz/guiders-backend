import { applyDecorators } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

/**
 * Decorador para endpoints HTTP que NO requieren autenticación.
 *
 * Genera en el OpenAPI un campo `security: [{}]` para la operación, que es la
 * forma estándar de OpenAPI 3 de declarar explícitamente que un endpoint es
 * público (no requiere ningún esquema de seguridad).
 *
 * Esto satisface la regla `security-defined` de Redocly, que exige que cada
 * operación tenga el campo `security` definido — bien con un esquema concreto
 * o bien vacío para indicar acceso anónimo.
 *
 * ⚠️ ATENCIÓN: Este decorador es SOLO para documentación Swagger/OpenAPI.
 * NO afecta a los guards de NestJS (AuthGuard, RolesGuard).
 * Para hacer que un endpoint sea realmente público (sin JWT ni roles),
 * usa el decorador @Public() de `src/context/shared/infrastructure/decorators/public.decorator`.
 *
 * Uso correcto para un endpoint verdaderamente público:
 *
 * ```ts
 * @Public()          // <-- para AuthGuard y RolesGuard
 * @PublicEndpoint()  // <-- para Swagger
 * @Get('health')
 * health() {
 *   return { status: 'ok' };
 * }
 * ```
 *
 * También puede aplicarse a nivel de clase si todos los endpoints del
 * controller son públicos.
 */
export const PublicEndpoint = (): MethodDecorator & ClassDecorator =>
  applyDecorators(ApiSecurity({}));
