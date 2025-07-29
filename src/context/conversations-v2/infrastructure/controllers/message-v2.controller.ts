import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
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
  SendMessageDto,
  GetMessagesDto,
  MarkAsReadDto,
  MessageFiltersDto,
} from '../../application/dtos/message-request.dto';
import {
  MessageResponseDto,
  MessageListResponseDto,
  ConversationStatsResponseDto,
  MessageMetricsResponseDto,
} from '../../application/dtos/message-response.dto';

/**
 * Controller para la gestión de mensajes v2
 * Proporciona endpoints para enviar, obtener y gestionar mensajes en chats
 */
@ApiTags('Messages V2')
@Controller('v2/messages')
@UseGuards(AuthGuard, RolesGuard)
export class MessageV2Controller {
  private readonly logger = new Logger(MessageV2Controller.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Envía un nuevo mensaje a un chat
   */
  @Post()
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
  @ApiOperation({
    summary: 'Enviar un nuevo mensaje',
    description:
      'Envía un mensaje de texto, imagen o archivo a un chat específico',
  })
  @ApiResponse({
    status: 201,
    description: 'Mensaje enviado exitosamente',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para enviar mensajes a este chat',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat no encontrado',
  })
  sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    try {
      this.logger.log(
        `Enviando mensaje al chat ${sendMessageDto.chatId} desde usuario: ${req.user.id}`,
      );

      // TODO: Implementar command handler
      // const command = new SendMessageCommand({
      //   chatId: sendMessageDto.chatId,
      //   senderId: req.user.id,
      //   content: sendMessageDto.content,
      //   type: sendMessageDto.type || 'text',
      //   isInternal: sendMessageDto.isInternal || false,
      //   attachment: sendMessageDto.attachment,
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
      this.logger.error('Error al enviar mensaje:', error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene los mensajes de un chat específico
   */
  @Get('chat/:chatId')
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
  @ApiOperation({
    summary: 'Obtener mensajes de un chat',
    description:
      'Retorna los mensajes de un chat con filtros y paginación basada en cursor',
  })
  @ApiParam({
    name: 'chatId',
    description: 'ID único del chat',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Cursor para paginación (obtenido de nextCursor)',
    required: false,
    type: String,
    example:
      'eyJzZW50QXQiOiIyMDI1LTA3LTI4VDEwOjMwOjAwLjAwMFoiLCJpZCI6Im1zZy0xMjMifQ==',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de mensajes a retornar (1-100)',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiQuery({
    name: 'filters',
    description: 'Filtros de búsqueda para mensajes',
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
    description: 'Mensajes obtenidos exitosamente',
    type: MessageListResponseDto,
    schema: {
      example: {
        messages: [
          {
            id: 'msg-123',
            chatId: 'chat-456',
            senderId: 'user-789',
            content: 'Hola, ¿en qué puedo ayudarte?',
            type: 'text',
            isInternal: false,
            isFirstResponse: true,
            createdAt: '2025-07-28T10:30:00.000Z',
            updatedAt: '2025-07-28T10:30:00.000Z',
          },
        ],
        total: 25,
        hasMore: true,
        nextCursor:
          'eyJzZW50QXQiOiIyMDI1LTA3LTI4VDEwOjMwOjAwLjAwMFoiLCJpZCI6Im1zZy0xMjMifQ==',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder a este chat',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat no encontrado',
  })
  getChatMessages(
    @Param('chatId') chatId: string,
    @Query() queryParams: GetMessagesDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageListResponseDto> {
    try {
      this.logger.log(
        `Obteniendo mensajes del chat ${chatId} para usuario: ${req.user.id}`,
      );

      // Log the query parameters for debugging
      this.logger.debug(`Query params: ${JSON.stringify(queryParams)}`);

      // TODO: Implementar query handler
      // const query = new GetChatMessagesQuery({
      //   chatId,
      //   userId: req.user.id,
      //   userRole: req.user.roles[0],
      //   filters: queryParams.filters,
      //   sort: queryParams.sort,
      //   cursor: queryParams.cursor,
      //   limit: queryParams.limit || 50,
      // });

      // const result = await this.queryBus.execute(query);

      // Respuesta temporal
      return Promise.resolve({
        messages: [],
        total: 0,
        hasMore: false,
        nextCursor: undefined,
      });
    } catch (error) {
      this.logger.error(`Error al obtener mensajes del chat ${chatId}:`, error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene un mensaje específico por ID
   */
  @Get(':messageId')
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
  @ApiOperation({
    summary: 'Obtener mensaje por ID',
    description: 'Retorna los detalles de un mensaje específico',
  })
  @ApiParam({
    name: 'messageId',
    description: 'ID único del mensaje',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje encontrado exitosamente',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder a este mensaje',
  })
  @ApiResponse({
    status: 404,
    description: 'Mensaje no encontrado',
  })
  getMessageById(
    @Param('messageId') messageId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    try {
      this.logger.log(
        `Obteniendo mensaje ${messageId} para usuario: ${req.user.id}`,
      );

      // TODO: Implementar query handler
      // const query = new GetMessageByIdQuery({
      //   messageId,
      //   userId: req.user.id,
      //   userRole: req.user.roles[0],
      // });

      // const result = await this.queryBus.execute(query);

      // Respuesta temporal
      throw new HttpException('Mensaje no encontrado', HttpStatus.NOT_FOUND);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error al obtener mensaje ${messageId}:`, error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Marca mensajes como leídos
   */
  @Put('mark-as-read')
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
  @ApiOperation({
    summary: 'Marcar mensajes como leídos',
    description:
      'Marca una lista de mensajes como leídos por el usuario actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensajes marcados como leídos exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Lista de mensajes inválida',
  })
  markAsRead(
    @Body() markAsReadDto: MarkAsReadDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; markedCount: number }> {
    try {
      this.logger.log(
        `Marcando ${markAsReadDto.messageIds.length} mensajes como leídos para usuario: ${req.user.id}`,
      );

      // TODO: Implementar command handler
      // const command = new MarkMessagesAsReadCommand({
      //   messageIds: markAsReadDto.messageIds,
      //   readBy: req.user.id,
      //   userRole: req.user.roles[0],
      // });

      // const result = await this.commandBus.execute(command);

      // Respuesta temporal
      return Promise.resolve({
        success: true,
        markedCount: markAsReadDto.messageIds.length,
      });
    } catch (error) {
      this.logger.error('Error al marcar mensajes como leídos:', error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene mensajes no leídos de un chat
   */
  @Get('chat/:chatId/unread')
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
  @ApiOperation({
    summary: 'Obtener mensajes no leídos de un chat',
    description: 'Retorna los mensajes no leídos de un chat específico',
  })
  @ApiParam({
    name: 'chatId',
    description: 'ID único del chat',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensajes no leídos obtenidos exitosamente',
    type: [MessageResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder a este chat',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat no encontrado',
  })
  getUnreadMessages(
    @Param('chatId') chatId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto[]> {
    try {
      this.logger.log(
        `Obteniendo mensajes no leídos del chat ${chatId} para usuario: ${req.user.id}`,
      );

      // TODO: Implementar query handler
      // const query = new GetUnreadMessagesQuery({
      //   chatId,
      //   userId: req.user.id,
      //   userRole: req.user.roles[0],
      // });

      // const result = await this.queryBus.execute(query);

      // Respuesta temporal
      return Promise.resolve([]);
    } catch (error) {
      this.logger.error(
        `Error al obtener mensajes no leídos del chat ${chatId}:`,
        error,
      );
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Busca mensajes por contenido
   */
  @Get('search')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Buscar mensajes por contenido',
    description: 'Busca mensajes que contengan palabras clave específicas',
  })
  @ApiQuery({
    name: 'keyword',
    description: 'Palabra clave a buscar en el contenido',
    example: 'problema técnico',
  })
  @ApiQuery({
    name: 'chatId',
    description: 'ID del chat para limitar la búsqueda (opcional)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'filters',
    description: 'Filtros adicionales de búsqueda',
    required: false,
    type: Object,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de resultados (1-100)',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Búsqueda completada exitosamente',
    type: MessageListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de búsqueda inválidos',
  })
  searchMessages(
    @Query('keyword') keyword: string,
    @Query('chatId') chatId?: string,
    @Query('filters') filters?: MessageFiltersDto,
    @Query('limit') limit?: number,
  ): Promise<MessageListResponseDto> {
    try {
      this.logger.log(`Buscando mensajes con keyword: "${keyword}"`);

      // Log parameters to avoid unused variable warnings
      this.logger.debug(
        `ChatId: ${chatId}, Filters: ${JSON.stringify(filters)}, Limit: ${limit}`,
      );

      // TODO: Implementar query handler
      // const query = new SearchMessagesQuery({
      //   keyword,
      //   chatId,
      //   filters,
      //   limit: limit || 20,
      // });

      // const result = await this.queryBus.execute(query);

      // Respuesta temporal
      return Promise.resolve({
        messages: [],
        total: 0,
        hasMore: false,
        nextCursor: undefined,
      });
    } catch (error) {
      this.logger.error(`Error al buscar mensajes:`, error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene estadísticas de conversación
   */
  @Get('chat/:chatId/stats')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Obtener estadísticas de conversación',
    description: 'Retorna estadísticas detalladas de un chat específico',
  })
  @ApiParam({
    name: 'chatId',
    description: 'ID único del chat',
    example: '550e8400-e29b-41d4-a716-446655440000',
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
    description: 'Estadísticas obtenidas exitosamente',
    type: ConversationStatsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder a las estadísticas',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat no encontrado',
  })
  getConversationStats(
    @Param('chatId') chatId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<ConversationStatsResponseDto> {
    try {
      this.logger.log(`Obteniendo estadísticas del chat ${chatId}`);
      this.logger.log(`Período: ${dateFrom} - ${dateTo}`);

      // TODO: Implementar query handler
      // const query = new GetConversationStatsQuery({
      //   chatId,
      //   dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      //   dateTo: dateTo ? new Date(dateTo) : undefined,
      // });

      // const result = await this.queryBus.execute(query);

      // Respuesta temporal
      return Promise.resolve({
        totalMessages: 0,
        messagesByType: {},
        averageResponseTime: 0,
        unreadCount: 0,
        lastActivity: new Date().toISOString(),
        participantCount: 0,
      });
    } catch (error) {
      this.logger.error(
        `Error al obtener estadísticas del chat ${chatId}:`,
        error,
      );
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene métricas de mensajería por período
   */
  @Get('metrics')
  @RequiredRoles('commercial', 'admin', 'supervisor')
  @ApiOperation({
    summary: 'Obtener métricas de mensajería',
    description:
      'Retorna métricas agregadas de mensajería por período de tiempo',
  })
  @ApiQuery({
    name: 'dateFrom',
    description: 'Fecha de inicio del período (ISO 8601)',
    example: '2025-07-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'dateTo',
    description: 'Fecha de fin del período (ISO 8601)',
    example: '2025-07-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'groupBy',
    description: 'Agrupación temporal',
    enum: ['hour', 'day', 'week'],
    example: 'day',
  })
  @ApiQuery({
    name: 'chatId',
    description: 'ID del chat para limitar las métricas (opcional)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtenidas exitosamente',
    type: [MessageMetricsResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos',
  })
  getMessageMetrics(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('groupBy') groupBy: 'hour' | 'day' | 'week',
    @Query('chatId') chatId?: string,
  ): Promise<MessageMetricsResponseDto[]> {
    try {
      this.logger.log(
        `Obteniendo métricas de mensajería: ${dateFrom} - ${dateTo}, groupBy: ${groupBy}`,
      );

      // Log chatId to avoid unused variable warning
      this.logger.debug(`ChatId filter: ${chatId}`);

      // TODO: Implementar query handler
      // const query = new GetMessageMetricsQuery({
      //   dateFrom: new Date(dateFrom),
      //   dateTo: new Date(dateTo),
      //   groupBy,
      //   chatId,
      // });

      // const result = await this.queryBus.execute(query);

      // Respuesta temporal
      return Promise.resolve([
        {
          period: '2025-07-28',
          totalMessages: 150,
          messagesByType: {
            text: 140,
            image: 8,
            file: 2,
          },
          averageLength: 85.3,
          responseTimeMinutes: 12.7,
        },
      ]);
    } catch (error) {
      this.logger.error('Error al obtener métricas de mensajería:', error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene mensajes con archivos adjuntos
   */
  @Get('attachments')
  @RequiredRoles('commercial', 'admin', 'supervisor', 'visitor')
  @ApiOperation({
    summary: 'Obtener mensajes con archivos adjuntos',
    description: 'Retorna mensajes que contienen archivos adjuntos',
  })
  @ApiQuery({
    name: 'chatId',
    description: 'ID del chat para filtrar (opcional)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'fileTypes',
    description: 'Tipos de archivo a incluir (MIME types)',
    required: false,
    example: ['image/png', 'application/pdf'],
  })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de mensajes (1-100)',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Mensajes con adjuntos obtenidos exitosamente',
    type: [MessageResponseDto],
  })
  getMessagesWithAttachments(
    @Query('chatId') chatId?: string,
    @Query('fileTypes') fileTypes?: string[],
    @Query('limit') limit?: number,
    @Req() req?: AuthenticatedRequest,
  ): Promise<MessageResponseDto[]> {
    try {
      this.logger.log('Obteniendo mensajes con archivos adjuntos');

      // Log parameters to avoid unused variable warnings
      this.logger.debug(
        `Filtros - ChatId: ${chatId}, FileTypes: ${JSON.stringify(fileTypes)}, Limit: ${limit}, User: ${req?.user?.id}`,
      );

      // TODO: Implementar query handler
      // const query = new GetMessagesWithAttachmentsQuery({
      //   chatId,
      //   fileTypes,
      //   limit: limit || 20,
      //   userId: req?.user.id,
      //   userRole: req?.user.roles[0],
      // });

      // const result = await this.queryBus.execute(query);

      // Respuesta temporal
      return Promise.resolve([]);
    } catch (error) {
      this.logger.error('Error al obtener mensajes con adjuntos:', error);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
