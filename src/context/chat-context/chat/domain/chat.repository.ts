import { Criteria } from 'src/context/shared/domain/criteria';
import { Chat } from './chat';
import { ChatId } from './value-objects/chat-id';

export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface ChatRepository {
  save(chat: Chat): Promise<void>;
  findById(id: ChatId): Promise<Chat | undefined>;
  findOne(criteria: Criteria<Chat>): Promise<Chat | undefined>;
  find(criteria: Criteria<Chat>): Promise<Chat[]>;
  findAll(): Promise<Chat[]>;
}
