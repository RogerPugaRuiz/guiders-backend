import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { CreateChatWithMessageCommand } from './create-chat-with-message.command';
import { Inject } from '@nestjs/common';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../domain/chat.repository';
import {
  MESSAGE_V2_REPOSITORY,
  IMessageRepository,
} from '../../domain/message.repository';
import { Chat } from '../../domain/entities/chat.aggregate';
import { Message } from '../../domain/entities/message.aggregate';
import { ChatMetadata } from '../../domain/value-objects/chat-metadata';
import { Result } from 'src/context/shared/domain/result';
import {
  ChatQueueConfigService,
  CHAT_QUEUE_CONFIG_SERVICE,
} from '../../domain/services/chat-queue-config.service';

@CommandHandler(CreateChatWithMessageCommand)
export class CreateChatWithMessageCommandHandler
  implements
    ICommandHandler<
      CreateChatWithMessageCommand,
      { chatId: string; messageId: string; position: number }
    >
{
  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(MESSAGE_V2_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    @Inject(CHAT_QUEUE_CONFIG_SERVICE)
    private readonly queueConfigService: ChatQueueConfigService,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: CreateChatWithMessageCommand,
  ): Promise<{ chatId: string; messageId: string; position: number }> {
    // Determinar si usar cola o asignación directa
    const defaultPriority = 'NORMAL'; // Prioridad por defecto
    const shouldUseQueue = this.queueConfigService.shouldUseQueue(
      'new-chat', // chatId temporal para la evaluación
      defaultPriority,
    );

    // Crear el chat con configuración apropiada
    let chat = Chat.createPendingChat({
      visitorId: command.visitorId,
      visitorInfo: command.visitorInfo || {},
      availableCommercialIds: [], // Se asignarán comerciales disponibles según la lógica de negocio
      priority: defaultPriority,
      metadata: command.metadata
        ? ChatMetadata.fromPrimitives(command.metadata).toPrimitives()
        : undefined,
      // Solo auto-asignar si el modo cola está desactivado Y no hay commercialId especificado
      autoAssign: !shouldUseQueue && !command.commercialId,
      autoAssignOptions:
        !shouldUseQueue && !command.commercialId
          ? {
              strategy: 'WORKLOAD_BALANCED',
              maxWaitTimeSeconds: this.queueConfigService.getMaxQueueWaitTime(),
            }
          : undefined,
    });

    // Si viene un commercialId, asignar el chat directamente
    if (command.commercialId) {
      chat = chat.assignCommercial(command.commercialId);
    }

    // Preparar el contexto con eventos
    const chatAggregate = this.publisher.mergeObjectContext(chat);

    // Guardar el chat
    const chatSaveResult = await this.chatRepository.save(chatAggregate);
    if (chatSaveResult.isErr()) {
      throw new Error(
        `Error al crear el chat: ${chatSaveResult.error.message}`,
      );
    }

    // Crear el primer mensaje
    let message: Message;

    if (
      command.firstMessage.attachment &&
      command.firstMessage.type !== 'text'
    ) {
      // Mensaje con archivo adjunto
      message = Message.createFileMessage({
        chatId: chat.id.getValue(),
        senderId: command.senderId, // Usar senderId del command (puede ser visitor o commercial)
        fileName: command.firstMessage.attachment.fileName,
        attachment: command.firstMessage.attachment,
        isInternal: false,
      });
    } else {
      // Mensaje de texto
      message = Message.createTextMessage({
        chatId: chat.id.getValue(),
        senderId: command.senderId, // Usar senderId del command (puede ser visitor o commercial)
        content: command.firstMessage.content,
        isInternal: false,
        isFirstResponse: false, // Esto es el primer mensaje, no la primera respuesta
      });
    }

    // Preparar el contexto del mensaje con eventos
    const messageAggregate = this.publisher.mergeObjectContext(message);

    // Guardar el mensaje
    const messageSaveResult =
      await this.messageRepository.save(messageAggregate);
    if (messageSaveResult.isErr()) {
      // Si falla el mensaje, deberíamos hacer rollback del chat
      // Por ahora lanzamos error, pero en un entorno de producción
      // deberías usar una transacción distribuida o patrón Saga
      throw new Error(
        `Error al crear el primer mensaje: ${messageSaveResult.error.message}`,
      );
    }

    // Calcular posición en la cola (solo si el chat está pendiente)
    let position = 0;
    if (!command.commercialId) {
      // Solo calcular posición si el chat está PENDING
      const positionResult: Result<number, any> =
        await this.chatRepository.countPendingCreatedBefore(
          chat.createdAt,
          chat.metadata.isPresent()
            ? chat.metadata.get().getDepartment()
            : undefined,
        );
      position = positionResult.isOk() ? positionResult.value + 1 : 1;
    }

    // Confirmar eventos de dominio
    chatAggregate.commit();
    messageAggregate.commit();

    return {
      chatId: chat.id.getValue(),
      messageId: message.id.getValue(),
      position,
    };
  }
}
