import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from '../../../shared/domain/result';
import { DomainError } from '../../../shared/domain/domain.error';
import { AutoAssignChatCommand } from './auto-assign-chat.command';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from '../../domain/chat.repository';
import { ChatId } from '../../domain/value-objects/chat-id';
import { CommercialId } from '../../domain/value-objects/commercial-id';
import { CommercialId as ServiceCommercialId } from '../../../commercial/domain/value-objects/commercial-id';
import {
  ChatAutoAssignmentDomainService,
  CHAT_AUTO_ASSIGNMENT_DOMAIN_SERVICE,
  CommercialInfo,
  AssignmentCriteria,
  AssignmentStrategy,
} from '../../domain/services/chat-auto-assignment.domain-service';
import {
  CommercialConnectionDomainService,
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
} from '../../../commercial/domain/commercial-connection.domain-service';

/**
 * Error específico para auto-asignación
 */
export class AutoAssignChatError extends DomainError {
  constructor(message: string) {
    super(`Error en auto-asignación: ${message}`);
    this.name = 'AutoAssignChatError';
  }
}

/**
 * Command Handler para auto-asignación de chats
 * Orquesta el proceso de selección automática de comercial
 */
@CommandHandler(AutoAssignChatCommand)
export class AutoAssignChatCommandHandler
  implements ICommandHandler<AutoAssignChatCommand>
{
  private readonly logger = new Logger(AutoAssignChatCommandHandler.name);

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(CHAT_AUTO_ASSIGNMENT_DOMAIN_SERVICE)
    private readonly assignmentService: ChatAutoAssignmentDomainService,
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly commercialConnectionService: CommercialConnectionDomainService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    command: AutoAssignChatCommand,
  ): Promise<Result<{ assignedCommercialId: string }, AutoAssignChatError>> {
    try {
      // 1. Crear ChatId (puede lanzar excepción si es inválido)
      const chatId = ChatId.create(command.chatId);

      // 2. Buscar el chat
      const chatResult = await this.chatRepository.findById(chatId);
      if (chatResult.isErr()) {
        return err(
          new AutoAssignChatError(
            `Chat no encontrado: ${chatResult.error.message}`,
          ),
        );
      }

      const chat = chatResult.value;

      // 2. Validar que el chat puede ser asignado
      if (!chat.status.canBeAssigned()) {
        return err(
          new AutoAssignChatError(
            `El chat ${command.chatId} no puede ser asignado en estado ${chat.status.value}`,
          ),
        );
      }

      // 3. Obtener comerciales disponibles desde el sistema de heartbeat
      const availableCommercialIds = chat.availableCommercialIds.map((id) =>
        id.getValue(),
      );

      if (availableCommercialIds.length === 0) {
        return err(
          new AutoAssignChatError(
            'No hay comerciales disponibles para este chat',
          ),
        );
      }

      // 4. Obtener información actualizada de comerciales
      const commercialsInfo = await this.getCommercialsInfo(
        availableCommercialIds,
      );

      if (commercialsInfo.length === 0) {
        return err(
          new AutoAssignChatError(
            'No hay comerciales online disponibles en este momento',
          ),
        );
      }

      if (commercialsInfo.length === 0) {
        return err(
          new AutoAssignChatError(
            'No hay comerciales online disponibles para asignación',
          ),
        );
      }

      // 5. Configurar criterios de asignación
      const criteria: AssignmentCriteria = {
        strategy: command.strategy || AssignmentStrategy.WORKLOAD_BALANCED,
        requiredSkills: command.requiredSkills,
        maxWaitTimeSeconds: command.maxWaitTimeSeconds || 300, // 5 minutos por defecto
      };

      // 6. Seleccionar comercial usando el domain service
      const selectionResult = this.assignmentService.selectCommercial(
        commercialsInfo,
        criteria,
      );

      if (selectionResult.isErr()) {
        return err(
          new AutoAssignChatError(
            `Error en selección: ${selectionResult.error.message}`,
          ),
        );
      }

      const assignment = selectionResult.value;

      // 7. Asignar el comercial al chat
      const assignedChat = chat.assignCommercial(assignment.commercialId);

      // 8. Persistir el chat actualizado
      const saveResult = await this.chatRepository.save(assignedChat);
      if (saveResult.isErr()) {
        return err(
          new AutoAssignChatError(
            `Error al guardar chat: ${saveResult.error.message}`,
          ),
        );
      }

      // 9. Publicar eventos
      const chatCtx = this.eventPublisher.mergeObjectContext(assignedChat);
      chatCtx.commit();

      this.logger.log(
        `Chat ${command.chatId} auto-asignado exitosamente a comercial ${assignment.commercialId} usando estrategia ${assignment.strategy}`,
      );

      return ok({ assignedCommercialId: assignment.commercialId });
    } catch (error) {
      const errorMessage = `Error inesperado en auto-asignación: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new AutoAssignChatError(errorMessage));
    }
  }

  /**
   * Obtiene información actualizada de comerciales desde el sistema de heartbeat
   */
  private async getCommercialsInfo(
    commercialIds: string[],
  ): Promise<CommercialInfo[]> {
    const commercialsInfo: CommercialInfo[] = [];

    for (const commercialId of commercialIds) {
      try {
        // Obtener estado de conexión desde el servicio de heartbeat
        // Necesitamos crear el tipo correcto de CommercialId para el servicio de commercial
        const commercialIdForService = ServiceCommercialId.create(commercialId);
        const isOnline =
          await this.commercialConnectionService.isCommercialOnline(
            commercialIdForService,
          );

        if (isOnline) {
          // Obtener número de chats activos de este comercial
          const currentChats = await this.getCurrentChatCount(commercialId);

          // Obtener última actividad para scoring más preciso
          const lastActivity = await this.getLastActivity(
            commercialIdForService,
          );

          // TODO: En el futuro, obtener estos datos de un repositorio de comerciales
          const commercialInfo: CommercialInfo = {
            id: commercialId,
            name: `Commercial ${commercialId}`, // Temporal - obtener de user/comercial repo
            isOnline: true,
            currentChats: currentChats,
            maxChats: 5, // Temporal - obtener de configuración comercial
            skills: [], // Temporal - obtener del perfil del comercial
            priority: 1, // Temporal - obtener de configuración
            lastActivity: lastActivity,
          };

          commercialsInfo.push(commercialInfo);
        }
      } catch (error) {
        this.logger.warn(
          `Error al obtener info del comercial ${commercialId}: ${error}`,
        );
      }
    }

    return commercialsInfo;
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

  /**
   * Obtiene la última actividad de un comercial
   */
  private async getLastActivity(
    commercialId: ServiceCommercialId,
  ): Promise<Date | undefined> {
    try {
      const lastActivity =
        await this.commercialConnectionService.getLastActivity(commercialId);
      return lastActivity.value; // CommercialLastActivity es un ValueObject<Date>
    } catch (error) {
      this.logger.warn(
        `Error al obtener última actividad del comercial ${commercialId.value}: ${error}`,
      );
      return undefined;
    }
  }
}
