/**
 * Event handler que sincroniza conversaciones de chat con CRM cuando se cierra el chat
 * Sigue el patrón: <Acción>On<Evento>EventHandler
 */

import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ChatClosedEvent } from 'src/context/conversations-v2/domain/events/chat-closed.event';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from 'src/context/visitors-v2/domain/visitor-v2.repository';
import { VisitorId } from 'src/context/visitors-v2/domain/value-objects/visitor-id';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/chat.repository';
import {
  IMessageRepository,
  MESSAGE_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/message.repository';
import { ChatId } from 'src/context/conversations-v2/domain/value-objects/chat-id';
import {
  ICrmCompanyConfigRepository,
  CRM_COMPANY_CONFIG_REPOSITORY,
} from '../../domain/crm-company-config.repository';
import { SyncChatToCrmCommand } from '../commands/sync-chat-to-crm.command';
import { ChatSyncData } from '../../domain/services/crm-sync.service';

@EventsHandler(ChatClosedEvent)
export class SyncChatOnChatClosedEventHandler
  implements IEventHandler<ChatClosedEvent>
{
  private readonly logger = new Logger(SyncChatOnChatClosedEventHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(MESSAGE_V2_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    @Inject(CRM_COMPANY_CONFIG_REPOSITORY)
    private readonly configRepository: ICrmCompanyConfigRepository,
  ) {}

  async handle(event: ChatClosedEvent): Promise<void> {
    const closureData = event.getClosureData();
    const { chatId, visitorId } = closureData;

    this.logger.log(
      `Chat ${chatId} cerrado. Evaluando sincronización de conversación con CRM.`,
    );

    try {
      // 1. Obtener datos del visitor para obtener companyId (tenantId)
      const visitorResult = await this.visitorRepository.findById(
        VisitorId.create(visitorId),
      );

      if (visitorResult.isErr()) {
        this.logger.warn(
          `Visitor ${visitorId} no encontrado: ${visitorResult.error.message}`,
        );
        return;
      }

      const visitor = visitorResult.unwrap();
      const visitorPrimitives = visitor.toPrimitives();
      const companyId = visitorPrimitives.tenantId;

      if (!companyId) {
        this.logger.warn(`Visitor ${visitorId} sin tenantId (companyId)`);
        return;
      }

      // 2. Verificar si hay configuración de CRM con syncChatConversations habilitado
      const configsResult =
        await this.configRepository.findEnabledByCompanyId(companyId);

      if (configsResult.isErr()) {
        this.logger.error(
          `Error obteniendo configuración CRM para empresa ${companyId}: ${configsResult.error.message}`,
        );
        return;
      }

      const configs = configsResult.unwrap();
      const configsWithChatSync = configs.filter(
        (c) => c.syncChatConversations,
      );

      if (configsWithChatSync.length === 0) {
        this.logger.debug(
          `No hay CRMs con syncChatConversations habilitado para empresa ${companyId}. Omitiendo.`,
        );
        return;
      }

      // 3. Obtener el chat para datos adicionales
      const chatResult = await this.chatRepository.findById(
        ChatId.create(chatId),
      );

      if (chatResult.isErr()) {
        this.logger.warn(
          `Chat ${chatId} no encontrado: ${chatResult.error.message}`,
        );
        return;
      }

      const chat = chatResult.unwrap();
      const chatPrimitives = chat.toPrimitives();

      // 4. Obtener mensajes del chat
      const messagesResult = await this.messageRepository.findByChatId(
        ChatId.create(chatId),
      );

      if (messagesResult.isErr()) {
        this.logger.warn(
          `Error obteniendo mensajes del chat ${chatId}: ${messagesResult.error.message}`,
        );
        return;
      }

      const messagesSearchResult = messagesResult.unwrap();
      const messages = messagesSearchResult.messages;

      if (messages.length === 0) {
        this.logger.debug(`Chat ${chatId} sin mensajes. No se sincronizará.`);
        return;
      }

      // 5. Mapear mensajes al formato de sincronización
      const chatMessages: ChatSyncData['messages'] = messages.map((msg) => {
        const msgPrimitives = msg.toPrimitives();
        return {
          content: msgPrimitives.content,
          senderType: this.mapSenderType(
            msgPrimitives.senderId,
            chatPrimitives.visitorId,
            chatPrimitives.assignedCommercialId,
          ),
          sentAt: new Date(msgPrimitives.createdAt),
          metadata: {
            messageId: msgPrimitives.id,
            type: msgPrimitives.type,
          },
        };
      });

      // 6. Ejecutar sincronización de chat
      this.logger.log(
        `Sincronizando chat ${chatId} (${messages.length} mensajes) con ${configsWithChatSync.length} CRM(s)`,
      );

      await this.commandBus.execute(
        new SyncChatToCrmCommand({
          chatId,
          visitorId,
          companyId,
          messages: chatMessages,
          startedAt: new Date(chatPrimitives.createdAt),
          closedAt: closureData.closedAt,
          summary: this.generateChatSummary(closureData, chatPrimitives),
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error en sincronización de chat ${chatId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      // No relanzamos - el evento ya ocurrió
    }
  }

  /**
   * Mapea el senderId a tipo de sender para el CRM
   */
  private mapSenderType(
    senderId: string,
    visitorId: string,
    commercialId?: string,
  ): 'visitor' | 'commercial' | 'bot' | 'system' {
    if (senderId === visitorId) {
      return 'visitor';
    }

    if (senderId === 'ai' || senderId === 'bot') {
      return 'bot';
    }

    if (senderId === 'system') {
      return 'system';
    }

    if (commercialId && senderId === commercialId) {
      return 'commercial';
    }

    // Por defecto, si no es visitor ni sistema, asumimos comercial
    return 'commercial';
  }

  /**
   * Genera un resumen del chat para el CRM
   */
  private generateChatSummary(
    closureData: ReturnType<ChatClosedEvent['getClosureData']>,
    chatPrimitives: { totalMessages: number; priority: string },
  ): string {
    const duration = this.formatDuration(closureData.duration);
    const parts = [
      `Chat de ${duration}`,
      `${chatPrimitives.totalMessages} mensajes`,
      `cerrado por: ${closureData.closedBy === closureData.visitorId ? 'visitante' : 'comercial'}`,
      `razón: ${closureData.reason}`,
    ];

    if (closureData.firstResponseTime) {
      parts.push(
        `tiempo primera respuesta: ${this.formatDuration(closureData.firstResponseTime)}`,
      );
    }

    return parts.join(' | ');
  }

  /**
   * Formatea duración en segundos a formato legible
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }

    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}
