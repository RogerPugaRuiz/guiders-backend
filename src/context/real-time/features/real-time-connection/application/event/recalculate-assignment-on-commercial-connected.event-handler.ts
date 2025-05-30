import { Inject, Logger } from '@nestjs/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CommercialConnectedEvent } from '../../domain/events/commercial-connected.event';
import { CommercialAssignmentService } from '../../domain/commercial-assignment.service';
import { ChatCommercialsAssignedEvent } from '../../domain/events/chat-commercials-assigned.event';
import { ConnectionRole } from '../../domain/value-objects/connection-role';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations/features/chat/domain/chat/chat.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from 'src/context/conversations/features/chat/domain/chat/chat';
import { Status } from 'src/context/conversations/features/chat/domain/chat/value-objects/status';

@EventsHandler(CommercialConnectedEvent)
export class RecalculateAssignmentOnCommercialConnectedEventHandler
  implements IEventHandler<CommercialConnectedEvent>
{
  private readonly logger = new Logger(
    RecalculateAssignmentOnCommercialConnectedEventHandler.name,
  );

  constructor(
    private readonly commercialAssignmentService: CommercialAssignmentService,
    private readonly eventBus: EventBus,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  /**
   * Maneja el evento CommercialConnectedEvent recalculando la asignación de chats
   * @param event Evento disparado cuando un comercial se conecta
   */
  async handle(event: CommercialConnectedEvent): Promise<void> {
    // Verificamos que el usuario conectado tenga el rol de comercial
    const isCommercial = event.connection.roles.includes(
      ConnectionRole.COMMERCIAL,
    );

    if (!isCommercial) {
      this.logger.debug(
        `Usuario ${event.connection.userId} conectado no es comercial, ignorando`,
      );
      return;
    }

    this.logger.log(
      `Comercial ${event.connection.userId} conectado, recalculando asignación de chats`,
    );

    // Obtenemos los chats pendientes
    const pendingChatsCriteria = new Criteria<Chat>().addFilter(
      'status',
      Operator.EQUALS,
      Status.PENDING.value,
    );

    const { chats: pendingChats } =
      await this.chatRepository.find(pendingChatsCriteria);

    // Si no hay chats pendientes, no hay nada que hacer
    if (pendingChats.length === 0) {
      this.logger.log('No hay chats pendientes para asignar');
      return;
    }

    // Obtenemos los comerciales conectados
    const connectedCommercials =
      await this.commercialAssignmentService.getConnectedCommercials();

    // Si no hay comerciales conectados, no hay nada que hacer
    if (connectedCommercials.length === 0) {
      this.logger.warn(
        'No hay comerciales conectados para asignar a los chats',
      );
      return;
    }

    // Para cada chat pendiente, publicamos el evento de asignación de comerciales
    for (const chat of pendingChats) {
      this.eventBus.publish(
        new ChatCommercialsAssignedEvent(
          chat.id.value,
          connectedCommercials.map((conn) => conn.userId.value),
        ),
      );

      this.logger.log(
        `Chats comerciales reasignados para el chat ${chat.id.value}: ${connectedCommercials.length} comerciales disponibles`,
      );
    }
  }
}
