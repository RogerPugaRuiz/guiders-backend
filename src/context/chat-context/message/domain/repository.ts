import { Criteria } from 'src/context/shared/domain/criteria';
import { Optional } from 'src/context/shared/domain/optional';
import { Message } from './message';

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');

export interface IMessageRepository {
  save(message: Message): Promise<void>;
  find(criteria: Criteria<Message>): Promise<{ messages: Message[] }>;
  findOne(criteria: Criteria<Message>): Promise<Optional<{ message: Message }>>;
}
