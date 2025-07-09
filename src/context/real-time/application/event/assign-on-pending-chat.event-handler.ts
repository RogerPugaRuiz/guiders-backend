import { Logger } from '@nestjs/common';
import {
  EventBus,
  EventsHandler,
  IEventHandler,
  CommandBus,
} from '@nestjs/cqrs';
import { NewChatCreatedEvent } from 'src/context/conversations/chat/domain/chat/events/new-chat-created.event';
import { ChatCommercialsAssignedEvent } from '../../domain/events/chat-commercials-assigned.event';
import { CommercialAssignmentService } from '../../domain/commercial-assignment.service';
import { CreateChatClaimCommand } from 'src/context/conversations/chat/application/commands/create-chat-claim/create-chat-claim.command';

@EventsHandler(NewChatCreatedEvent)
export class AssignOnPendingChatEventHandler implements IEventHandler {
  private readonly logger = new Logger(AssignOnPendingChatEventHandler.name);

  constructor(
    private readonly commercialAssignmentService: CommercialAssignmentService,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
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

    const commercialIds = connCommercialList.map((conn) => conn.userId.value);

    this.eventBus.publish(
      new ChatCommercialsAssignedEvent(chatId, commercialIds),
    );

    if (commercialIds.length === 0) {
      this.logger.warn('No hay comerciales conectados para asignar al chat');
    } else {
      this.logger.log(
        `Chat ${chatId} asignado a ${commercialIds.length} comerciales`,
      );

      // NUEVA FUNCIONALIDAD: Auto-claim para chats de alta prioridad
      await this.handleAutoClaimForHighPriorityChat(
        event,
        chatId,
        commercialIds,
      );
    }
  }

  /**
   * Maneja la creación automática de claims para chats de alta prioridad
   * @param event Evento del chat creado
   * @param chatId ID del chat
   * @param commercialIds IDs de comerciales disponibles
   */
  private async handleAutoClaimForHighPriorityChat(
    event: NewChatCreatedEvent,
    chatId: string,
    commercialIds: string[],
  ): Promise<void> {
    try {
      // Por ahora, deshabilitar auto-claims hasta implementar lógica de prioridad
      // TODO: Implementar lógica de prioridad basada en reglas de negocio
      const isHighPriority = false; // Temporalmente deshabilitado

      if (!isHighPriority) {
        this.logger.debug(
          `Auto-claims deshabilitado temporalmente para chat ${chatId}`,
        );
        return;
      }

      if (commercialIds.length === 0) {
        this.logger.warn(
          `Chat ${chatId} es de alta prioridad pero no hay comerciales disponibles para claim automático`,
        );
        return;
      }

      // Crear claim automático para el primer comercial disponible
      const selectedCommercialId = commercialIds[0];

      await this.commandBus.execute(
        new CreateChatClaimCommand(chatId, selectedCommercialId),
      );

      this.logger.log(
        `Claim automático creado para chat de alta prioridad ${chatId} - Comercial: ${selectedCommercialId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al crear claim automático para chat ${chatId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
