import { Criteria } from 'src/context/shared/domain/criteria';
import { Optional } from 'src/context/shared/domain/optional';
import { Message } from './message';

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');

export interface MessageRepository {
  save(message: Message): Promise<void>;
  find(criteria: Criteria<Message>): Promise<Message[]>;
  findOne(criteria: Criteria<Message>): Promise<Optional<Message>>;
}
