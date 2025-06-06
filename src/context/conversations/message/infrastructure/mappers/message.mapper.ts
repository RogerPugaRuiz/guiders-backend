import { MessageEntity } from 'src/context/conversations/message/infrastructure/entities/message.entity';
import { Message } from '../../domain/message';
import { ChatMessageEncryptorService } from 'src/context/conversations/chat/infrastructure/chat-message-encryptor.service';

export class MessageMapper {
  static async toEntity(
    message: Message,
    encryptor: ChatMessageEncryptorService,
  ): Promise<MessageEntity> {
    const entity = new MessageEntity();
    entity.id = message.id.value;
    entity.chatId = message.chatId.value;
    entity.senderId = message.senderId.value;
    entity.content = await encryptor.encrypt(message.content.value);
    entity.createdAt = message.createdAt.value;
    return entity;
  }

  static async toDomain(
    entity: MessageEntity,
    encryptor: ChatMessageEncryptorService,
  ): Promise<Message> {
    return Message.fromPrimitives({
      id: entity.id,
      chatId: entity.chatId,
      senderId: entity.senderId,
      content: await encryptor.decrypt(entity.content),
      createdAt: entity.createdAt,
    });
  }
}
