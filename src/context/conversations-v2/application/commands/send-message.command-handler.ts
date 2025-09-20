import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { SendMessageCommand } from './send-message.command';
import { Inject, Logger } from '@nestjs/common';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../domain/chat.repository';
import {
  MESSAGE_V2_REPOSITORY,
  IMessageRepository,
} from '../../domain/message.repository';
import { Message } from '../../domain/entities/message.aggregate';
import { ChatId } from '../../domain/value-objects/chat-id';
import { MessageResponseDto } from '../dtos/message-response.dto';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

@CommandHandler(SendMessageCommand)
export class SendMessageCommandHandler
  implements ICommandHandler<SendMessageCommand, MessageResponseDto>
{
  private readonly logger = new Logger(SendMessageCommandHandler.name);

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(MESSAGE_V2_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: SendMessageCommand): Promise<MessageResponseDto> {
    this.logger.log(
      `Ejecutando SendMessage para chat ${command.chatId} desde usuario ${command.senderId}`,
    );

    // Verificar que el chat existe
    const chatResult: Result<any, DomainError> =
      await this.chatRepository.findById(ChatId.create(command.chatId));

    if (chatResult.isErr()) {
      throw new Error(`Chat no encontrado: ${chatResult.error.message}`);
    }

    // Determinar si es primera respuesta del comercial
    const isFirstResponse = this.shouldMarkAsFirstResponse();

    // Crear el mensaje según el tipo
    let message: Message;

    if (command.messageData.attachment && command.messageData.type !== 'text') {
      // Mensaje con archivo adjunto
      message = Message.createFileMessage({
        chatId: command.chatId,
        senderId: command.senderId,
        fileName: command.messageData.attachment.fileName,
        attachment: command.messageData.attachment,
        isInternal: command.messageData.isInternal || false,
      });
    } else {
      // Mensaje de texto
      message = Message.createTextMessage({
        chatId: command.chatId,
        senderId: command.senderId,
        content: command.messageData.content,
        isInternal: command.messageData.isInternal || false,
        isFirstResponse,
      });
    }

    // Preparar el contexto del mensaje con eventos
    const messageAggregate = this.publisher.mergeObjectContext(message);

    // Guardar el mensaje
    const messageSaveResult =
      await this.messageRepository.save(messageAggregate);

    if (messageSaveResult.isErr()) {
      throw new Error(
        `Error al guardar el mensaje: ${messageSaveResult.error.message}`,
      );
    }

    // Disparar eventos del mensaje
    messageAggregate.commit();

    // Convertir a DTO de respuesta
    const messagePrimitives = message.toPrimitives();

    return {
      id: messagePrimitives.id,
      chatId: messagePrimitives.chatId,
      senderId: messagePrimitives.senderId,
      content: messagePrimitives.content,
      type: messagePrimitives.type,
      systemData: messagePrimitives.systemData,
      attachment: messagePrimitives.attachment,
      isInternal: messagePrimitives.isInternal,
      isFirstResponse: messagePrimitives.isFirstResponse,
      createdAt: messagePrimitives.createdAt.toISOString(),
      updatedAt: messagePrimitives.updatedAt.toISOString(),
    };
  }

  /**
   * Determina si debe marcarse como primera respuesta del comercial
   */
  private shouldMarkAsFirstResponse(): boolean {
    // TODO: Implementar lógica para determinar si es primera respuesta
    // Esto requeriría verificar:
    // 1. Si el sender es un comercial (no visitante)
    // 2. Si es el primer mensaje del comercial en este chat
    // Por ahora, asumimos que no es primera respuesta
    return false;
  }
}
