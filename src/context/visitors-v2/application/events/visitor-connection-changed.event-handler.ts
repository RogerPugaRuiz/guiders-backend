import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { VisitorConnectionChangedEvent } from '../../domain/events/visitor-connection-changed.event';
import { Inject, Logger } from '@nestjs/common';
import {
  VISITOR_CONNECTION_DOMAIN_SERVICE,
  VisitorConnectionDomainService,
} from '../../domain/visitor-connection.domain-service';
import {
  ConnectionStatus,
  VisitorConnectionVO,
} from '../../domain/value-objects/visitor-connection';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';

@EventsHandler(VisitorConnectionChangedEvent)
export class SyncConnectionOnVisitorConnectionChangedEventHandler
  implements IEventHandler<VisitorConnectionChangedEvent>
{
  private readonly logger = new Logger(
    SyncConnectionOnVisitorConnectionChangedEventHandler.name,
  );
  constructor(
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: VisitorConnectionDomainService,
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async handle(event: VisitorConnectionChangedEvent) {
    try {
      const { visitorId: rawId, newConnection } = event.attributes;
      const visitorId = new VisitorId(rawId);
      const newStatus = newConnection as ConnectionStatus;
      const vo = new VisitorConnectionVO(newStatus);

      // 1. Sincronizar con Redis (cache de performance)
      if (newStatus === ConnectionStatus.OFFLINE) {
        await this.connectionService.removeConnection(visitorId);
      } else {
        await this.connectionService.setConnectionStatus(visitorId, vo);
      }

      // 2. Persistir en MongoDB (source of truth)
      const visitorResult = await this.visitorRepository.findById(visitorId);
      if (visitorResult.isOk()) {
        const visitor = visitorResult.unwrap();
        // El visitante ya tiene el estado actualizado porque el agregado
        // lo modificó antes de emitir este evento
        const updateResult = await this.visitorRepository.update(visitor);
        if (updateResult.isErr()) {
          this.logger.error(
            `Error persistiendo estado de conexión en MongoDB: ${updateResult.error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error sincronizando estado de conexión: ${error.message}`,
      );
    }
  }
}
