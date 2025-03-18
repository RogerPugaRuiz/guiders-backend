import { DbChatEntity } from './db-chat.entity';
import { Chat } from '../domain/chat';

export class ChatMapper {
  public static toPersistence(chat: Chat): DbChatEntity {
    const entity = new DbChatEntity();
    entity.id = chat.id.getValue();
    entity.commercialId = chat.commercialId
      .map((id) => id.getValue())
      .getOrNull();
    entity.visitorId = chat.visitorId.getValue();
    entity.status = chat.status.getValue();
    entity.lastMessage = chat.lastMessage
      .map((message) => message.getValue())
      .getOrNull();
    entity.lastMessageAt = chat.lastMessageAt
      .map((date) => date.getValue())
      .getOrNull();
    return entity;
  }

  public static toDomain(entity: DbChatEntity): Chat {
    return Chat.fromPrimitives({
      id: entity.id,
      commercialId: entity.commercialId,
      visitorId: entity.visitorId,
      status: entity.status,
      lastMessage: entity.lastMessage,
      lastMessageAt: entity.lastMessageAt,
    });
  }
}
