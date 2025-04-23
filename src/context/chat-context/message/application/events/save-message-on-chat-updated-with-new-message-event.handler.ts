import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from '../../domain/message.repository';
import { Message } from '../../domain/message';
import { ChatUpdatedWithNewMessageEvent } from 'src/context/chat-context/chat/domain/chat/events/chat-updated-with-new-message.event';

@EventsHandler(ChatUpdatedWithNewMessageEvent)
export class SaveMessageOnChatUpdatedWithNewMessageEventHandler
  implements IEventHandler<ChatUpdatedWithNewMessageEvent>
{
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
  ) {}

  async handle(event: ChatUpdatedWithNewMessageEvent): Promise<void> {
    // Extraemos los datos del mensaje del evento
    const { message } = event.params.attributes;
    // Creamos la entidad Message a partir de los primitivos
    const messageEntity = Message.fromPrimitives(message);
    // Guardamos el mensaje en el repositorio
    await this.messageRepository.save(messageEntity);
    // Nota: Manejo de errores y logging pueden agregarse según necesidades del dominio
  }
}
