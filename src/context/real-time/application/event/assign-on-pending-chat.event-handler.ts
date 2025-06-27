import { Logger } from '@nestjs/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { NewChatCreatedEvent } from 'src/context/conversations/chat/domain/chat/events/new-chat-created.event';
import { ChatCommercialsAssignedEvent } from '../../domain/events/chat-commercials-assigned.event';
import { CommercialAssignmentService } from '../../domain/commercial-assignment.service';

@EventsHandler(NewChatCreatedEvent)
export class AssignOnPendingChatEventHandler implements IEventHandler {
  private readonly logger = new Logger(AssignOnPendingChatEventHandler.name);

  constructor(
    private readonly commercialAssignmentService: CommercialAssignmentService,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Maneja el evento NewChatCreatedEvent asignando comerciales al nuevo chat
   * @param event Evento disparado cuando se crea un nuevo chat
   */
  async handle(event: NewChatCreatedEvent): Promise<void> {
    const { id: chatId, companyId } = event.atributes.chat;

    // Utilizamos el servicio centralizado para obtener los comerciales conectados
    this.logger.log(
      `Asignando comerciales al chat ${chatId} de la empresa ${companyId}`,
    );
    const connCommercialList =
      await this.commercialAssignmentService.getConnectedCommercials(companyId);

    if (connCommercialList.length === 0) {
      this.logger.warn('No hay comerciales conectados para asignar al chat');
      return;
    }

    this.eventBus.publish(
      new ChatCommercialsAssignedEvent(
        chatId,
        connCommercialList.map((conn) => conn.userId.value),
      ),
    );

    this.logger.log(
      `Chat ${chatId} asignado a ${connCommercialList.length} comerciales`,
    );
  }
}
