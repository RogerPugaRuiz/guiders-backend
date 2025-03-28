import { Criteria } from 'src/context/shared/domain/criteria';
import { Chat } from './chat/chat';
import { Optional } from 'src/context/shared/domain/optional';
import { ChatId } from './chat/value-objects/chat-id';
import { MessageId } from './message/value-objects/message-id';
import { Message } from './message/message';

export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface IChatRepository {
  save(chat: Chat): Promise<void>;
  saveMessage(message: Message): Promise<void>;
  findById(id: ChatId): Promise<Optional<{ chat: Chat }>>;
  findOne(criteria: Criteria<Chat>): Promise<Optional<{ chat: Chat }>>;
  find(criteria: Criteria<Chat>): Promise<{ chats: Chat[] }>;
  findAll(): Promise<{ chats: Chat[] }>;
  findChatMessage(
    messageId: MessageId,
  ): Promise<Optional<{ message: Message }>>;
  findChatMessages(
    criteria: Criteria<Message>,
  ): Promise<{ messages: Message[] }>;
}
