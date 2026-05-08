import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

/**
 * Decorador compuesto que marca un controller o endpoint como obsoleto en Swagger.
 *
 * Añade una cabecera de respuesta `Deprecation` (RFC 8594) y aplica `deprecated: true`
 * en el nivel de clase usando una cabecera ficticia de documentación.
 *
 * Para marcar endpoints INDIVIDUALES como deprecated, usa directamente:
 * ```ts
 * @ApiOperation({ deprecated: true, summary: '...' })
 * ```
 *
 * Para marcar TODOS los endpoints de un controller (nivel de clase):
 * ```ts
 * @ApiDeprecated('Usa /v2/chats en su lugar')
 * @Controller('chats')
 * export class ChatController {}
 * ```
 *
 * @param sunsetNote - Nota opcional indicando el reemplazo recomendado.
 */
export const ApiDeprecated = (
  sunsetNote = 'Este endpoint está obsoleto. Consulta la documentación para la versión actual.',
): ClassDecorator =>
  applyDecorators(
    ApiHeader({
      name: 'Deprecation',
      description: `⚠️ DEPRECADO: ${sunsetNote}`,
      required: false,
    }),
  ) as ClassDecorator;
