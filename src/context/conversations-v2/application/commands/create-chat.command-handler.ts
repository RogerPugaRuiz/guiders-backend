import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateChatCommand } from './create-chat.command';
import { Chat } from '../../domain/entities/chat';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from '../../domain/chat.repository';
import { ChatId } from '../../domain/value-objects/chat-id';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error cuando el chat ya existe (para idempotencia)
 */
export class ChatAlreadyExistsError extends DomainError {
  constructor(chatId: string) {
    super(`Chat con ID ${chatId} ya existe`);
    this.name = 'ChatAlreadyExistsError';
  }
}

/**
 * Error interno en la creación de chat
 */
export class CreateChatInternalError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'CreateChatInternalError';
  }
}

/**
 * CommandHandler para crear chats en la V2
 * Maneja la lógica de negocio y la idempotencia
 */
@CommandHandler(CreateChatCommand)
export class CreateChatCommandHandler
  implements ICommandHandler<CreateChatCommand>
{
  private readonly logger = new Logger(CreateChatCommandHandler.name);

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: CreateChatCommand,
  ): Promise<Result<Chat, DomainError>> {
    try {
      this.logger.log(`Ejecutando creación de chat: ${command.chatId}`);

      const chatId = ChatId.create(command.chatId);

      // Verificar si el chat ya existe (idempotencia)
      const existingChatResult = await this.chatRepository.findById(chatId);
      if (existingChatResult.isOk()) {
        this.logger.log(
          `Chat ${command.chatId} ya existe, retornando existente`,
        );
        return ok(existingChatResult.value);
      }

      // Crear el nuevo chat usando el método de fábrica
      const chat = Chat.createPendingChat({
        visitorId: command.visitorId,
        visitorInfo: command.visitorInfo,
        availableCommercialIds: command.availableCommercialIds,
        priority: command.priority,
        metadata: command.metadata,
      });

      // Establecer el ID específico solicitado
      const chatWithSpecificId = Chat.fromPrimitives({
        ...chat.toPrimitives(),
        id: command.chatId,
      });

      // Aplicar contexto para eventos
      const chatAggregate =
        this.publisher.mergeObjectContext(chatWithSpecificId);

      // Guardar en el repositorio
      const saveResult = await this.chatRepository.save(chatAggregate);
      if (saveResult.isErr()) {
        return err(saveResult.error);
      }

      // Publicar eventos de dominio
      chatAggregate.commit();

      this.logger.log(`Chat ${command.chatId} creado exitosamente`);
      return ok(chatWithSpecificId);
    } catch (error) {
      this.logger.error(`Error al crear chat ${command.chatId}:`, error);
      return err(
        new CreateChatInternalError(
          `Error interno al crear chat: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
