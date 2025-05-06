import { Criteria } from 'src/context/shared/domain/criteria';
import { Chat } from './chat';
import { Optional } from 'src/context/shared/domain/optional';
import { ChatId } from './value-objects/chat-id';

export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface IChatRepository {
  save(chat: Chat): Promise<void>;
  findById(id: ChatId): Promise<Optional<{ chat: Chat }>>;
  findOne(criteria: Criteria<Chat>): Promise<Optional<{ chat: Chat }>>;
  find(criteria: Criteria<Chat>): Promise<{ chats: Chat[] }>;
  findAll(): Promise<{ chats: Chat[] }>;
}
