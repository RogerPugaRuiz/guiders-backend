import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Req,
  Header,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
} from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  AuthGuard,
} from 'src/context/shared/infrastructure/guards/auth.guard';
import { OptionalAuthGuard } from 'src/context/shared/infrastructure/guards/optional-auth.guard';
import {
  RolesGuard,
  RequiredRoles,
} from 'src/context/shared/infrastructure/guards/role.guard';

// DTOs
import {
  ChatResponseDto,
  ChatListResponseDto,
} from '../../application/dtos/chat-response.dto';
import { PendingChatsResponseDto } from '../../application/dtos/pending-chats-response.dto';
import { GetChatByIdQuery } from '../../application/queries/get-chat-by-id.query';
import { GetVisitorPendingChatsQuery } from '../../application/queries/get-visitor-pending-chats.query';
import { Result } from 'src/context/shared/domain/result';
import { Chat } from '../../domain/entities/chat.aggregate';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  GetChatsQueryDto,
  PaginationDto,
  CommercialMetricsResponseDto,
  ResponseTimeStatsDto,
} from '../../application/dtos/chat-query.dto';
import { CreateChatRequestDto } from '../../application/dtos/create-chat-request.dto';
import { CreateChatWithMessageRequestDto } from '../../application/dtos/create-chat-with-message-request.dto';
import { GetChatsWithFiltersQuery } from '../../application/queries/get-chats-with-filters.query';
import { JoinWaitingRoomCommand } from '../../application/commands/join-waiting-room.command';
import { CreateChatWithMessageCommand } from '../../application/commands/create-chat-with-message.command';

// Interfaces para respuestas de comandos
interface CreateChatWithMessageResult {
  chatId: string;
  messageId: string;
  position: number;
}

/**
 * Controller para la gestión de chats v2
 * Proporciona endpoints optimizados para comerciales y visitantes
 * IMPORTANTE: Todos los endpoints requieren autenticación válida
 */
