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
  ) {}

  async handle(event: VisitorConnectionChangedEvent) {
    try {
      const { visitorId: rawId, newConnection } = event.attributes;
      const visitorId = new VisitorId(rawId);
      const newStatus = newConnection as ConnectionStatus;
      const vo = new VisitorConnectionVO(newStatus);
      if (newStatus === ConnectionStatus.OFFLINE) {
        await this.connectionService.removeConnection(visitorId);
        return;
      }
      await this.connectionService.setConnectionStatus(visitorId, vo);
    } catch {
      this.logger.error('Error sincronizando estado de conexión');
    }
  }
}
