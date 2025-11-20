import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from '../../../shared/domain/result';
import { ChatAutoAssignmentRequestedEvent } from '../../domain/events/chat-auto-assignment-requested.event';
import { AutoAssignChatCommand } from '../commands/auto-assign-chat.command';
import { AutoAssignChatError } from '../commands/auto-assign-chat.command-handler';
import { AssignmentStrategy } from '../../domain/services/chat-auto-assignment.domain-service';

/**
 * Event Handler para solicitudes de auto-asignación de chats
 *
 * Se ejecuta cuando un chat emite el evento ChatAutoAssignmentRequestedEvent
 * y dispara el comando AutoAssignChatCommand para procesar la asignación
 */
@EventsHandler(ChatAutoAssignmentRequestedEvent)
export class ProcessAutoAssignmentOnChatAutoAssignmentRequestedEventHandler
  implements IEventHandler<ChatAutoAssignmentRequestedEvent>
{
  private readonly logger = new Logger(
    ProcessAutoAssignmentOnChatAutoAssignmentRequestedEventHandler.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ChatAutoAssignmentRequestedEvent): Promise<void> {
    try {
      const autoAssignment = event.attributes.autoAssignment;

      this.logger.log(
        `🔄 Procesando solicitud de auto-asignación para chat: ${autoAssignment.chatId}`,
      );

      // Mapear estrategia desde string a enum si existe
      let strategy: AssignmentStrategy | undefined;
      if (autoAssignment.strategy) {
        strategy = Object.values(AssignmentStrategy).find(
          (s) => s === autoAssignment.strategy,
        );
      }

      // Crear y ejecutar comando de auto-asignación
      const command = new AutoAssignChatCommand({
        chatId: autoAssignment.chatId,
        strategy: strategy || AssignmentStrategy.WORKLOAD_BALANCED,
        requiredSkills: autoAssignment.requiredSkills,
        maxWaitTimeSeconds: autoAssignment.maxWaitTimeSeconds,
        reason: autoAssignment.reason,
      });

      const result: Result<
        { assignedCommercialId: string },
        AutoAssignChatError
      > = await this.commandBus.execute(command);

      if (result.isOk()) {
        this.logger.log(
          `✅ Auto-asignación exitosa para chat ${autoAssignment.chatId} → comercial ${result.value.assignedCommercialId}`,
        );
      } else {
        const errorMessage = result.error.message || 'Error desconocido';
        this.logger.error(
          `❌ Error en auto-asignación para chat ${autoAssignment.chatId}: ${errorMessage}`,
        );

        // En caso de error, podrías implementar fallbacks como:
        // - Reintentar con estrategia diferente
        // - Notificar a administradores
        // - Asignar manualmente a comercial por defecto

        this.handleAssignmentFailure(autoAssignment.chatId, errorMessage);
      }
    } catch (error) {
      const errorMessage = `Error inesperado procesando auto-asignación: ${
        error instanceof Error ? error.message : String(error)
      }`;

      this.logger.error(errorMessage);

      // Manejar error crítico
      this.handleCriticalError(
        event.attributes.autoAssignment.chatId,
        errorMessage,
      );
    }
  }

  /**
   * Maneja fallos en la asignación implementando estrategias de fallback
   */
  private handleAssignmentFailure(chatId: string, errorMessage: string): void {
    this.logger.warn(
      `🔄 Implementando fallback para chat ${chatId}: ${errorMessage}`,
    );

    // Fallback 1: Reintentar con estrategia RANDOM después de un delay
    setTimeout(() => {
      void (async () => {
        try {
          const fallbackCommand = new AutoAssignChatCommand({
            chatId,
            strategy: AssignmentStrategy.RANDOM,
            reason: 'fallback_after_failure',
          });

          const fallbackResult: Result<
            { assignedCommercialId: string },
            AutoAssignChatError
          > = await this.commandBus.execute(fallbackCommand);

          if (fallbackResult.isOk()) {
            this.logger.log(
              `✅ Fallback exitoso para chat ${chatId} → comercial ${fallbackResult.value.assignedCommercialId}`,
            );
          } else {
            const errorMessage =
              fallbackResult.error.message || 'Error desconocido';
            this.logger.error(
              `❌ Fallback también falló para chat ${chatId}: ${errorMessage}`,
            );
          }
        } catch (fallbackError) {
          this.logger.error(
            `Error en fallback para chat ${chatId}: ${fallbackError}`,
          );
        }
      })();
    }, 5000); // Reintento después de 5 segundos
  }

  /**
   * Maneja errores críticos del sistema
   */
  private handleCriticalError(chatId: string, errorMessage: string): void {
    this.logger.error(
      `🚨 Error crítico en auto-asignación para chat ${chatId}: ${errorMessage}`,
    );

    // Aquí podrías implementar:
    // - Notificación a administradores
    // - Logging en sistema de métricas
    // - Marcar chat para revisión manual
    // - Enviar a cola de reintento
  }
}
