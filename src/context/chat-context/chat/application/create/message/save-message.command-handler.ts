import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SaveMessageCommand } from './save-message.command';
import { err, okVoid, Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from 'src/context/chat-context/message/domain/message.repository';
import { Inject } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../domain/chat/chat.repository';
import { ChatId } from '../../../domain/chat/value-objects/chat-id';
import {
  ChatCanNotSaveMessageError,
  ChatNotFoundError,
} from '../../../domain/chat/errors/errors';
import { Message } from 'src/context/chat-context/message/domain/message';
import { SenderId } from 'src/context/chat-context/message/domain/value-objects/sender-id';
import { Content } from 'src/context/chat-context/message/domain/value-objects/content';
import { CreatedAt } from 'src/context/chat-context/message/domain/value-objects/created-at';

@CommandHandler(SaveMessageCommand)
export class SaveMessageCommandHandler
  implements ICommandHandler<SaveMessageCommand, Result<void, DomainError>>
{
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}
  async execute(
    command: SaveMessageCommand,
  ): Promise<Result<void, DomainError>> {
    const { chatId, message, createdAt, senderId } = command;
    const optionalChat = await this.chatRepository.findById(
      ChatId.create(chatId),
    );
    if (optionalChat.isEmpty()) {
      return err(new ChatNotFoundError());
    }
    const { chat } = optionalChat.get();

    const messageObj = Message.create({
      chatId: ChatId.create(chatId),
      senderId: SenderId.create(senderId),
      content: Content.create(message),
      createdAt: CreatedAt.create(createdAt),
    });
    try {
      const updatedChat = chat.canAddMessage(messageObj);
      await this.chatRepository.save(updatedChat);
      await this.messageRepository.save(messageObj);
    } catch (error) {
      return err(new ChatCanNotSaveMessageError());
    }
    return okVoid();
  }
}
