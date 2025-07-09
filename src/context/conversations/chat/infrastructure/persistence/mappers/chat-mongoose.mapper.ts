import { Chat } from '../../../domain/chat/chat';
import { ChatMongooseEntity } from '../entity/chat-mongoose.mongodb-entity';
import { ChatMessageEncryptorService } from '../../chat-message-encryptor.service';

/**
 * Mapper para convertir entre entidad MongoDB y dominio Chat
 * Maneja la conversión bidireccional con encriptación/desencriptación de mensajes
 */
export class ChatMongooseMapper {
  /**
   * Convierte una entidad de dominio Chat a entidad MongoDB
   */
  public static async toPersistence(
    chat: Chat,
    encryptor: ChatMessageEncryptorService,
  ): Promise<Partial<ChatMongooseEntity>> {
    return {
      id: chat.id.getValue(),
      companyId: chat.companyId.getValue(),
      participants: chat.participants.value.map((participant) => ({
        id: participant.id,
        name: participant.name,
        isCommercial: participant.isCommercial,
        isVisitor: participant.isVisitor,
        isOnline: participant.isOnline,
        isViewing: participant.isViewing,
        isTyping: participant.isTyping,
        isAnonymous: participant.isAnonymous,
        assignedAt: participant.assignedAt,
        lastSeenAt: participant.lastSeenAt || undefined,
      })),
      status: chat.status.value,
      lastMessage: chat.lastMessage
        ? await encryptor.encrypt(chat.lastMessage.value)
        : undefined,
      lastMessageAt: chat.lastMessageAt ? chat.lastMessageAt.value : undefined,
      createdAt: chat.createdAt.value,
    };
  }

  /**
   * Convierte una entidad MongoDB a entidad de dominio Chat
   */
  public static async toDomain(
    entity: ChatMongooseEntity,
    encryptor: ChatMessageEncryptorService,
  ): Promise<Chat> {
    // Validar que el chat tenga participantes según las reglas de dominio
    if (!entity.participants || entity.participants.length === 0) {
      throw new Error(
        `Chat ${entity.id} no tiene participantes. Un chat debe tener al menos un participante.`,
      );
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
        isViewing: participant.isViewing,
        isTyping: participant.isTyping,
        isAnonymous: participant.isAnonymous,
        assignedAt: participant.assignedAt,
        lastSeenAt: participant.lastSeenAt,
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
