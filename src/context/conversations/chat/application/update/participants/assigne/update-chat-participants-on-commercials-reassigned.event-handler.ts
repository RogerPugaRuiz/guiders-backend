import { Inject, Logger } from '@nestjs/common';
import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ChatCommercialsReassignedEvent } from 'src/context/real-time/domain/events/chat-commercials-reassigned.event';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../../domain/chat/chat.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from '../../../../domain/chat/chat';
import { IUserFinder, USER_FINDER } from '../../../read/get-username-by-id';

/**
 * Handler que maneja la reasignación de comerciales en un chat
 * A diferencia del handler normal, este remueve comerciales anteriores antes de asignar nuevos
 */
@EventsHandler(ChatCommercialsReassignedEvent)
export class UpdateChatParticipantsOnCommercialsReassignedEventHandler
  implements IEventHandler<ChatCommercialsReassignedEvent>
{
  private readonly logger = new Logger(
    UpdateChatParticipantsOnCommercialsReassignedEventHandler.name,
  );

  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
    @Inject(USER_FINDER) private readonly userFinder: IUserFinder,
    private readonly publisher: EventPublisher,
  ) {}

  async handle(event: ChatCommercialsReassignedEvent) {
    this.logger.log('🔄 Iniciando reasignación de comerciales al chat');
    this.logger.log(`📝 Event recibido: ${JSON.stringify(event)}`);

    const { chatId, commercialIds } = event;

    this.logger.log(`🆔 Chat ID: ${chatId}`);
    this.logger.log(
      `👥 Commercial IDs a reasignar: ${JSON.stringify(commercialIds)}`,
    );
    this.logger.log(
      `📊 Cantidad de comerciales a reasignar: ${commercialIds.length}`,
    );

    const chat = await this.getChat(chatId);

    this.logger.log(`💬 Chat encontrado: ${chat.id.value}`);
    this.logger.log(
      `👤 Participantes actuales antes de la reasignación: ${JSON.stringify(chat.participants)}`,
    );

    try {
      // Obtener datos de todos los comerciales
      const commercialData: { id: string; name: string }[] = [];
      for (const commercialId of commercialIds) {
        this.logger.log(
          `🔄 Obteniendo datos del comercial ID: ${commercialId}`,
        );

        const commercialName = await this.userFinder.findById(commercialId);
        this.logger.log(
          `👤 Nombre del comercial encontrado: ${commercialName}`,
        );

        commercialData.push({
          id: commercialId,
          name: commercialName,
        });
      }

      this.logger.log(
        `📦 Datos de comerciales a reasignar: ${JSON.stringify(commercialData)}`,
      );

      // Usar el método de reasignación que limpia comerciales anteriores
      const updatedChat = chat.reassignCommercials(commercialData);

      this.logger.log('✅ Comerciales reasignados correctamente');
      this.logger.log(
        `👥 Participantes después de la reasignación: ${JSON.stringify(updatedChat.participants)}`,
      );

      const chatAggregate = this.publisher.mergeObjectContext(updatedChat);

      await this.chatRepository.save(chatAggregate);
      this.logger.log('💾 Chat guardado exitosamente en el repositorio');

      chatAggregate.commit();
      this.logger.log('✨ Eventos del agregado committed exitosamente');
    } catch (error) {
      this.logger.error('❌ Error al reasignar comerciales:', error);
      throw error;
    }

    this.logger.log('🎉 Reasignación de comerciales completada exitosamente');
  }

  private async getChat(chatId: string): Promise<Chat> {
    const criteria = new Criteria([
      {
        field: 'id',
        operator: Operator.EQUALS,
        value: chatId,
      },
    ]);
    const { chats } = await this.chatRepository.find(criteria);
    if (chats.length === 0) {
      throw new Error(`Chat with id ${chatId} not found`);
    }
    return chats[0];
  }
}
