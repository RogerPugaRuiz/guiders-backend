import { Inject } from '@nestjs/common';
import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ChatCommercialsUnassignedEvent } from 'src/context/real-time/domain/events/chat-commercials-unassigned.event';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../../domain/chat/chat.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from '../../../../domain/chat/chat';

/**
 * Event handler que actualiza los participantes del chat cuando se desasignan comerciales
 * Escucha el evento ChatCommercialsUnassignedEvent y remueve los comerciales del chat
 */
@EventsHandler(ChatCommercialsUnassignedEvent)
export class UpdateChatParticipantsOnCommercialsUnassignedEventHandler
  implements IEventHandler<ChatCommercialsUnassignedEvent>
{
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
  ) {}

  /**
   * Maneja el evento de desasignación de comerciales removiendo los comerciales del chat
   * @param event Evento que contiene el ID del chat y los IDs de los comerciales a remover
   */
  async handle(event: ChatCommercialsUnassignedEvent): Promise<void> {
    const { chatId, commercialIds } = event;

    const chat = await this.getChat(chatId);

    let updatedChat = chat;
    for (const commercialId of commercialIds) {
      try {
        // Validamos que el participante no sea visitante antes de intentar removerlo
        const participant =
          updatedChat.participants.getParticipant(commercialId);
        if (!participant.isEmpty() && participant.get().isVisitor) {
          // No removemos visitantes, continuamos con el siguiente comercial
          continue;
        }

        // Intentamos remover el comercial del chat
        updatedChat = updatedChat.removeCommercial(commercialId);
      } catch {
        // Ignoramos errores si el comercial no existe o no es comercial
        // esto permite que el flujo continúe con los siguientes comerciales
      }
    }

    const chatAggregate = this.publisher.mergeObjectContext(updatedChat);

    await this.chatRepository.save(chatAggregate);

    chatAggregate.commit();
  }

  /**
   * Obtiene un chat por su ID
   * @param chatId ID del chat a buscar
   * @returns El chat encontrado
   * @throws Error si el chat no existe
   */
  async getChat(chatId: string) {
    const criteria = new Criteria<Chat>().addFilter(
      'id',
      Operator.EQUALS,
      chatId,
    );

    const optionalChat = await this.chatRepository.findOne(criteria);
    if (optionalChat.isEmpty()) {
      throw new Error('Chat not found');
    }
    return optionalChat.get().chat;
  }
}
