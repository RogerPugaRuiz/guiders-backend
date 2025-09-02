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
} from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  AuthGuard,
} from 'src/context/shared/infrastructure/guards/auth.guard';
import {
  RolesGuard,
  RequiredRoles,
} from 'src/context/shared/infrastructure/guards/role.guard';

// DTOs
import {
  ChatResponseDto,
  ChatListResponseDto,
} from '../../application/dtos/chat-response.dto';
import {
  GetChatsQueryDto,
  PaginationDto,
  CommercialMetricsResponseDto,
  ResponseTimeStatsDto,
} from '../../application/dtos/chat-query.dto';
import { CreateChatRequestDto } from '../../application/dtos/create-chat-request.dto';
import { GetChatsWithFiltersQuery } from '../../application/queries/get-chats-with-filters.query';
import { JoinWaitingRoomCommand } from '../../application/commands/join-waiting-room.command';

/**
 * Controller para la gestión de chats v2
 * Proporciona endpoints optimizados para comerciales y visitantes
 * IMPORTANTE: Todos los endpoints requieren autenticación válida
 */
@ApiTags('Chats V2')
@ApiBearerAuth()
@Controller('v2/chats')
@UseGuards(AuthGuard, RolesGuard)
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
   * Obtiene la lista de chats con filtros avanzados
   * Requiere autenticación y permisos de comercial, administrador o supervisor
   */
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @RequiredRoles('commercial', 'admin', 'supervisor')
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
   * Obtiene un chat específico por ID
   * Requiere autenticación y permisos apropiados
   */
  @Get(':chatId')
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
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
  getChatById(
    @Param('chatId') chatId: string,
    @Req() req: AuthenticatedRequest,
  ): ChatResponseDto {
    try {
      this.logger.log(`Obteniendo chat ${chatId} para usuario: ${req.user.id}`);

      // TODO: Implementar query handler
      // const query = new GetChatByIdQuery(chatId, req.user.sub, req.user.role);
      // const result: Result<Chat, DomainError> = await this.queryBus.execute(query);

      // if (result.isError()) {
      //   if (result.error instanceof ChatNotFoundError) {
      //     throw new HttpException('Chat no encontrado', HttpStatus.NOT_FOUND);
      //   }
      //   throw new HttpException(
      //     result.error.message,
      //     HttpStatus.INTERNAL_SERVER_ERROR,
      //   );
      // }

      // Respuesta temporal
      throw new HttpException('Chat no encontrado', HttpStatus.NOT_FOUND);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error al obtener chat ${chatId}:`, error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene chats asignados a un comercial específico
   * Requiere autenticación y permisos apropiados
   */
  @Get('commercial/:commercialId')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Obtener chats de un comercial con paginación cursor',
    description:
      'Retorna los chats asignados a un comercial específico usando paginación basada en cursor. Requiere autenticación.',
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
  getCommercialChats(
    @Param('commercialId') commercialId: string,
    @Query() queryParams: GetChatsQueryDto,
  ): ChatListResponseDto {
    try {
      this.logger.log(`Obteniendo chats del comercial ${commercialId}`);

      // Log the query parameters for debugging
      this.logger.debug(`Query params: ${JSON.stringify(queryParams)}`);

      // TODO: Implementar query handler
      // const query = new GetCommercialChatsQuery({
      //   commercialId,
      //   filters: queryParams.filters,
      //   sort: queryParams.sort,
      //   cursor: queryParams.cursor,
      //   limit: queryParams.limit || 20,
      // });

      // Respuesta temporal
      return {
        chats: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
      };
    } catch (error) {
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
   * Obtiene chats de un visitante específico
   * Requiere autenticación y permisos apropiados
   */
  @Get('visitor/:visitorId')
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
  @ApiOperation({
    summary: 'Obtener chats de un visitante con paginación cursor',
    description:
      'Retorna el historial de chats de un visitante específico usando paginación basada en cursor. Requiere autenticación.',
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
    description: 'Usuario no autenticado - Token de autenticación requerido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuario sin permisos suficientes - Requiere rol de comercial, administrador, supervisor o visitante',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  getVisitorChats(
    @Param('visitorId') visitorId: string,
    @Query() queryParams: PaginationDto,
  ): ChatListResponseDto {
    try {
      this.logger.log(`Obteniendo chats del visitante ${visitorId}`);

      // Log the query parameters for debugging
      this.logger.debug(`Query params: ${JSON.stringify(queryParams)}`);

      // TODO: Implementar query handler
      // const query = new GetVisitorChatsQuery({
      //   visitorId,
      //   cursor: queryParams.cursor,
      //   limit: queryParams.limit || 20,
      // });

      // Respuesta temporal
      return {
        chats: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
      };
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
  getPendingQueue(): ChatResponseDto[] {
    try {
      this.logger.log('Obteniendo cola de chats pendientes');

      // TODO: Implementar query handler
      // const query = new GetPendingQueueQuery({ department, limit });

      // Respuesta temporal
      return [];
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
  ): {
    message: string;
    deletedCount: number;
    visitorId: string;
  } {
    try {
      this.logger.log(
        `Eliminando todos los chats del visitante ${visitorId} por usuario ${req.user.id}`,
      );

      // TODO: Implementar command handler
      // const command = new ClearVisitorChatsCommand({
      //   visitorId,
      //   deletedBy: req.user.id,
      // });

      // const result = await this.commandBus.execute(command);

      // Respuesta temporal - en la implementación real se obtendrá del command handler
      const deletedCount = 0;

      this.logger.log(
        `Eliminados ${deletedCount} chats del visitante ${visitorId}`,
      );

      return {
        message: 'Todos los chats del visitante han sido eliminados',
        deletedCount,
        visitorId,
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
  }
}
