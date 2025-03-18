import { Logger } from '@nestjs/common';
import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { NewChatCommand } from '../commands/new-chat.command';
import { ConnectedEvent } from 'src/context/real-time-context/websocket/domain/events/connected.event';

@EventsHandler(ConnectedEvent)
export class CreateChatOnVisitorConnectedEventHandler
  implements IEventHandler<ConnectedEvent>
{
  private readonly logger = new Logger('RoomCreatedEventHandler');
  constructor(private readonly commandBus: CommandBus) {}
  async handle(event: ConnectedEvent) {
    this.logger.log(`Event ${event.constructor.name} handled`);
    if (event.role !== 'visitor') return;
    await this.commandBus.execute(new NewChatCommand(event.connectionId));
  }
}
