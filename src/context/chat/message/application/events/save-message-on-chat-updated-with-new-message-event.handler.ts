import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from '../../domain/message.repository';
import { Message } from '../../domain/message';
import { ChatUpdatedWithNewMessageEvent } from 'src/context/chat-context/chat/domain/chat/events/chat-updated-with-new-message.event';
import { ChatId } from 'src/context/chat-context/chat/domain/chat/value-objects/chat-id';
import { Content } from '../../domain/value-objects/content';
import { SenderId } from '../../domain/value-objects/sender-id';
import { CreatedAt } from '../../domain/value-objects/created-at';
import { MessageId } from '../../domain/value-objects/message-id';

@EventsHandler(ChatUpdatedWithNewMessageEvent)
export class SaveMessageOnChatUpdatedWithNewMessageEventHandler
  implements IEventHandler<ChatUpdatedWithNewMessageEvent>
{
  private readonly logger = new Logger(
    SaveMessageOnChatUpdatedWithNewMessageEventHandler.name,
  );
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
  ) {}

  async handle(event: ChatUpdatedWithNewMessageEvent): Promise<void> {
    this.logger.log('Handling ChatUpdatedWithNewMessageEvent');
    // Extraemos los datos del mensaje del evento
    const { message } = event.params.attributes;
    // Creamos la entidad Message a partir de los primitivos
    const messageEntity = Message.create({
      id: MessageId.create(message.id),
      chatId: ChatId.create(message.chatId),
      content: Content.create(message.content),
      senderId: SenderId.create(message.senderId),
      createdAt: CreatedAt.create(message.createdAt),
    });
    this.logger.log('Saving message to repository');
    // Guardamos el mensaje en el repositorio
    await this.messageRepository.save(messageEntity);
    // Nota: Manejo de errores y logging pueden agregarse según necesidades del dominio
  }
}
