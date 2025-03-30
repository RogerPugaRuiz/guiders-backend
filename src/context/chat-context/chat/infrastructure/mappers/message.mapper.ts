import { MessageEntity } from 'src/context/chat-context/message/infrastructure/entities/message.entity';
import { Message } from '../../domain/message/message';

export class MessageMapper {
  static toEntity(message: Message): MessageEntity {
    const entity = new MessageEntity();
    entity.id = message.id.value;
    entity.chatId = message.chatId.value;
    entity.senderId = message.senderId.value;
    entity.content = message.content.value;
    entity.createdAt = message.createdAt.value;
    return entity;
  }

  static toDomain(entity: MessageEntity): Message {
    return Message.fromPrimitives({
      id: entity.id,
      chatId: entity.chatId,
      senderId: entity.senderId,
      content: entity.content,
      createdAt: entity.createdAt,
    });
  }
}
