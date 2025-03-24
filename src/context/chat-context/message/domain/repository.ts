import { Criteria } from 'src/context/shared/domain/criteria';
import { Optional } from 'src/context/shared/domain/optional';
import { Message } from './message';

export interface MessageRepository {
  save(message: Message): Promise<void>;
  find(criteria: Criteria<Message>): Promise<Message[]>;
  findOne(criteria: Criteria<Message>): Promise<Optional<Message>>;
}
