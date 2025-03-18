import { Logger } from '@nestjs/common';
import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RoomCreatedEvent } from 'src/context/real-time-context/websocket/domain/events/room-created.event';
import { CreateChatCommand } from '../commands/create-chat.command';

@EventsHandler(RoomCreatedEvent)
export class RoomCreatedEventHandler
  implements IEventHandler<RoomCreatedEvent>
{
  private readonly logger = new Logger('RoomCreatedEventHandler');
  constructor(private readonly commandBus: CommandBus) {}
  async handle(event: RoomCreatedEvent) {
    this.logger.log(`Event ${event.constructor.name} handled`);
    switch (event.role) {
      case 'visitor':
        await this.commandBus.execute(new CreateChatCommand(event.userId));
        break;
      default:
        break;
    }
  }
}
