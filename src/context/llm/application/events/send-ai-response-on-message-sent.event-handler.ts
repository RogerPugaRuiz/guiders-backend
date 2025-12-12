/**
 * Event handler que genera respuesta de IA cuando se envía un mensaje
 * Sigue el patrón: <Acción>On<Evento>EventHandler
 */

import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { MessageSentEvent } from 'src/context/conversations-v2/domain/events/message-sent.event';
import { GenerateAIResponseCommand } from '../commands/generate-ai-response.command';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/chat.repository';
import {
  ILlmConfigRepository,
  LLM_CONFIG_REPOSITORY,
} from '../../domain/llm-config.repository';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from 'src/context/visitors-v2/domain/visitor-v2.repository';
import { ChatId } from 'src/context/conversations-v2/domain/value-objects/chat-id';
import { VisitorId } from 'src/context/visitors-v2/domain/value-objects/visitor-id';
import { LlmCompanyConfig } from '../../domain/value-objects/llm-company-config';

@EventsHandler(MessageSentEvent)
export class SendAIResponseOnMessageSentEventHandler
  implements IEventHandler<MessageSentEvent>
{
  private readonly logger = new Logger(
    SendAIResponseOnMessageSentEventHandler.name,
  );

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(LLM_CONFIG_REPOSITORY)
    private readonly configRepository: ILlmConfigRepository,
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async handle(event: MessageSentEvent): Promise<void> {
    const messageData = event.getMessageData();

    // 1. Ignorar mensajes que no requieren respuesta de IA (checks básicos)
    if (this.shouldSkipMessage(event)) {
      return;
    }

    this.logger.debug(
      `Procesando mensaje ${messageData.messageId} para posible respuesta IA`,
    );

    try {
      // 2. Obtener el chat para verificar estado y obtener datos
      const chatResult = await this.chatRepository.findById(
        ChatId.create(messageData.chatId),
      );

      if (chatResult.isErr()) {
        this.logger.warn(
          `Chat ${messageData.chatId} no encontrado: ${chatResult.error.message}`,
        );
        return;
      }

      const chat = chatResult.unwrap();
      const chatPrimitives = chat.toPrimitives();

      // 3. IMPORTANTE: Solo responder a mensajes de visitantes
      // Comparamos senderId con visitorId del chat
      if (messageData.senderId !== chatPrimitives.visitorId) {
        this.logger.debug(
          `Ignorando mensaje de comercial (senderId: ${messageData.senderId} !== visitorId: ${chatPrimitives.visitorId})`,
        );
        return;
      }

      // 4. Obtener datos del visitante para siteId y companyId
      const visitorResult = await this.visitorRepository.findById(
        VisitorId.create(chatPrimitives.visitorId),
      );

      if (visitorResult.isErr()) {
        this.logger.warn(`Visitante ${chatPrimitives.visitorId} no encontrado`);
        return;
      }

      const visitor = visitorResult.unwrap();
      const visitorPrimitives = visitor.toPrimitives();

      const tenantId = visitorPrimitives.tenantId; // tenantId es el equivalente a companyId

      if (!tenantId) {
        this.logger.warn(
          `Visitante ${chatPrimitives.visitorId} sin tenantId (companyId)`,
        );
        return;
      }

      // 5. Obtener configuración de IA para la empresa
      const config = await this.getOrCreateConfig(tenantId);

      // 6. Verificar si la IA debe responder
      const hasCommercialAssigned = Boolean(
        chatPrimitives.assignedCommercialId,
      );

      if (!config.shouldAutoRespond(hasCommercialAssigned)) {
        this.logger.debug(
          `IA deshabilitada para empresa ${tenantId} (comercial asignado: ${hasCommercialAssigned})`,
        );
        return;
      }

      // 7. Generar respuesta de IA
      this.logger.log(`Generando respuesta IA para chat ${messageData.chatId}`);

      await this.commandBus.execute(
        new GenerateAIResponseCommand(
          messageData.chatId,
          chatPrimitives.visitorId,
          tenantId,
          messageData.messageId,
        ),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[AI_RESPONSE_FAILED] Error generando respuesta IA para chat ${messageData.chatId}`,
        JSON.stringify({
          chatId: messageData.chatId,
          messageId: messageData.messageId,
          senderId: messageData.senderId,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        }),
      );
    }
  }

  /**
   * Determina si el mensaje debe ser ignorado (checks básicos)
   * La verificación de visitante vs comercial se hace en handle() comparando con visitorId
   */
  private shouldSkipMessage(event: MessageSentEvent): boolean {
    const messageData = event.getMessageData();

    // Ignorar mensajes internos
    if (event.isInternal()) {
      this.logger.debug(`Ignorando mensaje interno ${messageData.messageId}`);
      return true;
    }

    // Ignorar mensajes de IA (evitar bucle infinito)
    if (event.isAIMessage()) {
      this.logger.debug(`Ignorando mensaje de IA ${messageData.messageId}`);
      return true;
    }

    // Ignorar mensajes del sistema
    if (messageData.type === 'SYSTEM') {
      this.logger.debug(
        `Ignorando mensaje del sistema ${messageData.messageId}`,
      );
      return true;
    }

    // Ignorar mensajes con senderIds especiales
    if (messageData.senderId === 'ai' || messageData.senderId === 'system') {
      this.logger.debug(
        `Ignorando mensaje con senderId especial ${messageData.messageId}`,
      );
      return true;
    }

    return false;
  }

  /**
   * Obtiene la configuración o crea una por defecto
   */
  private async getOrCreateConfig(
    companyId: string,
  ): Promise<LlmCompanyConfig> {
    const configResult = await this.configRepository.findByCompanyId(companyId);

    if (configResult.isOk()) {
      return configResult.unwrap();
    }

    // Crear configuración por defecto
    const defaultConfig = LlmCompanyConfig.createDefault(companyId);
    await this.configRepository.save(defaultConfig);

    return defaultConfig;
  }
}
