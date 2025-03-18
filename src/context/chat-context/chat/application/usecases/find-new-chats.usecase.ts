import { Inject } from '@nestjs/common';
import { CHAT_REPOSITORY, ChatRepository } from '../../domain/chat.repository';
import { Chat, ChatPrimitives } from '../../domain/chat';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';

export interface FindNewChatsUseCaseResponse {
  chats: ChatPrimitives[];
}

export class FindNewChatsUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly repository: ChatRepository,
  ) {}

  async execute(): Promise<FindNewChatsUseCaseResponse> {
    const criteria = new Criteria<Chat>().addFilter(
      'status',
      Operator.EQUALS,
      'new',
    );
    const chats = await this.repository.find(criteria);
    return { chats: chats.map((chat) => chat.toPrimitives()) };
  }
}
