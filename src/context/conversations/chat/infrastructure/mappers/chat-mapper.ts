import { ChatEntity } from '../chat.entity';
import { Chat } from '../../domain/chat/chat';
import { ChatMessageEncryptorService } from '../chat-message-encryptor.service';

export class ChatMapper {
  public static async toPersistence(
    chat: Chat,
    encryptor: ChatMessageEncryptorService,
  ): Promise<ChatEntity> {
    const entity = new ChatEntity();
    entity.id = chat.id.getValue();
    entity.companyId = chat.companyId.getValue();
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
      isAnonymous: participant.isAnonymous,
    }));
    entity.status = chat.status.value;
    entity.lastMessage = chat.lastMessage
      ? await encryptor.encrypt(chat.lastMessage.value)
      : null;
    entity.lastMessageAt = chat.lastMessageAt ? chat.lastMessageAt.value : null;
    entity.createdAt = chat.createdAt.value;
    return entity;
  }

  public static async toDomain(
    entity: ChatEntity,
    encryptor: ChatMessageEncryptorService,
  ): Promise<Chat> {
    // Validar que el chat tenga participantes según las reglas de dominio
    if (!entity.participants || entity.participants.length === 0) {
      throw new Error(`Chat ${entity.id} no tiene participantes. Un chat debe tener al menos un participante.`);
    }

    return Chat.fromPrimitives({
      id: entity.id,
      companyId: entity.companyId,
      participants: entity.participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        isCommercial: participant.isCommercial,
        isVisitor: participant.isVisitor,
        isOnline: participant.isOnline,
        assignedAt: participant.assignedAt,
        lastSeenAt: participant.lastSeenAt,
        isViewing: participant.isViewing,
        isTyping: participant.isTyping,
        isAnonymous: participant.isAnonymous,
      })),
      status: entity.status,
      lastMessage: entity.lastMessage
        ? await encryptor.decrypt(entity.lastMessage)
        : null,
      lastMessageAt: entity.lastMessageAt,
      createdAt: entity.createdAt,
    });
  }
}