@ApiTags('Chats V2')
@ApiBearerAuth()
@Controller('v2/chats')
export class ChatV2Controller {
  private readonly logger = new Logger(ChatV2Controller.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Crea un nuevo chat para el visitante autenticado
   */
  @Post()
  @RequiredRoles('visitor', 'commercial', 'admin')
  @ApiOperation({
    summary: 'Crear nuevo chat',
    description:
      'Crea un nuevo chat para el visitante autenticado y lo coloca en la cola de espera',
  })
  @ApiBody({
    description: 'Datos opcionales para crear el chat',
    type: CreateChatRequestDto,
    required: false,
  })
  @ApiResponse({
    status: 201,
    description: 'Chat creado exitosamente',
    schema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
          description: 'ID único del chat creado',
        },
        position: {
          type: 'number',
          example: 3,
          description: 'Posición en la cola de espera',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario sin permisos suficientes',
  })
  async createChat(
    @Body() createChatDto: CreateChatRequestDto = {},
    @Req() req: AuthenticatedRequest,
  ): Promise<{ chatId: string; position: number }> {
    try {
      this.logger.log(`Creando chat para visitante: ${req.user.id}`);

      // El visitorId se obtiene del token autenticado
      const visitorId = req.user.id;

      // Usar los datos del DTO o valores por defecto
      const visitorInfo = createChatDto.visitorInfo || {};
      const metadata = createChatDto.metadata || {};

      const command = new JoinWaitingRoomCommand(
        visitorId,
        visitorInfo,
        metadata,
      );

      const result = await this.commandBus.execute<
        JoinWaitingRoomCommand,
        { chatId: string; position: number }
      >(command);

      this.logger.log(
        `Chat creado exitosamente: ${result.chatId}, posición: ${result.position}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Error al crear chat:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Crea un nuevo chat con un primer mensaje para el visitante autenticado
   *
   * @example
   * Request:
   * ```json
   * {
   *   "firstMessage": {
   *     "content": "Hola, necesito ayuda con mi pedido",
   *     "type": "text"
   *   },
   *   "visitorInfo": {
   *     "name": "María García",
   *     "email": "maria@example.com"
   *   },
   *   "metadata": {
   *     "department": "soporte",
   *     "priority": "NORMAL"
   *   }
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "chatId": "550e8400-e29b-41d4-a716-446655440000",
   *   "messageId": "550e8400-e29b-41d4-a716-446655440001",
   *   "position": 2
   * }
   * ```
   */
  @Post('with-message')
  @UseGuards(OptionalAuthGuard)
  @RequiredRoles('visitor', 'commercial', 'admin')
  @ApiOperation({
    summary: 'Crear nuevo chat con primer mensaje',
    description:
      'Crea un nuevo chat para el visitante autenticado, lo coloca en la cola de espera e incluye un primer mensaje. Esta operación es atómica que garantiza que tanto el chat como el mensaje se crean juntos o fallan juntos.',
  })
  @ApiBody({
    description: 'Datos del chat y primer mensaje',
    type: CreateChatWithMessageRequestDto,
    examples: {
      'texto-simple': {
        summary: 'Mensaje de texto simple',
        description: 'Ejemplo básico con solo mensaje de texto',
        value: {
          firstMessage: {
            content: 'Hola, me gustaría información sobre sus productos',
            type: 'text',
          },
          visitorInfo: {
            name: 'Juan Pérez',
            email: 'juan@example.com',
          },
          metadata: {
            department: 'ventas',
            priority: 'NORMAL',
          },
        },
      },
      'con-archivo': {
        summary: 'Mensaje con archivo adjunto',
        description: 'Ejemplo de mensaje con archivo adjunto',
        value: {
          firstMessage: {
            content: 'Adjunto mi consulta técnica',
            type: 'file',
            attachment: {
              url: 'https://storage.example.com/files/consulta.pdf',
              fileName: 'consulta_tecnica.pdf',
              fileSize: 245760,
              mimeType: 'application/pdf',
            },
          },
          metadata: {
            department: 'soporte',
            priority: 'HIGH',
          },
        },
      },
      minimo: {
        summary: 'Mensaje mínimo',
        description: 'Solo con el contenido requerido',
        value: {
          firstMessage: {
            content: 'Hola, necesito ayuda',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Chat y mensaje creados exitosamente',
    schema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'ID único del chat creado',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        messageId: {
          type: 'string',
          description: 'ID único del primer mensaje creado',
          example: '550e8400-e29b-41d4-a716-446655440001',
        },
        position: {
          type: 'number',
          description: 'Posición del chat en la cola de espera',
          example: 3,
          minimum: 1,
        },
      },
      required: ['chatId', 'messageId', 'position'],
    },
    examples: {
      exitoso: {
        summary: 'Respuesta exitosa',
        value: {
          chatId: 'chat-456',
          messageId: 'msg-789',
          position: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'firstMessage.content should not be empty',
            'firstMessage.type must be one of the following values: text, image, file',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: {
          type: 'string',
          example: 'Se requiere autenticación para crear un chat',
        },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario sin permisos suficientes',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Acceso denegado' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Error interno del servidor' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async createChatWithMessage(
    @Body() createChatWithMessageDto: CreateChatWithMessageRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreateChatWithMessageResult> {
    try {
      // Validar que el usuario esté autenticado (JWT o sesión de visitante)
      if (!req.user || !req.user.id) {
        throw new HttpException(
          'Se requiere autenticación para crear un chat',
          HttpStatus.UNAUTHORIZED,
        );
      }

      this.logger.log(
        `Creando chat con primer mensaje para visitante: ${req.user.id}`,
      );

      // El visitorId se obtiene del token autenticado
      const visitorId = req.user.id;

      // Usar los datos del DTO
      const {
        firstMessage,
        visitorInfo: visitorInfoDto,
        metadata,
      } = createChatWithMessageDto;

      // Transformar visitorInfo DTO a VisitorInfoData
      const visitorInfo = visitorInfoDto
        ? {
            name: visitorInfoDto.name,
            email: visitorInfoDto.email,
            phone: visitorInfoDto.phone,
            company: (visitorInfoDto.additionalData?.company as string) || '',
            ipAddress:
              (visitorInfoDto.additionalData?.ipAddress as string) || '',
            location: visitorInfoDto.location
              ? {
                  // Si location es string, lo ponemos en city
                  city: visitorInfoDto.location,
                  country:
                    (visitorInfoDto.additionalData?.country as string) || '',
                }
              : undefined,
            referrer: (visitorInfoDto.additionalData?.referrer as string) || '',
            userAgent:
              (visitorInfoDto.additionalData?.userAgent as string) || '',
          }
        : undefined;

      const command = new CreateChatWithMessageCommand(
        visitorId,
        {
          content: firstMessage.content,
          type: firstMessage.type || 'text',
          attachment: firstMessage.attachment,
        },
        visitorInfo,
        metadata,
      );

      this.logger.debug(
        `Ejecutando command: ${JSON.stringify({
          visitorId,
          messageContent: firstMessage.content,
          messageType: firstMessage.type || 'text',
          hasAttachment: !!firstMessage.attachment,
        })}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.commandBus.execute(command);

      this.logger.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Chat creado exitosamente: ${result.chatId}, mensaje: ${result.messageId}, posición en cola: ${result.position}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    } catch (error) {
      this.logger.error('Error al crear chat con primer mensaje:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene la lista de chats con filtros avanzados
   * Requiere autenticación y permisos de comercial, administrador o supervisor
   */
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({
    summary: 'Obtener lista de chats con filtros y paginación con cursor',
    description:
      'Retorna una lista paginada de chats con filtros avanzados para usuarios autenticados con permisos de comercial, administrador o supervisor. Utiliza paginación basada en cursor para mayor eficiencia y consistencia en resultados. Los filtros y ordenamiento se aplican según los permisos del usuario autenticado.',
  })
  @ApiQuery({
    name: 'cursor',
    description:
      'Cursor para paginación (obtenido del campo nextCursor de la respuesta anterior). Permite navegar a través de páginas sin duplicados ni omisiones. Este valor es un base64 que contiene información de posición.',
    required: false,
    type: String,
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI1LTA3LTI4VDEwOjMwOjAwLjAwMFoiLCJpZCI6ImNoYXQtMTIzIn0=',
  })
  @ApiQuery({
    name: 'limit',
    description:
      'Número máximo de chats a retornar por página. Rango válido: 1-100. Por defecto: 20',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @ApiQuery({
    name: 'filters',
    description:
      'Filtros de búsqueda para chats. Formato JSON con campos como status (PENDING, ASSIGNED, ACTIVE, CLOSED), priority (LOW, MEDIUM, HIGH, URGENT), visitorId, assignedCommercialId, department, dateFrom, dateTo, etc.',
    required: false,
    type: 'object',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'PENDING',
              'ASSIGNED',
              'ACTIVE',
              'CLOSED',
              'TRANSFERRED',
              'ABANDONED',
            ],
          },
          description: 'Estados de chat a filtrar',
        },
        priority: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'NORMAL', 'HIGH', 'URGENT'],
          },
          description: 'Prioridades de chat a filtrar',
        },
        visitorId: {
          type: 'string',
          description: 'ID del visitante',
        },
        assignedCommercialId: {
          type: 'string',
          description: 'ID del comercial asignado',
        },
        department: {
          type: 'string',
          description: 'Departamento del chat',
        },
        dateFrom: {
          type: 'string',
          format: 'date-time',
          description: 'Fecha de inicio del rango de búsqueda',
        },
        dateTo: {
          type: 'string',
          format: 'date-time',
          description: 'Fecha de fin del rango de búsqueda',
        },
      },
    },
    example: {
      status: ['ACTIVE', 'PENDING'],
      priority: ['HIGH', 'URGENT'],
      department: 'ventas',
      dateFrom: '2025-07-01T00:00:00Z',
      dateTo: '2025-07-31T23:59:59Z',
    },
  })
  @ApiQuery({
    name: 'sort',
    description:
      'Opciones de ordenamiento. Especifica el campo y la dirección de ordenamiento.',
    required: false,
    type: 'object',
    schema: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          enum: ['createdAt', 'lastMessageDate', 'priority', 'status'],
          description: 'Campo por el cual ordenar',
        },
        direction: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Dirección del ordenamiento',
        },
      },
    },
    example: {
      field: 'createdAt',
      direction: 'desc',
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de chats obtenida exitosamente con paginación basada en cursor',
    type: ChatListResponseDto,
    schema: {
      type: 'object',
      properties: {
        chats: {
          type: 'array',
          description: 'Lista de chats encontrados',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'chat-123' },
              visitorId: { type: 'string', example: 'visitor-456' },
              commercialId: {
                type: 'string',
                example: 'commercial-789',
                nullable: true,
              },
              status: { type: 'string', example: 'ACTIVE' },
              priority: { type: 'string', example: 'HIGH' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2025-07-28T10:30:00.000Z',
              },
              lastMessageAt: {
                type: 'string',
                format: 'date-time',
                example: '2025-07-28T11:15:00.000Z',
                nullable: true,
              },
            },
          },
        },
        total: {
          type: 'number',
          description: 'Número total de chats que coinciden con los filtros',
          example: 150,
        },
        hasMore: {
          type: 'boolean',
          description: 'Indica si hay más páginas disponibles',
          example: true,
        },
        nextCursor: {
          type: 'string',
          description:
            'Cursor para obtener la siguiente página (null si no hay más páginas)',
          example:
            'eyJjcmVhdGVkQXQiOiIyMDI1LTA3LTI4VDExOjE1OjAwLjAwMFoiLCJpZCI6ImNoYXQtMTIzIn0=',
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Parámetros de filtro inválidos' },
        error: { type: 'string', example: 'Bad Request' },
        statusCode: { type: 'number', example: 400 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado - Token de autenticación requerido',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Token de autenticación requerido',
        },
        error: { type: 'string', example: 'Unauthorized' },
        statusCode: { type: 'number', example: 401 },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuario sin permisos suficientes - Requiere rol de comercial, administrador o supervisor',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Acceso denegado. Permisos insuficientes.',
        },
        error: { type: 'string', example: 'Forbidden' },
        statusCode: { type: 'number', example: 403 },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Error interno del servidor' },
        error: { type: 'string', example: 'Internal Server Error' },
        statusCode: { type: 'number', example: 500 },
      },
    },
  })
  getChats(
    @Query() queryParams: GetChatsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ChatListResponseDto> {
    try {
      this.logger.log(`Obteniendo chats para usuario: ${req.user.id}`);

      // Log the query parameters for debugging
      this.logger.debug(`Query params: ${JSON.stringify(queryParams)}`);

      const query = GetChatsWithFiltersQuery.create({
        userId: req.user.id,
        userRole: req.user.roles[0] || 'visitor', // Usar el primer rol como rol principal
        filters: queryParams.filters,
        sort: queryParams.sort,
        cursor: queryParams.cursor,
        limit: queryParams.limit || 20,
      });

      return this.queryBus.execute(query);
    } catch (error) {
      this.logger.error('Error al obtener chats:', error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene estadísticas de tiempo de respuesta
   * Requiere autenticación y permisos de comercial o administrador
   */
  @Get('response-time-stats')
  @UseGuards(AuthGuard, RolesGuard)
  @RequiredRoles('commercial', 'admin')
  @ApiOperation({
    summary: 'Obtener estadísticas de tiempo de respuesta',
    description:
      'Retorna estadísticas agregadas de tiempo de respuesta para comerciales y administradores autenticados',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Fecha de inicio del período (ISO 8601)',
    example: '2025-07-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Fecha de fin del período (ISO 8601)',
    example: '2025-07-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['hour', 'day', 'week'],
    description: 'Agrupación temporal de las estadísticas',
    example: 'day',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de tiempo de respuesta obtenidas exitosamente',
    type: [ResponseTimeStatsDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado - Token de autenticación requerido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuario sin permisos suficientes - Requiere rol de comercial o administrador',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  getResponseTimeStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('groupBy') groupBy?: 'hour' | 'day' | 'week',
  ): ResponseTimeStatsDto[] {
    try {
      this.logger.log(
        `Obteniendo estadísticas de tiempo de respuesta: ${dateFrom} - ${dateTo}, groupBy: ${groupBy}`,
      );

      // TODO: Implementar query handler
      // const query = new GetResponseTimeStatsQuery({
      //   dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      //   dateTo: dateTo ? new Date(dateTo) : undefined,
      //   groupBy: groupBy || 'day',
      // });

      // Respuesta temporal usando los parámetros - retornando array simulado
      return [
        {
          period: '2025-07-28',
          avgResponseTime: 15.5,
          count: 10,
        },
        {
          period: '2025-07-29',
          avgResponseTime: 12.3,
          count: 8,
        },
      ];
    } catch (error) {
      this.logger.error(
        'Error al obtener estadísticas de tiempo de respuesta:',
        error,
      );
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene chats asignados a un comercial específico
   * Soporta autenticación por JWT (Bearer token) o sesión BFF (cookie)
   */
  @Get('commercial/:commercialId')
  @UseGuards(OptionalAuthGuard)
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('X-Frame-Options', 'DENY')
  @Header('X-XSS-Protection', '1; mode=block')
  @ApiBearerAuth()
  @ApiCookieAuth('session')
  @ApiHeader({
    name: 'X-Guiders-Session',
    description: 'Session ID como cabecera HTTP alternativa para BFF',
    required: false,
    example: 'sess_1758226307441_commercial',
  })
  @ApiOperation({
    summary:
      'Obtener chats de un comercial con paginación cursor (BFF + SPA compatible)',
    description:
      'Retorna los chats asignados a un comercial específico usando paginación basada en cursor. ' +
      'Soporta múltiples tipos de autenticación:\n' +
      '1. **Bearer Token (JWT)**: Para acceso directo de API\n' +
      '2. **Cookie de sesión**: Para BFF con SPA\n' +
      '3. **Header X-Guiders-Session**: Cabecera alternativa para enviar session ID\n' +
      'Requiere roles: commercial, admin o supervisor.',
  })
  @ApiParam({
    name: 'commercialId',
    description: 'ID del comercial',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Cursor para paginación (opcional)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de chats a retornar (1-100)',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiQuery({
    name: 'filters',
    description: 'Filtros adicionales para chats',
    required: false,
    type: Object,
  })
  @ApiQuery({
    name: 'sort',
    description: 'Opciones de ordenamiento',
    required: false,
    type: Object,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de chats del comercial obtenida exitosamente',
    type: ChatListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Usuario no autenticado - Se requiere Bearer token o sesión BFF',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: {
          type: 'string',
          example:
            'Se requiere autenticación - Bearer token o sesión de cookie',
        },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuario sin permisos suficientes - Requiere rol de comercial, administrador o supervisor',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'string',
          example: 'Acceso denegado. Permisos insuficientes.',
        },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  getCommercialChats(
    @Param('commercialId') commercialId: string,
    @Query() queryParams: GetChatsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): ChatListResponseDto {
    try {
      // Validar autenticación (Bearer token o cookie de sesión BFF)
      if (!req.user || !req.user.id) {
        throw new HttpException(
          'Se requiere autenticación - Bearer token o sesión de cookie',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Validar permisos según roles
      const userRoles = req.user.roles || [];
      const hasRequiredRole = userRoles.some((role) =>
        ['commercial', 'admin', 'supervisor'].includes(role),
      );

      if (!hasRequiredRole) {
        throw new HttpException(
          'Acceso denegado. Permisos insuficientes.',
          HttpStatus.FORBIDDEN,
        );
      }

      // Determinar tipo de autenticación para logging
      const authType = req.headers.authorization ? 'bearer' : 'session';

      this.logger.log(
        `Obteniendo chats del comercial ${commercialId} para usuario: ${req.user.id} (auth: ${authType})`,
      );

      // Log the query parameters for debugging
      this.logger.debug(`Query params: ${JSON.stringify(queryParams)}`);
      this.logger.debug(`User roles: ${JSON.stringify(userRoles)}`);

      // TODO: Implementar query handler
      // const query = new GetCommercialChatsQuery({
      //   commercialId,
      //   requesterId: req.user.id,
      //   requesterRole: req.user.roles[0],
      //   filters: queryParams.filters,
      //   sort: queryParams.sort,
      //   cursor: queryParams.cursor,
      //   limit: queryParams.limit || 20,
      // });

      // Respuesta temporal con metadatos BFF-friendly
      return {
        chats: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
      };
    } catch (error) {
      // Preservar HttpExceptions específicas
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error al obtener chats del comercial ${commercialId}:`,
        error,
      );
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene un chat específico por ID
   * Requiere autenticación y permisos apropiados
   */
  @Get(':chatId')
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({
    summary: 'Obtener chat por ID',
    description:
      'Retorna los detalles completos de un chat específico para usuarios autenticados',
  })
  @ApiParam({
    name: 'chatId',
    description: 'ID único del chat',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat encontrado exitosamente',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado - Token de autenticación requerido',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario sin permisos suficientes',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async getChatById(
    @Param('chatId') chatId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ChatResponseDto> {
    try {
      this.logger.log(`Obteniendo chat ${chatId} para usuario: ${req.user.id}`);
      const query = new GetChatByIdQuery(chatId);
      const result: Result<Chat, DomainError> =
        await this.queryBus.execute(query);
      if (result.isErr()) {
        throw new HttpException('Chat no encontrado', HttpStatus.NOT_FOUND);
      }
      return ChatResponseDto.fromDomain(result.unwrap());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error al obtener chat ${chatId}:`, error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene chats de un visitante específico
   * Soporta autenticación por JWT (Bearer token) o sesión de visitante V2 (cookie 'sid')
   */
  @Get('visitor/:visitorId')
  @UseGuards(OptionalAuthGuard)
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiBearerAuth()
  @ApiCookieAuth('sid')
  @ApiHeader({
    name: 'X-Guiders-Sid',
    description: 'Session ID del visitante como cabecera HTTP alternativa',
    required: false,
    example: 'temp_1758226307441_5bjqvmz1vf3',
  })
  @ApiOperation({
    summary: 'Obtener chats de un visitante con paginación cursor',
    description:
      'Retorna el historial de chats de un visitante específico usando paginación basada en cursor. ' +
      'Soporta múltiples tipos de autenticación:\n' +
      '1. **Bearer Token (JWT)**: Para comerciales, administradores y supervisores que pueden acceder a chats de cualquier visitante\n' +
      '2. **Cookie de sesión (sid)**: Para visitantes que solo pueden acceder a sus propios chats\n' +
      '3. **Header X-Guiders-Sid**: Cabecera HTTP alternativa para enviar el session ID\n' +
      '4. **Cookies adicionales**: x-guiders-sid, guiders_session_id (accesibles desde JavaScript)\n' +
      'La validación de permisos se realiza automáticamente según el tipo de autenticación. ' +
      'Orden de prioridad: Body > Header X-Guiders-Sid > Cookie sid > Cookie x-guiders-sid > Cookie guiders_session_id',
  })
  @ApiParam({
    name: 'visitorId',
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Cursor para paginación (opcional)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de chats a retornar (1-100)',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de chats del visitante obtenida exitosamente',
    type: ChatListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Usuario no autenticado - Se requiere Bearer token o cookie de sesión de visitante',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuario sin permisos suficientes - Los comerciales/administradores pueden ver cualquier visitante, los visitantes solo sus propios chats',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async getVisitorChats(
    @Param('visitorId') visitorId: string,
    @Query() queryParams: PaginationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ChatListResponseDto> {
    try {
      this.logger.log(`Obteniendo chats del visitante ${visitorId}`);

      // Determinar el nivel de acceso según la autenticación
      let accessLevel: 'public' | 'visitor' | 'staff' = 'public';

      if (req.user) {
        this.logger.log(
          `Usuario autenticado: ${req.user.id} con roles: ${JSON.stringify(req.user.roles)}`,
        );

        // Validar autorización según el tipo de usuario
        const userRoles = req.user.roles || [];
        const isCommercialOrAdmin = userRoles.some((role) =>
          ['commercial', 'admin', 'supervisor'].includes(role),
        );
        const isVisitor = userRoles.includes('visitor');

        if (isVisitor) {
          // Los visitantes solo pueden ver sus propios chats
          if (req.user.id !== visitorId) {
            throw new HttpException(
              'Los visitantes solo pueden acceder a sus propios chats',
              HttpStatus.FORBIDDEN,
            );
          }
          accessLevel = 'visitor';
        } else if (isCommercialOrAdmin) {
          accessLevel = 'staff';
        } else {
          // Usuarios sin roles apropiados
          throw new HttpException(
            'Permisos insuficientes para acceder a chats de visitantes',
            HttpStatus.FORBIDDEN,
          );
        }
      } else {
        this.logger.log('Sin autenticación - acceso público a chats básicos');
      }

      this.logger.log(`Query params recibidos: ${JSON.stringify(queryParams)}`);
      this.logger.log(`Nivel de acceso determinado: ${accessLevel}`);

      // Crear filtros específicos según el nivel de acceso
      const filters = {
        visitorId: visitorId,
        ...(accessLevel === 'public' && { publicOnly: true }), // Solo chats públicos para acceso no autenticado
      };

      this.logger.log(`Filtros aplicados: ${JSON.stringify(filters)}`);

      // Determinar userId y userRole según el contexto de autenticación
      const userId = req.user?.id || visitorId; // Para acceso público, usar el visitorId como fallback
      const userRole = req.user?.roles?.[0] || 'visitor'; // Para acceso público, asumir rol visitor

      // Usar el query handler existente con filtros específicos para el visitante
      const query = GetChatsWithFiltersQuery.create({
        userId: userId,
        userRole: userRole,
        filters: filters,
        sort: { field: 'createdAt', direction: 'DESC' },
        cursor: queryParams.cursor,
        limit: queryParams.limit || 20,
      });

      this.logger.log(
        `Query creado: ${JSON.stringify({
          userId: userId,
          userRole: userRole,
          filters: filters,
          cursor: queryParams.cursor,
          limit: queryParams.limit || 20,
        })}`,
      );

      const result: ChatListResponseDto = await this.queryBus.execute(query);

      this.logger.log(
        `Resultado obtenido: ${result.total} chats encontrados, ${result.chats.length} en esta página`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error al obtener chats del visitante ${visitorId}:`,
        error,
      );
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene la cola de chats pendientes
   * Requiere autenticación y permisos de comercial, administrador o supervisor
   */
  @Get('queue/pending')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({
    summary: 'Obtener cola de chats pendientes',
    description:
      'Retorna los chats pendientes ordenados por prioridad y tiempo. Requiere autenticación.',
  })
  @ApiQuery({
    name: 'department',
    description: 'Filtrar por departamento',
    required: false,
    example: 'ventas',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de chats a retornar',
    required: false,
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Cola de chats pendientes obtenida exitosamente',
    type: [ChatResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado - Token de autenticación requerido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuario sin permisos suficientes - Requiere rol de comercial, administrador o supervisor',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async getPendingQueue(
    @Query('department') department?: string,
    @Query('limit') limit?: number,
  ): Promise<ChatResponseDto[]> {
    try {
      this.logger.log(
        `Obteniendo cola de chats pendientes. Departamento: ${department}, Límite: ${limit}`,
      );

      // Importar dinámicamente la query para evitar dependencias circulares
      const { GetPendingQueueQuery } = await import(
        '../../application/queries/get-pending-queue.query'
      );

      const query = new GetPendingQueueQuery(department, limit);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: any = await this.queryBus.execute(query);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      if (result && result.isErr && result.isErr()) {
        this.logger.error(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Error al obtener cola pendiente: ${result.error?.message || 'Error desconocido'}`,
        );
        throw new HttpException(
          'Error al obtener cola de chats pendientes',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Convertir chats de dominio a DTOs
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const chats = result?.value || [];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return chats.map((chat: any) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        id: chat.id.getValue(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        status: chat.status.value,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        priority: chat.priority.value,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        visitorId: chat.visitorId.getValue(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        assignedCommercialId: chat.assignedCommercialId?.getValue(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        totalMessages: chat.totalMessages,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        createdAt: chat.createdAt,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        updatedAt: chat.updatedAt,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        visitorInfo: chat.visitorInfo.toPrimitives(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        metadata: chat.metadata?.toPrimitives(),
      }));
    } catch (error) {
      this.logger.error('Error al obtener cola de chats pendientes:', error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene métricas de un comercial
   * Requiere autenticación y permisos de comercial, administrador o supervisor
   */
  @Get('metrics/commercial/:commercialId')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Obtener métricas de comercial',
    description:
      'Retorna métricas agregadas de rendimiento de un comercial. Requiere autenticación.',
  })
  @ApiParam({
    name: 'commercialId',
    description: 'ID del comercial',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiQuery({
    name: 'dateFrom',
    description: 'Fecha de inicio del período (ISO 8601)',
    required: false,
    example: '2025-07-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'dateTo',
    description: 'Fecha de fin del período (ISO 8601)',
    required: false,
    example: '2025-07-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas del comercial obtenidas exitosamente',
    type: CommercialMetricsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado - Token de autenticación requerido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuario sin permisos suficientes - Requiere rol de comercial, administrador o supervisor',
  })
  @ApiResponse({
    status: 404,
    description: 'Comercial no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  getCommercialMetrics(
    @Param('commercialId') commercialId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): CommercialMetricsResponseDto {
    try {
      this.logger.log(`Obteniendo métricas del comercial ${commercialId}`);
      this.logger.log(`Período: ${dateFrom} - ${dateTo}`);

      // TODO: Implementar query handler
      // const query = new GetCommercialMetricsQuery({
      //   commercialId,
      //   dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      //   dateTo: dateTo ? new Date(dateTo) : undefined,
      // });

      // Respuesta temporal
      return {
        totalChats: 0,
        activeChats: 0,
        closedChats: 0,
        averageResponseTime: 0,
        totalMessages: 0,
        averageChatDuration: 0,
        resolutionRate: 0,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener métricas del comercial ${commercialId}:`,
        error,
      );
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Asigna un chat a un comercial
   * Requiere autenticación y permisos de comercial, administrador o supervisor
   */
  @Put(':chatId/assign/:commercialId')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Asignar chat a comercial',
    description:
      'Asigna un chat específico a un comercial. Requiere autenticación y permisos apropiados.',
  })
  @ApiParam({
    name: 'chatId',
    description: 'ID del chat',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'commercialId',
    description: 'ID del comercial',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat asignado exitosamente',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado - Token de autenticación requerido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuario sin permisos suficientes - Requiere rol de comercial, administrador o supervisor',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat o comercial no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  assignChat(
    @Param('chatId') chatId: string,
    @Param('commercialId') commercialId: string,
  ): ChatResponseDto {
    try {
      this.logger.log(`Asignando chat ${chatId} al comercial ${commercialId}`);

      // TODO: Implementar command handler
      // const command = new AssignChatToCommercialCommand({
      //   chatId,
      //   commercialId,
      //   assignedBy: req.user.sub,
      // });

      // const result = await this.commandBus.execute(command);

      // Respuesta temporal
      throw new HttpException(
        'Funcionalidad no implementada',
        HttpStatus.NOT_IMPLEMENTED,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error al asignar chat ${chatId}:`, error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cierra un chat
   * Requiere autenticación y permisos de comercial, administrador o supervisor
   */
  @Put(':chatId/close')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Cerrar chat',
    description:
      'Marca un chat como cerrado. Requiere autenticación y permisos apropiados.',
  })
  @ApiParam({
    name: 'chatId',
    description: 'ID del chat',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat cerrado exitosamente',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado - Token de autenticación requerido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuario sin permisos suficientes - Requiere rol de comercial, administrador o supervisor',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  closeChat(@Param('chatId') chatId: string): ChatResponseDto {
    try {
      this.logger.log(`Cerrando chat ${chatId}`);

      // TODO: Implementar command handler
      // const command = new CloseChatCommand({
      //   chatId,
      //   closedBy: req.user.sub,
      // });

      // Respuesta temporal
      throw new HttpException(
        'Funcionalidad no implementada',
        HttpStatus.NOT_IMPLEMENTED,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error al cerrar chat ${chatId}:`, error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Elimina todos los chats asociados a un visitante
   * Requiere autenticación y permisos de administrador
   */
  @Delete('visitor/:visitorId/clear')
  @RequiredRoles('admin')
  @ApiOperation({
    summary: 'Eliminar todos los chats de un visitante',
    description:
      'Elimina permanentemente todos los chats asociados a un visitante específico. Esta operación es irreversible y requiere permisos de administrador.',
  })
  @ApiParam({
    name: 'visitorId',
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Chats eliminados exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Todos los chats del visitante han sido eliminados',
        },
        deletedCount: {
          type: 'number',
          example: 5,
          description: 'Número de chats eliminados',
        },
        visitorId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado - Token de autenticación requerido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuario sin permisos suficientes - Requiere rol de administrador',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  clearVisitorChats(
    @Param('visitorId') visitorId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    message: string;
    deletedCount: number;
    visitorId: string;
  }> {
    return (async () => {
      try {
        this.logger.log(
          `Eliminando todos los chats del visitante ${visitorId} por usuario ${req.user.id}`,
        );

        const { ClearVisitorChatsCommand } = await import(
          '../../application/commands/clear-visitor-chats.command'
        );
        const command = new ClearVisitorChatsCommand(visitorId, req.user.id);
        const result = await this.commandBus.execute<
          any,
          { deletedCount: number; visitorId: string }
        >(command);

        this.logger.log(
          `Eliminados ${result.deletedCount} chats del visitante ${visitorId}`,
        );

        return {
          message: 'Todos los chats del visitante han sido eliminados',
          deletedCount: result.deletedCount,
          visitorId: result.visitorId,
        };
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        this.logger.error(
          `Error al eliminar chats del visitante ${visitorId}:`,
          error,
        );
        throw new HttpException(
          'Error interno del servidor',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    })();
  }

  /**
   * Obtiene chats pendientes de un visitante específico con detalles
   * Requiere autenticación y devuelve información del visitante, chats pendientes,
   * historial de mensajes y actividades
   */
  @Get('/api/v1/tenants/:tenantId/visitors/:visitorId/pending-chats')
  @UseGuards(AuthGuard, RolesGuard)
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Obtener chats pendientes de un visitante',
    description:
      'Retorna información detallada del visitante, sus chats pendientes, historial de mensajes y actividades. Requiere autenticación y rol de comercial, admin o supervisor.',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID del tenant',
    example: 'tenant-123',
  })
  @ApiParam({
    name: 'visitorId',
    description: 'ID del visitante',
    example: 'visitor-456',
  })
  @ApiQuery({
    name: 'chatIds',
    description: 'IDs de chats específicos a filtrar (separados por coma)',
    required: false,
    type: String,
    example: 'chat1,chat2',
  })
  @ApiResponse({
    status: 200,
    description: 'Chats pendientes obtenidos exitosamente',
    type: PendingChatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos suficientes',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async getVisitorPendingChats(
    @Param('tenantId') tenantId: string,
    @Param('visitorId') visitorId: string,
    @Query('chatIds') chatIds?: string,
  ): Promise<PendingChatsResponseDto> {
    try {
      this.logger.log(
        `Obteniendo chats pendientes para visitante: ${visitorId} en tenant: ${tenantId}`,
      );

      // Parsear chatIds si están presentes
      const chatIdsArray = chatIds
        ? chatIds.split(',').map((id) => id.trim())
        : undefined;

      const query = new GetVisitorPendingChatsQuery(
        tenantId,
        visitorId,
        chatIdsArray,
      );

      return await this.queryBus.execute(query);
    } catch (error) {
      this.logger.error(
        `Error al obtener chats pendientes del visitante ${visitorId}:`,
        error,
      );
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
