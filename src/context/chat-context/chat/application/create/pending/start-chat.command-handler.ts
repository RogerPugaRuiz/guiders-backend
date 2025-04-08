import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { StartChatCommand } from './start-chat.command';
import { Inject } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../domain/chat/chat.repository';
import { Chat } from '../../../domain/chat/chat';

@CommandHandler(StartChatCommand)
export class StartChatCommandHandler
  implements ICommandHandler<StartChatCommand>
{
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
  ) {}
  async execute(command: StartChatCommand): Promise<any> {
    const { chatId, visitorId, visitorName, timestamp } = command;

    const chat = Chat.createPendingChat({
      chatId,
      visitor: {
        id: visitorId,
        name: visitorName,
      },
      createdAt: timestamp,
    });

    const chatAggregate = this.publisher.mergeObjectContext(chat);
    chatAggregate.commit();
    await this.chatRepository.save(chatAggregate);
  }
}
