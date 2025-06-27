import { Inject, Logger } from '@nestjs/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CommercialConnectedEvent } from '../../domain/events/commercial-connected.event';
import { CommercialAssignmentService } from '../../domain/commercial-assignment.service';
import { ChatCommercialsAssignedEvent } from '../../domain/events/chat-commercials-assigned.event';
import { ConnectionRole } from '../../domain/value-objects/connection-role';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations/chat/domain/chat/chat.repository';
import { Operator } from 'src/context/shared/domain/criteria';
import { CriteriaBuilder } from 'src/context/shared/domain/criteria-builder';
import { Chat } from 'src/context/conversations/chat/domain/chat/chat';
import { Status } from 'src/context/conversations/chat/domain/chat/value-objects/status';

@EventsHandler(CommercialConnectedEvent)
export class RecalculateAssignmentOnCommercialConnectedEventHandler
  implements IEventHandler<CommercialConnectedEvent>
{
  private readonly logger = new Logger(
    RecalculateAssignmentOnCommercialConnectedEventHandler.name,
  );
  private readonly criteriaBuilder = new CriteriaBuilder<Chat>();

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
    this.logger.log(
      `Manejando evento CommercialConnectedEvent para el usuario ${event.connection.userId}`,
    );

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

    this.logger.log(`Company ID: ${event.connection.companyId}`);

    // Obtenemos los chats pendientes de la misma compañía del comercial conectado
    const pendingChatsCriteria = this.criteriaBuilder
      .addFilter('status', Operator.EQUALS, Status.PENDING.value)
      .addFilter('companyId', Operator.EQUALS, event.connection.companyId)
      .build();

    const pendingChatsCriteria2 = this.criteriaBuilder
      .addFilter('status', Operator.EQUALS, Status.PENDING.value)
      .build();

    const { chats: pendingChats } =
      await this.chatRepository.find(pendingChatsCriteria);

    const { chats: pendingChats2 } = await this.chatRepository.find(
      pendingChatsCriteria2,
    );

    this.logger.log(
      `Chats pendientes encontrados: ${pendingChats2.map((chat) => chat.companyId.value).join(', ')}`,
    );

    // log para mostrar la lista de chats pendientes
    this.logger.log(
      `Chats pendientes encontrados: ${pendingChats.map((chat) => chat.companyId.value).join(', ')}`,
    );

    // Si no hay chats pendientes, no hay nada que hacer
    if (pendingChats.length === 0) {
      this.logger.log(
        `No hay chats pendientes para asignar en la compañía ${event.connection.companyId}`,
      );
      return;
    }
    // Obtenemos los comerciales conectados
    const connectedCommercials =
      await this.commercialAssignmentService.getConnectedCommercials(
        event.connection.companyId,
      );

    // Si no hay comerciales conectados, no hay nada que hacer
    if (connectedCommercials.length === 0) {
      this.logger.warn(
        `No hay comerciales conectados para asignar a los chats de la compañía ${event.connection.companyId}`,
      );
      return;
    }

    this.logger.log(
      `Encontrados ${pendingChats.length} chats pendientes y ${connectedCommercials.length} comerciales conectados para la compañía ${event.connection.companyId}`,
    );

    // Para cada chat pendiente, publicamos el evento de asignación de comerciales
    for (const chat of pendingChats) {
      this.eventBus.publish(
        new ChatCommercialsAssignedEvent(
          chat.id.value,
          connectedCommercials.map((conn) => conn.userId.value),
        ),
      );

      this.logger.log(
        `Chat ${chat.id.value} reasignado: ${connectedCommercials.length} comerciales disponibles de la compañía ${event.connection.companyId}`,
      );
    }
  }
}
