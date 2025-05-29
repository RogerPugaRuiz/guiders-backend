import { Inject, Logger } from '@nestjs/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CommercialDisconnectedEvent } from '../../domain/events/commercial-disconnected.event';
import { ChatCommercialsUnassignedEvent } from '../../domain/events/chat-commercials-unassigned.event';
import { CommercialAssignmentService } from '../../domain/commercial-assignment.service';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations/chat/domain/chat/chat.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from 'src/context/conversations/chat/domain/chat/chat';
import { ConnectionRole } from '../../domain/value-objects/connection-role';

/**
 * Event handler que maneja la desconexión de comerciales
 * Cuando un comercial se desconecta, este handler:
 * 1. Verifica que el usuario desconectado sea comercial
 * 2. Busca todos los chats donde está asignado
 * 3. Publica eventos para remover el comercial de esos chats
 */
@EventsHandler(CommercialDisconnectedEvent)
export class RecalculateAssignmentOnCommercialDisconnectedEventHandler
  implements IEventHandler<CommercialDisconnectedEvent>
{
  private readonly logger = new Logger(
    RecalculateAssignmentOnCommercialDisconnectedEventHandler.name,
  );

  constructor(
    private readonly commercialAssignmentService: CommercialAssignmentService,
    private readonly eventBus: EventBus,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  /**
   * Maneja el evento CommercialDisconnectedEvent recalculando la asignación de chats
   * @param event Evento disparado cuando un comercial se desconecta
   */
  async handle(event: CommercialDisconnectedEvent): Promise<void> {
    // Verificamos que el usuario desconectado tenga el rol de comercial
    const isCommercial = event.connection.roles.includes(
      ConnectionRole.COMMERCIAL,
    );

    if (!isCommercial) {
      this.logger.debug(
        `Usuario ${event.connection.userId} desconectado no es comercial, ignorando`,
      );
      return;
    }

    this.logger.log(
      `Comercial ${event.connection.userId} desconectado, recalculando asignación de chats`,
    );

    // Buscamos todos los chats donde está asignado este comercial
    const chatsCriteria = new Criteria<Chat>().addFilter(
      'participants',
      Operator.EQUALS,
      event.connection.userId,
    );

    const { chats } = await this.chatRepository.find(chatsCriteria);

    // Filtramos solo los chats donde el comercial está realmente asignado
    const chatsWithCommercial = chats.filter((chat) =>
      chat.hasParticipant(event.connection.userId),
    );

    if (chatsWithCommercial.length === 0) {
      this.logger.debug(
        `Comercial ${event.connection.userId} no está asignado a ningún chat`,
      );
      return;
    }

    // Para cada chat donde está asignado, publicamos el evento de desasignación
    for (const chat of chatsWithCommercial) {
      this.eventBus.publish(
        new ChatCommercialsUnassignedEvent(chat.id.value, [
          event.connection.userId,
        ]),
      );

      this.logger.log(
        `Comercial ${event.connection.userId} removido del chat ${chat.id.value}`,
      );
    }

    this.logger.log(
      `Procesada desconexión del comercial ${event.connection.userId}: ${chatsWithCommercial.length} chats actualizados`,
    );
  }
}
