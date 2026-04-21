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
 * Uso:
 *
 * ```ts
 * @PublicEndpoint()
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
