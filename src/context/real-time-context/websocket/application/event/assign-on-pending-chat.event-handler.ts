import { Inject, Logger } from '@nestjs/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { NewChatCreatedEvent } from 'src/context/chat-context/chat/domain/chat/events/new-chat-created.event';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from '../../domain/connection-user';
import { ConnectionRole } from '../../domain/value-objects/connection-role';
import { ChatCommercialsAssignedEvent } from '../../domain/events/chat-commercials-assigned.event';

@EventsHandler(NewChatCreatedEvent)
export class AssignOnPendingChatEventHandler implements IEventHandler {
  private readonly logger = new Logger(AssignOnPendingChatEventHandler.name);

  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: NewChatCreatedEvent): Promise<void> {
    const { atributes, timestamp } = event;

    const { chat, publisherId } = atributes;
    const { id: chatId, participants, status, createdAt } = chat;

    const connCommercialList = await this.getCommercialConnections();

    this.eventBus.publish(
      new ChatCommercialsAssignedEvent(
        chatId,
        connCommercialList.map((conn) => conn.userId.value),
      ),
    );

    this.logger.log(
      `Chat commercials assigned for chatId: ${chatId}, createdAt: ${createdAt!.toISOString()}, participants: ${JSON.stringify(participants)}, status: ${status}, timestamp: ${timestamp.toISOString()}`,
    );

    this.logger.log(connCommercialList);
  }

  async getCommercialConnections() {
    const criteria = new Criteria<ConnectionUser>().addFilter(
      'roles',
      Operator.IN,
      [ConnectionRole.COMMERCIAL],
    );

    const connCommercialList = await this.connectionRepository.find(criteria);

    if (connCommercialList.length === 0) {
      throw new Error('No commercial connections found');
    }

    return connCommercialList.filter((conn) =>
      conn.isConnected() ? conn : null,
    );
  }
}
