import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { RequestAgentCommand } from './request-agent.command';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from '../../domain/chat.repository';
import { ChatId } from '../../domain/value-objects/chat-id';

/**
 * Error específico para solicitud de agente
 */
export class RequestAgentError extends DomainError {
  constructor(message: string) {
    super(`Error en solicitud de agente: ${message}`);
    this.name = 'RequestAgentError';
  }
}

/**
 * Command handler que procesa la solicitud de atención de un agente
 *
 * Flujo:
 * 1. Busca el chat por ID
 * 2. Valida que el visitante sea el dueño del chat
 * 3. Cambia la prioridad a URGENT mediante requestAgent()
 * 4. Persiste los cambios
 * 5. Emite AgentRequestedEvent para notificar a los comerciales
 */
@CommandHandler(RequestAgentCommand)
export class RequestAgentCommandHandler
  implements
    ICommandHandler<RequestAgentCommand, Result<void, RequestAgentError>>
{
  private readonly logger = new Logger(RequestAgentCommandHandler.name);

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    command: RequestAgentCommand,
  ): Promise<Result<void, RequestAgentError>> {
    try {
      this.logger.log(
        `Procesando solicitud de agente para chat ${command.chatId} del visitante ${command.visitorId}`,
      );

      // 1. Buscar el chat
      const chatId = ChatId.create(command.chatId);
      const chatResult = await this.chatRepository.findById(chatId);

      if (chatResult.isErr()) {
        this.logger.error(`Chat no encontrado: ${command.chatId}`);
        return err(new RequestAgentError('Chat no encontrado'));
      }

      const chat = chatResult.value;

      // 2. Ejecutar la lógica de dominio (incluye validación de visitante)
      let updatedChat;
      try {
        updatedChat = chat.requestAgent(command.visitorId, command.source);
      } catch (domainError) {
        const errorMessage =
          domainError instanceof Error
            ? domainError.message
            : String(domainError);
        this.logger.error(`Error de dominio: ${errorMessage}`);
        return err(new RequestAgentError(errorMessage));
      }

      // 3. Persistir cambios
      const updateResult = await this.chatRepository.update(updatedChat);
      if (updateResult.isErr()) {
        this.logger.error(
          `Error al actualizar chat: ${updateResult.error.message}`,
        );
        return err(
          new RequestAgentError(
            `Error al actualizar chat: ${updateResult.error.message}`,
          ),
        );
      }

      // 4. Publicar eventos (AgentRequestedEvent)
      const chatCtx = this.eventPublisher.mergeObjectContext(updatedChat);
      chatCtx.commit();

      this.logger.log(
        `Solicitud de agente procesada exitosamente para chat ${command.chatId}`,
      );

      return ok(undefined);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error inesperado: ${errorMessage}`);
      return err(new RequestAgentError(errorMessage));
    }
  }
}
