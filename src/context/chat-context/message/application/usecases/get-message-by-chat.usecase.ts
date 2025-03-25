import { Inject, Injectable } from '@nestjs/common';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from '../../domain/repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Message } from '../../domain/message';

export interface GetMessageByChatUseCaseRequest {
  chatId: string;
  limit: number;
  offset: number;
}

export interface GetMessageByChatUseCaseResponse {
  messages: any[];
}

@Injectable()
export class GetMessageByChatUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repository: IMessageRepository,
  ) {}

  async execute(
    request: GetMessageByChatUseCaseRequest,
  ): Promise<GetMessageByChatUseCaseResponse> {
    const { chatId, limit, offset } = request;
    const criteria = new Criteria<Message>()
      .addFilter('chatId', Operator.EQUALS, chatId)
      .orderByField('createdAt', 'DESC')
      .setLimit(limit)
      .setOffset(offset);
    const { messages } = await this.repository.find(criteria);
    return { messages };
  }
}
