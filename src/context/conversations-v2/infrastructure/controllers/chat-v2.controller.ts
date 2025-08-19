import {
  Controller,
  Get,
  Put,
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
import { CreateChatDto } from '../../application/dtos/create-chat.dto';
import { GetChatsWithFiltersQuery } from '../../application/queries/get-chats-with-filters.query';
import { CreateChatCommand } from '../../application/commands/create-chat.command';

/**
 * Controller para la gestión de chats v2
 * Proporciona endpoints optimizados para comerciales y visitantes
 */
@ApiTags('Chats V2')
@Controller('v2/chats')
@UseGuards(AuthGuard, RolesGuard)
export class ChatV2Controller {
  private readonly logger = new Logger(ChatV2Controller.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Obtiene la lista de chats con filtros avanzados
   */
  @Get()
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Obtener lista de chats con filtros y paginación con cursor',
    description:
      'Retorna una lista paginada de chats con filtros avanzados para comerciales. Utiliza paginación basada en cursor para mayor eficiencia y consistencia en resultados.',
  })
  @ApiQuery({
    name: 'cursor',
    description:
      'Cursor para paginación (obtenido del campo nextCursor de la respuesta anterior). Permite navegar a través de páginas sin duplicados ni omisiones.',
    required: false,
    type: String,
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI1LTA3LTI4VDEwOjMwOjAwLjAwMFoiLCJpZCI6ImNoYXQtMTIzIn0=',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de chats a retornar por página (1-100)',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiQuery({
    name: 'filters',
    description:
      'Filtros de búsqueda para chats (status, priority, visitorId, etc.)',
    required: false,
    type: Object,
  })
  @ApiQuery({
    name: 'sort',
    description: 'Opciones de ordenamiento (field y direction)',
    required: false,
    type: Object,
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de chats obtenida exitosamente con paginación basada en cursor',
    type: ChatListResponseDto,
    schema: {
      example: {
        chats: [
          {
            id: 'chat-123',
            visitorId: 'visitor-456',
            commercialId: 'commercial-789',
            status: 'active',
            priority: 'high',
            createdAt: '2025-07-28T10:30:00.000Z',
            lastMessageAt: '2025-07-28T11:15:00.000Z',
          },
        ],
        total: 150,
        hasMore: true,
        nextCursor:
          'eyJjcmVhdGVkQXQiOiIyMDI1LTA3LTI4VDExOjE1OjAwLjAwMFoiLCJpZCI6ImNoYXQtMTIzIn0=',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario sin permisos suficientes',
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
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Crea un chat con idempotencia usando PUT
   */
  @Put(':chatId')
  @RequiredRoles('visitor', 'commercial', 'admin')
  @ApiOperation({
    summary: 'Crear chat con idempotencia',
    description: 
      'Crea un nuevo chat usando el ID proporcionado en la URL. ' +
      'Si el chat ya existe, retorna el chat existente (idempotencia). ' +
      'El método PUT garantiza que múltiples llamadas con el mismo ID son seguras.',
  })
  @ApiParam({
    name: 'chatId',
    description: 'ID único del chat a crear (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat creado exitosamente o ya existía',
    type: ChatResponseDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending',
        priority: 'normal',
        visitorId: '550e8400-e29b-41d4-a716-446655440001',
        assignedCommercialId: null,
        availableCommercialIds: ['commercial-1', 'commercial-2'],
        totalMessages: 0,
        createdAt: '2025-07-28T10:30:00.000Z',
        updatedAt: '2025-07-28T10:30:00.000Z',
        visitorInfo: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Juan Pérez',
          email: 'juan@example.com',
        },
        metadata: {
          department: 'ventas',
          source: 'web',
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
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async createChat(
    @Param('chatId') chatId: string,
    @Body() createChatDto: CreateChatDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ChatResponseDto> {
    try {
      this.logger.log(`Creando chat ${chatId} para usuario: ${req.user.id}`);
      this.logger.debug(`Datos del chat: ${JSON.stringify(createChatDto)}`);

      // Crear el comando con los datos del DTO
      const command = CreateChatCommand.create({
        chatId,
        visitorId: createChatDto.visitorId,
        visitorInfo: createChatDto.visitorInfo,
        availableCommercialIds: createChatDto.availableCommercialIds,
        priority: createChatDto.priority,
        metadata: createChatDto.metadata,
      });

      // Ejecutar el comando
      const result = await this.commandBus.execute(command);

      if (result.isError()) {
        this.logger.error(`Error al crear chat ${chatId}:`, result.error);
        throw new HttpException(
          result.error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Convertir la entidad a DTO de respuesta
      const chatPrimitives = result.value.toPrimitives();
      const response: ChatResponseDto = {
        id: chatPrimitives.id,
        status: chatPrimitives.status,
        priority: chatPrimitives.priority,
        visitorId: chatPrimitives.visitorId,
        assignedCommercialId: chatPrimitives.assignedCommercialId,
        availableCommercialIds: chatPrimitives.availableCommercialIds,
        lastMessageDate: chatPrimitives.lastMessageDate,
        totalMessages: chatPrimitives.totalMessages,
        unreadMessagesCount: 0, // Nuevo chat, sin mensajes no leídos
        isActive: !chatPrimitives.closedAt,
        department: chatPrimitives.metadata?.department || 'general',
        tags: chatPrimitives.metadata?.tags || [],
        assignedAt: chatPrimitives.firstResponseTime,
        closedAt: chatPrimitives.closedAt,
        createdAt: chatPrimitives.createdAt,
        updatedAt: chatPrimitives.updatedAt,
        visitorInfo: {
          id: chatPrimitives.visitorId,
          name: chatPrimitives.visitorInfo.name || '',
          email: chatPrimitives.visitorInfo.email || '',
          phone: chatPrimitives.visitorInfo.phone,
          location: chatPrimitives.visitorInfo.location?.city || chatPrimitives.visitorInfo.location?.country,
          additionalData: {
            company: chatPrimitives.visitorInfo.company,
            ipAddress: chatPrimitives.visitorInfo.ipAddress,
            userAgent: chatPrimitives.visitorInfo.userAgent,
            referrer: chatPrimitives.visitorInfo.referrer,
          },
        },
        metadata: {
          department: chatPrimitives.metadata?.department || 'general',
          source: chatPrimitives.metadata?.source || 'web',
          initialUrl: undefined,
          userAgent: chatPrimitives.visitorInfo.userAgent,
          referrer: chatPrimitives.visitorInfo.referrer,
          tags: chatPrimitives.metadata?.customFields || {},
          customFields: chatPrimitives.metadata?.customFields || {},
        },
      };

      this.logger.log(`Chat ${chatId} creado/obtenido exitosamente`);
      return response;

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error al crear chat ${chatId}:`, error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene estadísticas de tiempo de respuesta
   */
  @Get('response-time-stats')
  @UseGuards(AuthGuard, RolesGuard)
  @RequiredRoles('commercial', 'admin')
  @ApiOperation({ summary: 'Obtener estadísticas de tiempo de respuesta' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['hour', 'day', 'week'] })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de tiempo de respuesta',
    type: [ResponseTimeStatsDto],
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
   */
  @Get(':chatId')
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
  @ApiOperation({
    summary: 'Obtener chat por ID',
    description: 'Retorna los detalles completos de un chat específico',
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
    status: 404,
    description: 'Chat no encontrado',
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
   */
  @Get('commercial/:commercialId')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Obtener chats de un comercial con paginación cursor',
    description:
      'Retorna los chats asignados a un comercial específico usando paginación basada en cursor',
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
   */
  @Get('visitor/:visitorId')
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
  @ApiOperation({
    summary: 'Obtener chats de un visitante con paginación cursor',
    description:
      'Retorna el historial de chats de un visitante específico usando paginación basada en cursor',
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
   */
  @Get('queue/pending')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Obtener cola de chats pendientes',
    description:
      'Retorna los chats pendientes ordenados por prioridad y tiempo',
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
   */
  @Get('metrics/commercial/:commercialId')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Obtener métricas de comercial',
    description: 'Retorna métricas agregadas de rendimiento de un comercial',
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
   */
  @Put(':chatId/assign/:commercialId')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Asignar chat a comercial',
    description: 'Asigna un chat específico a un comercial',
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
    status: 404,
    description: 'Chat no encontrado',
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
   */
  @Put(':chatId/close')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Cerrar chat',
    description: 'Marca un chat como cerrado',
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
}
