import { Criteria } from 'src/context/shared/domain/criteria';
import { Chat } from './chat';
import { ChatId } from './value-objects/chat-id';
import { Optional } from 'src/context/shared/domain/optional';

export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface IChatRepository {
  save(chat: Chat): Promise<void>;
  findById(id: ChatId): Promise<Chat | undefined>;
  findOne(criteria: Criteria<Chat>): Promise<Optional<Chat>>;
  find(criteria: Criteria<Chat>): Promise<Chat[]>;
  findAll(): Promise<Chat[]>;
}
