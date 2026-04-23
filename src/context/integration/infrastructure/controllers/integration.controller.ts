import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { EventPublisher } from '@nestjs/cqrs';
import {
  IntegrationApiKeyGuard,
  IntegrationApiKeyRequest,
} from 'src/context/auth/integration-api-key/infrastructure/integration-api-key.guard';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations-v2/domain/chat.repository';
import {
  IMessageRepository,
  MESSAGE_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/message.repository';
import { Chat } from 'src/context/conversations-v2/domain/entities/chat.aggregate';
import { Message } from 'src/context/conversations-v2/domain/entities/message.aggregate';
import { ChatId } from 'src/context/conversations-v2/domain/value-objects/chat-id';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateIntegrationConversationDto } from './dtos/create-integration-conversation.dto';
import { SendIntegrationMessageDto } from './dtos/send-integration-message.dto';

/**
 * Controller de la Integration API.
 * Todos los endpoints requieren autenticación via x-api-key (gdr_live_xxx / gdr_test_xxx).
 * El companyId SIEMPRE se extrae del API key — nunca del body.
 */
@ApiTags('integration')
@ApiSecurity('api-key')
@ApiHeader({
  name: 'x-api-key',
  description: 'Integration API Key (gdr_live_xxx o gdr_test_xxx)',
  required: true,
})
@UseGuards(IntegrationApiKeyGuard)
@Controller('integration')
export class IntegrationController {
  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(MESSAGE_V2_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    private readonly publisher: EventPublisher,
  ) {}

