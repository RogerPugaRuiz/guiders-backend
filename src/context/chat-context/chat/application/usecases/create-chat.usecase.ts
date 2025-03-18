import { Inject, Injectable, Logger } from '@nestjs/common';
import { CHAT_REPOSITORY, ChatRepository } from '../../domain/chat.repository';
import { Chat } from '../../domain/chat';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';

export interface CreateChatUseCaseRequest {
  visitorId: string;
}

@Injectable()
export class CreateChatUseCase {
  private readonly logger = new Logger(CreateChatUseCase.name);
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly repository: ChatRepository,
  ) {}

  async execute(request: CreateChatUseCaseRequest): Promise<void> {
    const { visitorId } = request;
    const criteria = new Criteria<Chat>().addFilter(
      'visitorId',
      Operator.EQUALS,
      visitorId,
    );
    const findChat = await this.repository.findOne(criteria);
    if (findChat) {
      this.logger.warn(`Chat already exists for visitorId: ${visitorId}`);
      return;
    }

    this.logger.log(`Creating chat for visitorId: ${visitorId}`);
    const newChat = Chat.createNewChat({
      visitorId: VisitorId.create(visitorId),
    });
    await this.repository.save(newChat);
    this.logger.log(`Chat created with id: ${newChat.id.value}`);
  }
}
