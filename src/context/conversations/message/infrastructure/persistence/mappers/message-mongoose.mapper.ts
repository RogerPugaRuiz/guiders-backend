import { Message } from '../../../domain/message';
import { MessageId } from '../../../domain/value-objects/message-id';
import { Content } from '../../../domain/value-objects/content';
import { SenderId } from '../../../domain/value-objects/sender-id';
import { ChatId } from '../../../../chat/domain/chat/value-objects/chat-id';
import { CreatedAt } from '../../../domain/value-objects/created-at';
import { MessageMongooseEntity } from '../entity/message-mongoose.mongodb-entity';
import { ChatMessageEncryptorService } from '../../../../chat/infrastructure/chat-message-encryptor.service';

/**
 * Mapper para convertir entre la entidad de dominio Message y la entidad de MongoDB
 * Maneja el cifrado/descifrado del contenido de mensajes
 */
export class MessageMongooseMapper {
  /**
   * Convierte una entidad de MongoDB a entidad de dominio
   */
  static async toDomain(
    entity: MessageMongooseEntity,
    encryptor: ChatMessageEncryptorService,
  ): Promise<Message> {
    // Descifrar el contenido del mensaje
    const decryptedContent = await encryptor.decrypt(entity.content);

    return Message.create({
      id: MessageId.create(entity.id),
      content: Content.create(decryptedContent),
      senderId: SenderId.create(entity.sender),
      chatId: ChatId.create(entity.chatId),
      createdAt: CreatedAt.create(entity.timestamp),
    });
  }

  /**
   * Convierte una entidad de dominio a entidad de MongoDB
   */
  static async toMongoDB(
    message: Message,
    encryptor: ChatMessageEncryptorService,
  ): Promise<Partial<MessageMongooseEntity>> {
    // Cifrar el contenido del mensaje
    const encryptedContent = await encryptor.encrypt(message.content.value);

    return {
      id: message.id.value,
      content: encryptedContent,
      sender: message.senderId.value,
      chatId: message.chatId.value,
      timestamp: message.createdAt.value,
      isRead: false, // Valor por defecto
    };
  }
}
