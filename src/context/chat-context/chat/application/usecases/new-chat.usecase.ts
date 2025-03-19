import { Inject, Injectable, Logger } from '@nestjs/common';
import { CHAT_REPOSITORY, ChatRepository } from '../../domain/chat.repository';
import { Chat } from '../../domain/chat';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { EventPublisher } from '@nestjs/cqrs';

export interface NewChatUseCaseRequest {
  visitorId: string;
}

@Injectable()
export class NewChatUseCase {
  private readonly logger = new Logger(NewChatUseCase.name);
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly repository: ChatRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(request: NewChatUseCaseRequest): Promise<void> {
    const { visitorId } = request;
    const criteria = new Criteria<Chat>().addFilter(
      'visitorId',
      Operator.EQUALS,
      visitorId,
    );
    const findChat = await this.repository.findOne(criteria);

    await findChat.fold(
      async () => this.createChat(visitorId),
      async (chat) => this.alreadyExists(chat),
    );
  }

  private async alreadyExists(chat: Chat): Promise<void> {
    this.logger.log(`Chat already exists with id: ${chat.id.value}`);
    return Promise.resolve();
  }

  private async createChat(visitorId: string): Promise<void> {
    this.logger.log(`Creating chat for visitorId: ${visitorId}`);
    const newChat = Chat.createNewChat({
      visitorId: VisitorId.create(visitorId),
    });
    await this.repository.save(newChat);
    this.publisher.mergeObjectContext(newChat).commit();
    this.logger.log(`Chat created with id: ${newChat.id.value}`);
    return;
  }
}
