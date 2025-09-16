import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetChatByIdQuery } from './get-chat-by-id.query';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../domain/chat.repository';
import { ChatId } from '../../domain/value-objects/chat-id';
import { Result } from 'src/context/shared/domain/result';
import { Chat } from '../../domain/entities/chat.aggregate';
import { DomainError } from 'src/context/shared/domain/domain.error';

@QueryHandler(GetChatByIdQuery)
export class GetChatByIdQueryHandler
  implements IQueryHandler<GetChatByIdQuery>
{
  private readonly logger = new Logger(GetChatByIdQueryHandler.name);
  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly repository: IChatRepository,
  ) {}

  async execute(query: GetChatByIdQuery): Promise<Result<Chat, DomainError>> {
    this.logger.log(`Buscando chat ${query.chatId}`);
    const chatId = ChatId.create(query.chatId);
    return await this.repository.findById(chatId);
  }
}
