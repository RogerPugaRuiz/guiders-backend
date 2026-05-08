import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Decorador compuesto que documenta una respuesta 200 con paginación basada en cursor.
 *
 * Genera un schema inline con la forma:
 * ```json
 * {
 *   "items": [ { ...ModelDto } ],
 *   "total":  42,
 *   "hasMore": true,
 *   "nextCursor": "dXNlcjoxMg=="
 * }
 * ```
 *
 * Uso:
 * ```ts
 * @Get()
 * @ApiCursorPaginatedResponse(ChatResponseDto, 'chats')
 * async getChats() {}
 * ```
 *
 * @param model   - Clase DTO que representa cada ítem de la lista.
 * @param itemsKey - Nombre del campo que contiene el array (por defecto `'items'`).
 * @param description - Descripción opcional de la respuesta.
 */
export const ApiCursorPaginatedResponse = <T>(
  model: Type<T>,
  itemsKey = 'items',
  description = 'Lista paginada con cursor',
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description,
      schema: {
        type: 'object',
        required: [itemsKey, 'total', 'hasMore'],
        properties: {
          [itemsKey]: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          total: {
            type: 'integer',
            description: 'Número total de ítems que cumplen los criterios',
            example: 42,
          },
          hasMore: {
            type: 'boolean',
            description:
              'Indica si hay más ítems disponibles para la siguiente página',
            example: true,
          },
          nextCursor: {
            type: 'string',
            nullable: true,
            description:
              'Cursor opaco para obtener la siguiente página. Null cuando hasMore es false.',
            example: 'dXNlcjoxMg==',
          },
        },
      },
    }),
  );