  /**
   * Crea una nueva conversación para un visitante.
   * Devuelve 409 si el visitante ya tiene una conversación activa para el mismo companyId.
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear conversación via Integration API' })
  @ApiResponse({ status: 201, description: 'Conversación creada exitosamente' })
  @ApiResponse({ status: 401, description: 'API Key inválida o ausente' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una conversación activa para este visitante',
  })
  async createConversation(
    @Req() req: IntegrationApiKeyRequest,
    @Body() dto: CreateIntegrationConversationDto,
  ) {
    const { companyId, environment } = req.integrationApiKey;

    // Verificar si ya existe una conversación activa para este visitante + empresa
    const existingResult =
      await this.chatRepository.findActiveByVisitorAndCompany(
        dto.visitorId,
        companyId,
      );

    if (existingResult.isErr()) {
      throw new InternalServerErrorException({
        error: 'REPOSITORY_ERROR',
        message: existingResult.error.message,
      });
    }

    if (existingResult.value !== null) {
      throw new ConflictException({
        error: 'ACTIVE_CONVERSATION_EXISTS',
        conversationId: existingResult.value.id.getValue(),
      });
    }

    // Crear el chat y publicar eventos de dominio
    const chat = Chat.createPendingChat({
      visitorId: dto.visitorId,
      companyId,
      channel: dto.channel ?? 'chat',
      visitorInfo: {},
      availableCommercialIds: [],
      metadata: dto.metadata
        ? {
            department: 'general',
            source: 'integration-api',
            customFields: dto.metadata,
          }
        : { department: 'general', source: 'integration-api' },
    });

    const chatAggregate = this.publisher.mergeObjectContext(chat);
    const saveResult = await this.chatRepository.save(chatAggregate);
    if (saveResult.isErr()) {
      throw new InternalServerErrorException({
        error: 'REPOSITORY_ERROR',
        message: saveResult.error.message,
      });
    }

    // Crear el mensaje inicial y publicar sus eventos
    const isTest = environment === 'test';
    const message = Message.createTextMessage({
      chatId: chat.id.getValue(),
      senderId: dto.visitorId,
      content: dto.message,
      isInternal: false,
    });

    const messageAggregate = this.publisher.mergeObjectContext(message);
    const msgSaveResult = await this.messageRepository.save(messageAggregate);
    if (msgSaveResult.isErr()) {
      // Compensación best-effort: eliminar el chat para evitar dejarlo huérfano.
      // Si el delete también falla, el chat quedará sin mensaje pero es preferible a no intentarlo.
      await this.chatRepository.delete(chat.id);
      throw new InternalServerErrorException({
        error: 'MESSAGE_SAVE_ERROR',
        message: msgSaveResult.error.message,
      });
    }

    // Publicar eventos de dominio una vez que ambos saves fueron exitosos
    chatAggregate.commit();
    messageAggregate.commit();

    return {
      conversationId: chat.id.getValue(),
      status: chat.status.value,
      visitorId: dto.visitorId,
      companyId,
      channel: chat.channel,
      isTest,
      createdAt: chat.createdAt,
    };
  }

  /**
   * Envía un mensaje a una conversación existente.
   * Soporta idempotencia via externalMessageId (pendiente de implementar).
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enviar mensaje via Integration API' })
  @ApiResponse({ status: 201, description: 'Mensaje enviado exitosamente' })
  @ApiResponse({ status: 401, description: 'API Key inválida o ausente' })
  @ApiResponse({ status: 403, description: 'La conversación no pertenece a esta empresa' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  @ApiResponse({ status: 422, description: 'La conversación está cerrada' })
  async sendMessage(
    @Req() req: IntegrationApiKeyRequest,
    @Param('id') conversationId: string,
    @Body() dto: SendIntegrationMessageDto,
  ) {
    const { companyId } = req.integrationApiKey;

    // Buscar la conversación — el repositorio devuelve err() tanto en "no encontrado" como en error de infra
    const chatResult = await this.chatRepository.findById(
      ChatId.create(conversationId),
    );
    if (chatResult.isErr()) {
      throw new NotFoundException({ error: 'CONVERSATION_NOT_FOUND' });
    }

    const chat = chatResult.value;

    // Verificar que pertenece a la empresa del API key
    if (chat.companyId !== companyId) {
      throw new ForbiddenException({ error: 'FORBIDDEN' });
    }

    // Verificar que la conversación puede recibir mensajes
    // La Integration API también acepta chats PENDING (ej: respuesta de bot antes de asignación)
    if (chat.status.isClosed()) {
      throw new UnprocessableEntityException({ error: 'CONVERSATION_CLOSED' });
    }

    const now = new Date();
    const senderType = dto.senderType ?? 'bot';
    const message = Message.createTextMessage({
      chatId: conversationId,
      senderId: `integration:${senderType}`,
      content: dto.content,
      isInternal: false,
    });

    const messageAggregate = this.publisher.mergeObjectContext(message);
    const saveResult = await this.messageRepository.save(messageAggregate);
    if (saveResult.isErr()) {
      throw new InternalServerErrorException({
        error: 'REPOSITORY_ERROR',
        message: saveResult.error.message,
      });
    }

    messageAggregate.commit();

    return {
      messageId: message.id.getValue(),
      conversationId,
      content: dto.content,
      contentType: dto.contentType ?? 'text',
      senderType,
      sentAt: now,
    };
  }

  /**
   * Obtiene el estado e historial de una conversación.
   */
  @Get('conversations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener conversación via Integration API' })
  @ApiResponse({ status: 200, description: 'Conversación obtenida exitosamente' })
  @ApiResponse({ status: 400, description: 'Parámetros de consulta inválidos' })
  @ApiResponse({ status: 401, description: 'API Key inválida o ausente' })
  @ApiResponse({ status: 403, description: 'La conversación no pertenece a esta empresa' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async getConversation(
    @Req() req: IntegrationApiKeyRequest,
    @Param('id') conversationId: string,
    @Query('includeMessages') includeMessages?: string,
    @Query('messagesLimit') messagesLimit?: string,
  ) {
    const { companyId } = req.integrationApiKey;

    // Validar límite de mensajes — P8: BadRequestException en lugar de Error genérico
    if (messagesLimit !== undefined) {
      const limit = parseInt(messagesLimit, 10);
      if (isNaN(limit) || limit < 1 || limit > 200) {
        throw new BadRequestException(
          'messagesLimit debe ser un número entre 1 y 200',
        );
      }
    }

    // Buscar la conversación — el repositorio devuelve err() tanto en "no encontrado" como en error de infra
    const chatResult = await this.chatRepository.findById(
      ChatId.create(conversationId),
    );
    if (chatResult.isErr()) {
      throw new NotFoundException({ error: 'CONVERSATION_NOT_FOUND' });
    }

    const chat = chatResult.value;

    // Verificar que pertenece a la empresa del API key
    if (chat.companyId !== companyId) {
      throw new ForbiddenException({ error: 'FORBIDDEN' });
    }

    const primitives = chat.toPrimitives();
    const response: Record<string, any> = {
      conversationId: primitives.id,
      status: primitives.status,
      channel: primitives.channel,
      visitorId: primitives.visitorId,
      companyId: primitives.companyId,
      assignedAgentId: primitives.assignedCommercialId ?? null,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };

    if (includeMessages === 'true') {
      const limit = messagesLimit ? parseInt(messagesLimit, 10) : 50;
      const messagesResult = await this.messageRepository.findByChatId(
        ChatId.create(conversationId),
        undefined,
        undefined,
        limit,
        0,
      );

      if (messagesResult.isOk()) {
        response.messages = messagesResult.value.messages.map((msg) => ({
          messageId: msg.id.getValue(),
          content: msg.content.getValue(),
          senderType: msg.type.value,
          sentAt: msg.createdAt,
        }));
        response.pagination = {
          hasMore: messagesResult.value.hasMore,
          nextCursor: null,
        };
      } else {
        response.messages = [];
        response.pagination = { hasMore: false, nextCursor: null };
      }
    }

    return response;
  }
}
