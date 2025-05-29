// Documentación de Swagger para ChatController
// Intención: Centralizar toda la documentación de la API de chat en un solo archivo para mantener el controlador limpio
import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

// Documentación para el controlador completo
export const ChatControllerSwagger = () =>
  applyDecorators(ApiTags('Conversaciones'));

// Documentación para el endpoint GET /chats
export const GetChatListSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtener lista de chats del comercial',
      description:
        'Devuelve la lista de chats asignados al comercial autenticado con filtros opcionales',
    }),
    ApiQuery({
      name: 'limit',
      description: 'Número máximo de chats a devolver (por defecto: 50)',
      required: false,
      type: Number,
      example: 50,
    }),
    ApiQuery({
      name: 'include',
      description:
        'Campos adicionales a incluir separados por comas (ej: lastMessage,timestamp)',
      required: false,
      type: String,
      example: 'lastMessage,timestamp',
    }),
    ApiResponse({
      status: 200,
      description: 'Lista de chats obtenida correctamente',
      schema: {
        type: 'object',
        properties: {
          chats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID único del chat' },
                participants: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'ID del participante',
                      },
                      name: {
                        type: 'string',
                        description: 'Nombre del participante',
                      },
                      isCommercial: {
                        type: 'boolean',
                        description: 'Es comercial',
                      },
                      isVisitor: {
                        type: 'boolean',
                        description: 'Es visitante',
                      },
                      isOnline: {
                        type: 'boolean',
                        description: 'Está en línea',
                      },
                      assignedAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Fecha de asignación',
                      },
                      lastSeenAt: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        description: 'Última vez visto',
                      },
                      isViewing: {
                        type: 'boolean',
                        description: 'Está viendo el chat',
                      },
                      isTyping: {
                        type: 'boolean',
                        description: 'Está escribiendo',
                      },
                    },
                  },
                },
                status: {
                  type: 'string',
                  description: 'Estado del chat (PENDING, ACTIVE, CLOSED)',
                },
                lastMessage: {
                  type: 'string',
                  nullable: true,
                  description: 'Último mensaje',
                },
                lastMessageAt: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                  description: 'Fecha del último mensaje',
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Fecha de creación',
                },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'No autorizado: token JWT inválido o ausente',
    }),
    ApiResponse({
      status: 403,
      description: 'Acceso denegado: Se requiere rol commercial',
    }),
    ApiResponse({
      status: 500,
      description: 'Error interno del servidor',
    }),
  );

// Documentación para el endpoint POST /chat/:chatId
export const StartChatSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Iniciar un chat',
      description:
        'Permite a un visitante iniciar una conversación en un chat específico',
    }),
    ApiParam({
      name: 'chatId',
      description: 'ID único del chat a iniciar',
      type: String,
      example: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
    }),
    ApiResponse({
      status: 200,
      description: 'Chat iniciado correctamente',
      schema: {
        type: 'object',
        description: 'Respuesta del inicio de chat',
      },
    }),
    ApiResponse({
      status: 401,
      description: 'No autorizado: token JWT inválido o ausente',
    }),
    ApiResponse({
      status: 403,
      description: 'Acceso denegado: Se requiere rol visitor',
    }),
    ApiResponse({
      status: 404,
      description: 'Chat no encontrado',
    }),
    ApiResponse({
      status: 500,
      description: 'Error interno del servidor',
    }),
  );

// Documentación para el endpoint GET /chat/:chatId/messages
export const GetMessagesSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtener mensajes de un chat',
      description:
        'Devuelve los mensajes de un chat específico con paginación basada en cursor',
    }),
    ApiParam({
      name: 'chatId',
      description: 'ID único del chat del cual obtener los mensajes',
      type: String,
      example: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
    }),
    ApiQuery({
      name: 'limit',
      description: 'Número máximo de mensajes a devolver (por defecto: 10)',
      required: false,
      type: String,
      example: '10',
    }),
    ApiQuery({
      name: 'cursor',
      description: 'Cursor para paginación (ID del último mensaje obtenido)',
      required: false,
      type: String,
      example: 'msg_b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
    }),
    ApiResponse({
      status: 200,
      description: 'Mensajes obtenidos correctamente',
      schema: {
        type: 'object',
        properties: {
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID único del mensaje' },
                chatId: {
                  type: 'string',
                  description: 'ID del chat al que pertenece',
                },
                senderId: {
                  type: 'string',
                  description: 'ID del usuario que envió el mensaje',
                },
                content: {
                  type: 'string',
                  description: 'Contenido del mensaje',
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Fecha de creación del mensaje',
                },
              },
            },
          },
          nextCursor: {
            type: 'string',
            nullable: true,
            description: 'Cursor para la siguiente página (null si no hay más)',
          },
          hasMore: {
            type: 'boolean',
            description: 'Indica si hay más mensajes disponibles',
          },
        },
      },
    }),
    ApiResponse({
      status: 204,
      description: 'No hay más mensajes disponibles',
    }),
    ApiResponse({
      status: 401,
      description: 'No autorizado: token JWT inválido o ausente',
    }),
    ApiResponse({
      status: 403,
      description: 'Acceso denegado: Se requiere rol visitor o commercial',
    }),
    ApiResponse({
      status: 500,
      description: 'Error interno del servidor',
    }),
  );

// Documentación para el endpoint GET /chat/:chatId
export const GetChatByIdSwagger = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtener chat por ID',
      description: 'Devuelve la información completa de un chat específico',
    }),
    ApiParam({
      name: 'chatId',
      description: 'ID único del chat a obtener',
      type: String,
      example: 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
    }),
    ApiResponse({
      status: 200,
      description: 'Chat obtenido correctamente',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID único del chat' },
          participants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID del participante' },
                name: {
                  type: 'string',
                  description: 'Nombre del participante',
                },
                isCommercial: { type: 'boolean', description: 'Es comercial' },
                isVisitor: { type: 'boolean', description: 'Es visitante' },
                isOnline: { type: 'boolean', description: 'Está en línea' },
                assignedAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Fecha de asignación',
                },
                lastSeenAt: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                  description: 'Última vez visto',
                },
                isViewing: {
                  type: 'boolean',
                  description: 'Está viendo el chat',
                },
                isTyping: { type: 'boolean', description: 'Está escribiendo' },
              },
            },
          },
          status: {
            type: 'string',
            description: 'Estado del chat (PENDING, ACTIVE, CLOSED)',
          },
          lastMessage: {
            type: 'string',
            nullable: true,
            description: 'Último mensaje',
          },
          lastMessageAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Fecha del último mensaje',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de creación',
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'No autorizado: token JWT inválido o ausente',
    }),
    ApiResponse({
      status: 403,
      description: 'Acceso denegado: Se requiere rol visitor',
    }),
    ApiResponse({
      status: 404,
      description: 'Chat no encontrado',
    }),
    ApiResponse({
      status: 500,
      description: 'Error interno del servidor',
    }),
  );
