import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from '../../../shared/domain/result';
import { DomainError } from '../../../shared/domain/domain.error';
import { AssignChatToCommercialCommand } from './assign-chat-to-commercial.command';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from '../../domain/chat.repository';
import { ChatId } from '../../domain/value-objects/chat-id';
import { CommercialId } from '../../domain/value-objects/commercial-id';
import { CommercialId as ServiceCommercialId } from '../../../commercial/domain/value-objects/commercial-id';
import {
  CommercialConnectionDomainService,
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
} from '../../../commercial/domain/commercial-connection.domain-service';

/**
 * Error específico para asignación manual
 */
export class AssignChatToCommercialError extends DomainError {
  constructor(message: string) {
    super(`Error en asignación manual: ${message}`);
    this.name = 'AssignChatToCommercialError';
  }
}

/**
 * Command Handler para asignación manual de chats a comerciales
 * Orquesta el proceso de asignación directa de un chat a un comercial específico
 */
@CommandHandler(AssignChatToCommercialCommand)
export class AssignChatToCommercialCommandHandler
  implements ICommandHandler<AssignChatToCommercialCommand>
{
  private readonly logger = new Logger(
    AssignChatToCommercialCommandHandler.name,
  );

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly commercialConnectionService: CommercialConnectionDomainService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    command: AssignChatToCommercialCommand,
  ): Promise<
    Result<{ assignedCommercialId: string }, AssignChatToCommercialError>
  > {
    try {
      this.logger.log(
        `Asignando manualmente chat ${command.chatId} al comercial ${command.commercialId}`,
      );

      // 1. Crear ChatId (puede lanzar excepción si es inválido)
      const chatId = ChatId.create(command.chatId);

      // 2. Buscar el chat
      const chatResult = await this.chatRepository.findById(chatId);
      if (chatResult.isErr()) {
        return err(
          new AssignChatToCommercialError(
            `Chat no encontrado: ${chatResult.error.message}`,
          ),
        );
      }

      const chat = chatResult.value;

      // 3. Validar que el chat puede ser asignado
      if (!chat.status.canBeAssigned()) {
        return err(
          new AssignChatToCommercialError(
            `El chat ${command.chatId} no puede ser asignado en estado ${chat.status.value}`,
          ),
        );
      }

      // 4. Crear CommercialId para validar que existe
      const commercialId = CommercialId.create(command.commercialId);

      // 5. Verificar que el comercial está online (opcional pero recomendado)
      const serviceCommercialId = ServiceCommercialId.create(
        command.commercialId,
      );
      const isOnline =
        await this.commercialConnectionService.isCommercialOnline(
          serviceCommercialId,
        );

      if (!isOnline) {
        this.logger.warn(
          `Asignando chat ${command.chatId} al comercial ${command.commercialId} que está offline`,
        );
      }

      // 6. Verificar carga de trabajo del comercial (opcional)
      const currentChats = await this.getCurrentChatCount(command.commercialId);
      if (currentChats >= 5) {
        // Límite configurable
        this.logger.warn(
          `Comercial ${command.commercialId} tiene ${currentChats} chats activos (límite: 5)`,
        );
      }

      // 7. Asignar el comercial al chat
      const assignedChat = chat.assignCommercial(commercialId.getValue());

      // 8. Persistir el chat actualizado
      const saveResult = await this.chatRepository.save(assignedChat);
      if (saveResult.isErr()) {
        return err(
          new AssignChatToCommercialError(
            `Error al guardar chat: ${saveResult.error.message}`,
          ),
        );
      }

      // 9. Publicar eventos
      const chatCtx = this.eventPublisher.mergeObjectContext(assignedChat);
      chatCtx.commit();

      this.logger.log(
        `Chat ${command.chatId} asignado manualmente exitosamente al comercial ${command.commercialId}`,
      );

      return ok({ assignedCommercialId: command.commercialId });
    } catch (error) {
      const errorMessage = `Error inesperado en asignación manual: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new AssignChatToCommercialError(errorMessage));
    }
  }

  /**
   * Obtiene el número de chats activos (ASSIGNED/ACTIVE) para un comercial
   */
  private async getCurrentChatCount(commercialId: string): Promise<number> {
    try {
      const commercialIdVO = CommercialId.create(commercialId);

      // Buscar chats activos asignados a este comercial
      const activeChatsResult = await this.chatRepository.findByCommercialId(
        commercialIdVO,
        { status: ['ASSIGNED', 'ACTIVE'] },
        undefined,
        1000, // Límite alto para contar todos
      );

      if (activeChatsResult.isOk()) {
        return activeChatsResult.value.total;
      } else {
        this.logger.warn(
          `Error al obtener chats del comercial ${commercialId}: ${activeChatsResult.error.message}`,
        );
        return 0;
      }
    } catch (error) {
      this.logger.warn(
        `Error al contar chats del comercial ${commercialId}: ${error}`,
      );
      return 0;
    }
  }
}
