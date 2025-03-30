import { Criteria } from 'src/context/shared/domain/criteria';
import { Message } from './message';
import { Optional } from 'src/context/shared/domain/optional';
import { Result } from 'src/context/shared/domain/result';
import { SaveMessageError } from './errors';
import { ChatId } from '../chat/value-objects/chat-id';

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');

export interface IMessageRepository {
  save(message: Message): Promise<Result<void, SaveMessageError>>;
  findOne(criteria: Criteria<Message>): Promise<Optional<{ message: Message }>>;
  find(criteria: Criteria<Message>): Promise<{ messages: Message[] }>;
  findPaginated(
    chatId: ChatId,
    index: string,
    limit: number,
  ): Promise<{ messages: Message[] }>;
}
