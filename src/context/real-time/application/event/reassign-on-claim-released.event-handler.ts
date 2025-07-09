import { Logger } from '@nestjs/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ComercialClaimReleasedEvent } from 'src/context/conversations/chat/domain/claim/events/comercial-claim-released.event';
import { ChatCommercialsAssignedEvent } from '../../domain/events/chat-commercials-assigned.event';
import { CommercialAssignmentService } from '../../domain/commercial-assignment.service';

/**
 * Handler que maneja la liberación de claims
 * Cuando se libera un claim, reasigna comerciales disponibles al chat
 */
@EventsHandler(ComercialClaimReleasedEvent)
export class ReassignOnClaimReleasedEventHandler
  implements IEventHandler<ComercialClaimReleasedEvent>
{
  private readonly logger = new Logger(
    ReassignOnClaimReleasedEventHandler.name,
  );

  constructor(
    private readonly commercialAssignmentService: CommercialAssignmentService,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Maneja el evento ComercialClaimReleasedEvent reasignando comerciales disponibles
   * @param event Evento disparado cuando se libera un claim
   */
  async handle(event: ComercialClaimReleasedEvent): Promise<void> {
    const { chatId, comercialId } = event;

    this.logger.log(
      `Claim liberado para chat ${chatId} por comercial ${comercialId}, reasignando comerciales disponibles`,
    );

    try {
      // Obtener comerciales conectados de la misma compañía
      // Nota: Necesitamos obtener la companyId del chat para esto
      // Por ahora usaremos un placeholder hasta tener más información del chat
      const connectedCommercials =
        await this.commercialAssignmentService.getConnectedCommercials(
          'company-placeholder', // TODO: Obtener companyId real del chat
        );

      if (connectedCommercials.length === 0) {
        this.logger.warn(
          `No hay comerciales conectados para reasignar al chat ${chatId} después de liberar claim`,
        );
        return;
      }

      const commercialIds = connectedCommercials.map((c) => c.userId.value);

      // Publicar evento para reasignar comerciales al chat
      this.eventBus.publish(
        new ChatCommercialsAssignedEvent(chatId, commercialIds),
      );

      this.logger.log(
        `Chat ${chatId} reasignado a ${commercialIds.length} comerciales después de liberar claim`,
      );
    } catch (error) {
      this.logger.error(
        `Error al reasignar comerciales para chat ${chatId} después de liberar claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
