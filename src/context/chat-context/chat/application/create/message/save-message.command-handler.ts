import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { SaveMessageCommand } from './save-message.command';
import { err, okVoid, Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Inject, Logger } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../domain/chat/chat.repository';
import { ChatId } from '../../../domain/chat/value-objects/chat-id';
import {
  ChatCanNotSaveMessageError,
  ChatNotFoundError,
} from '../../../domain/chat/errors/errors';

@CommandHandler(SaveMessageCommand)
export class SaveMessageCommandHandler
  implements ICommandHandler<SaveMessageCommand, Result<void, DomainError>>
{
  private readonly logger = new Logger(SaveMessageCommandHandler.name);
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
  ) {}
  async execute(
    command: SaveMessageCommand,
  ): Promise<Result<void, DomainError>> {
    const { chatId, message, createdAt, senderId, id } = command;
    const optionalChat = await this.chatRepository.findById(
      ChatId.create(chatId),
    );
    if (optionalChat.isEmpty()) {
      return err(new ChatNotFoundError());
    }
    const { chat } = optionalChat.get();

    try {
      const updatedChat = chat.canAddMessage({
        chatId,
        content: message,
        createdAt,
        senderId,
        id,
      });
      const chatWithEvents = this.publisher.mergeObjectContext(updatedChat);
      await this.chatRepository.save(chatWithEvents);
      chatWithEvents.commit();
      this.logger.log('Chat updated with new message');
    } catch (error) {
      this.logger.error('Error saving message', error);
      return err(new ChatCanNotSaveMessageError());
    }
    return okVoid();
  }
}
