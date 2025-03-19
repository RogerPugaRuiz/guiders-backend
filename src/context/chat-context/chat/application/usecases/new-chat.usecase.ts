import { Inject, Injectable, Logger } from '@nestjs/common';
import { CHAT_REPOSITORY, ChatRepository } from '../../domain/chat.repository';
import { Chat } from '../../domain/chat';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';

export interface NewChatUseCaseRequest {
  visitorId: string;
}

@Injectable()
export class NewChatUseCase {
  private readonly logger = new Logger(NewChatUseCase.name);
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly repository: ChatRepository,
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
      async () => this.alreadyExists(visitorId),
      async (chat) => {
        return await this.createChat(chat.visitorId);
      },
    );
  }

  private async alreadyExists(visitorId: string): Promise<void> {
    this.logger.warn(`Chat already exists for visitorId: ${visitorId}`);
    return Promise.resolve();
  }

  private async createChat(visitorId: VisitorId): Promise<void> {
    this.logger.log(`Creating chat for visitorId: ${visitorId.value}`);
    const newChat = Chat.createNewChat({
      visitorId,
    });
    await this.repository.save(newChat);
    this.logger.log(`Chat created with id: ${newChat.id.value}`);
    return;
  }
}
