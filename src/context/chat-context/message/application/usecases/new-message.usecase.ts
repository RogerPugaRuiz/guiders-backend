import { Inject, Injectable } from '@nestjs/common';
import {
  MESSAGE_REPOSITORY,
  IMessageRepository,
} from '../../domain/repository';
import { Message } from '../../domain/message';
import { ChatId } from '../../domain/value-objects/chat-id';
import { SenderId } from '../../domain/value-objects/sender-id';
import { Content } from '../../domain/value-objects/content';
import { EventPublisher, QueryBus } from '@nestjs/cqrs';
import { ExistsChatQuery } from 'src/context/chat-context/chat/application/queries/exists-chat.query';
import { ExistsChatQueryHandlerResponse } from 'src/context/chat-context/chat/application/handlers/exists-chat.query-handler';

export interface NewMessageRequest {
  chatId: string;
  senderId: string;
  content: string;
}

@Injectable()
export class NewMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repository: IMessageRepository,
    private readonly publisher: EventPublisher,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(request: NewMessageRequest): Promise<void> {
    const message = Message.createNewMessage({
      chatId: ChatId.create(request.chatId),
      senderId: SenderId.create(request.senderId),
      content: Content.create(request.content),
    });

    await this.existsChat(message.chatId.value);
    await this.repository.save(message);
    this.publisher.mergeObjectContext(message).commit();
  }

  private async existsChat(chatId: string): Promise<void> {
    const { exists } = await this.queryBus.execute<
      ExistsChatQuery,
      ExistsChatQueryHandlerResponse
    >(new ExistsChatQuery(chatId));
    if (!exists) {
      throw new Error('Chat does not exists');
    }
  }
}
