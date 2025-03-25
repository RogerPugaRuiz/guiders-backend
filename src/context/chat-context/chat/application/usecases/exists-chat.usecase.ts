import { Inject, Injectable } from '@nestjs/common';
import { CHAT_REPOSITORY, IChatRepository } from '../../domain/chat.repository';
import { ChatId } from '../../domain/value-objects/chat-id';

export interface ExistsChatUseCaseResponse {
  exists: boolean;
}

@Injectable()
export class ExistsChatUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly repository: IChatRepository,
  ) {}

  async execute(chatId: string): Promise<ExistsChatUseCaseResponse> {
    const chat = await this.repository.findById(ChatId.create(chatId));
    return { exists: !!chat };
  }
}
