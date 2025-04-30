import { ChatEntity } from '../chat.entity';
import { Chat } from '../../domain/chat/chat';

export class ChatMapper {
  public static toPersistence(chat: Chat): ChatEntity {
    const entity = new ChatEntity();
    entity.id = chat.id.getValue();
    entity.participants = chat.participants.value.map((participant) => ({
      id: participant.id,
      name: participant.name,
      isCommercial: participant.isCommercial,
      isVisitor: participant.isVisitor,
      isOnline: participant.isOnline,
      assignedAt: participant.assignedAt,
      lastSeenAt: participant.lastSeenAt,
      isViewing: participant.isViewing,
      isTyping: participant.isTyping,
    }));
    entity.status = chat.status.value;
    entity.lastMessage = chat.lastMessage ? chat.lastMessage.value : null;
    entity.lastMessageAt = chat.lastMessageAt ? chat.lastMessageAt.value : null;
    entity.createdAt = chat.createdAt.value;
    return entity;
  }

  public static toDomain(entity: ChatEntity): Chat {
    return Chat.fromPrimitives({
      id: entity.id,
      participants: entity.participants
        ? entity.participants.map((participant) => ({
            id: participant.id,
            name: participant.name,
            isCommercial: participant.isCommercial,
            isVisitor: participant.isVisitor,
            isOnline: participant.isOnline,
            assignedAt: participant.assignedAt,
            lastSeenAt: participant.lastSeenAt,
            isViewing: participant.isViewing,
            isTyping: participant.isTyping,
          }))
        : [],
      status: entity.status,
      lastMessage: entity.lastMessage,
      lastMessageAt: entity.lastMessageAt,
      createdAt: entity.createdAt,
    });
  }
}
