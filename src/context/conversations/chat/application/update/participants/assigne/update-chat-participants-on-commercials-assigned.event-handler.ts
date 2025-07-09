import { Inject, Logger } from '@nestjs/common';
import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ChatCommercialsAssignedEvent } from 'src/context/real-time/domain/events/chat-commercials-assigned.event';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../../domain/chat/chat.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from '../../../../domain/chat/chat';
import { IUserFinder, USER_FINDER } from '../../../read/get-username-by-id';

@EventsHandler(ChatCommercialsAssignedEvent)
export class UpdateChatParticipantsOnCommercialsAssignedEventHandler
  implements IEventHandler<ChatCommercialsAssignedEvent>
{
  private readonly logger = new Logger(
    UpdateChatParticipantsOnCommercialsAssignedEventHandler.name,
  );

  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
    @Inject(USER_FINDER) private readonly userFinder: IUserFinder,
    private readonly publisher: EventPublisher,
  ) {}
  async handle(event: ChatCommercialsAssignedEvent) {
    this.logger.log('🔄 Iniciando asignación de comerciales al chat');
    this.logger.log(`📝 Event recibido: ${JSON.stringify(event)}`);

    const { chatId, commercialIds } = event;

    this.logger.log(`🆔 Chat ID: ${chatId}`);
    this.logger.log(
      `👥 Commercial IDs a asignar: ${JSON.stringify(commercialIds)}`,
    );
    this.logger.log(
      `📊 Cantidad de comerciales a asignar: ${commercialIds.length}`,
    );

    const chat = await this.getChat(chatId);

    this.logger.log(`💬 Chat encontrado: ${chat.id.value}`);
    this.logger.log(
      `👤 Participantes actuales antes de la asignación: ${JSON.stringify(chat.participants)}`,
    );

    let updatedChat = chat;
    for (const commercialId of commercialIds) {
      this.logger.log(`🔄 Procesando comercial ID: ${commercialId}`);

      try {
        const commercialName = await this.userFinder.findById(commercialId);
        this.logger.log(
          `👤 Nombre del comercial encontrado: ${commercialName}`,
        );

        const commercialData = {
          id: commercialId,
          name: commercialName,
        };

        this.logger.log(
          `📦 Datos del comercial a asignar: ${JSON.stringify(commercialData)}`,
        );

        updatedChat = updatedChat.asignCommercial(commercialData);

        this.logger.log(`✅ Comercial ${commercialId} asignado correctamente`);
        this.logger.log(
          `👥 Participantes después de asignar ${commercialId}: ${JSON.stringify(updatedChat.participants)}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Error al asignar comercial ${commercialId}:`,
          error,
        );
        throw error;
      }
    }

    this.logger.log(
      `🎯 Chat final antes de guardar: ${JSON.stringify({
        id: updatedChat.id,
        participants: updatedChat.participants,
      })}`,
    );

    const chatAggregate = this.publisher.mergeObjectContext(updatedChat);

    try {
      await this.chatRepository.save(chatAggregate);
      this.logger.log('💾 Chat guardado exitosamente en el repositorio');

      chatAggregate.commit();
      this.logger.log('✨ Eventos del agregado committed exitosamente');
    } catch (error) {
      this.logger.error('❌ Error al guardar el chat:', error);
      throw error;
    }

    this.logger.log('🎉 Asignación de comerciales completada exitosamente');
  }

  async getChat(chatId: string) {
    this.logger.log(`🔍 Buscando chat con ID: ${chatId}`);

    const criteria = new Criteria<Chat>().addFilter(
      'id',
      Operator.EQUALS,
      chatId,
    );

    const optionalChat = await this.chatRepository.findOne(criteria);

    if (optionalChat.isEmpty()) {
      this.logger.error(`❌ Chat con ID ${chatId} no encontrado`);
      throw new Error('Chat not found');
    }

    const chat = optionalChat.get().chat;
    this.logger.log(`✅ Chat encontrado exitosamente: ${chat.id.value}`);

    return chat;
  }
}
