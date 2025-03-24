import { Inject, Injectable } from '@nestjs/common';
import { MESSAGE_REPOSITORY, MessageRepository } from '../../domain/repository';
import { Message } from '../../domain/message';
import { ChatId } from '../../domain/chat-id';
import { SenderId } from '../../domain/sender-id';
import { Content } from '../../domain/content';
import { EventPublisher, QueryBus } from '@nestjs/cqrs';

export interface NewMessageRequest {
  chatId: string;
  senderId: string;
  content: string;
}

@Injectable()
export class NewMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repository: MessageRepository,
    private readonly publisher: EventPublisher,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(request: NewMessageRequest): Promise<void> {
    const message = Message.createNewMessage({
      chatId: ChatId.create(request.chatId),
      senderId: SenderId.create(request.senderId),
      content: Content.create(request.content),
    });
    await this.repository.save(message);
    this.publisher.mergeObjectContext(message).commit();
  }
}
