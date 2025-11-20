import {
  CommandHandler,
  ICommandHandler,
  EventPublisher,
  EventBus,
} from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UpdateSessionHeartbeatCommand } from './update-session-heartbeat.command';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../domain/visitor-v2.repository';
import { SessionId } from '../../domain/value-objects/session-id';
import {
  VisitorConnectionDomainService,
  VISITOR_CONNECTION_DOMAIN_SERVICE,
} from '../../domain/visitor-connection.domain-service';
import { VisitorLastActivity } from '../../domain/value-objects/visitor-last-activity';
import { ActivityType } from '../dtos/update-session-heartbeat.dto';
import {
  LEAD_SCORING_SERVICE,
  LeadScoringService,
} from '../../../lead-scoring/domain/lead-scoring.service';
import {
  TRACKING_EVENT_REPOSITORY,
  TrackingEventRepository,
} from '../../../tracking-v2/domain/tracking-event.repository';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../../conversations-v2/domain/chat.repository';
import { VisitorId as ChatVisitorId } from '../../../conversations-v2/domain/value-objects/visitor-id';
import { VisitorBecameHighIntentEvent } from '../../domain/events/visitor-became-high-intent.event';
import { VisitorV2 } from '../../domain/visitor-v2.aggregate';

@CommandHandler(UpdateSessionHeartbeatCommand)
export class UpdateSessionHeartbeatCommandHandler
  implements ICommandHandler<UpdateSessionHeartbeatCommand, void>
{
  private readonly logger = new Logger(
    UpdateSessionHeartbeatCommandHandler.name,
  );

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: VisitorConnectionDomainService,
    @Inject(LEAD_SCORING_SERVICE)
    private readonly leadScoringService: LeadScoringService,
    @Inject(TRACKING_EVENT_REPOSITORY)
    private readonly trackingRepository: TrackingEventRepository,
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateSessionHeartbeatCommand): Promise<void> {
    try {
      this.logger.log(`Actualizando heartbeat de sesión: ${command.sessionId}`);

      // Crear value object para sessionId
      const sessionId = new SessionId(command.sessionId);

      // Buscar visitante por sessionId
      const visitorResult =
        await this.visitorRepository.findBySessionId(sessionId);

      if (visitorResult.isErr()) {
        this.logger.warn(
          `No se encontró visitante para la sesión: ${command.sessionId}`,
        );
        throw new Error(`Sesión no encontrada: ${command.sessionId}`);
      }

      const visitor = visitorResult.value;

      // Validación adicional si se proporciona visitorId
      if (command.visitorId && visitor.getId().value !== command.visitorId) {
        this.logger.warn(
          `VisitorId no coincide: esperado ${command.visitorId}, encontrado ${visitor.getId().value}`,
        );
        throw new Error('Sesión no válida para este visitante');
      }

      // Actualizar el heartbeat de la sesión activa
      visitor.updateSessionActivity();

      const visitorId = visitor.getId();
      const now = VisitorLastActivity.now();

      // IMPORTANTE: SIEMPRE actualizar lastActivity (mantiene sesión viva)
      await this.connectionService.updateLastActivity(visitorId, now);

      // CRÍTICO: Solo actualizar lastUserActivity si es interacción real del usuario
      // El scheduler de inactividad verifica lastUserActivity para detectar inactividad
      const isUserInteraction =
        command.activityType === ActivityType.USER_INTERACTION;

      if (isUserInteraction) {
        // Interacción real del usuario → actualizar lastUserActivity
        await this.connectionService.updateLastUserActivity(visitorId, now);
        this.logger.debug(
          `LastActivity y LastUserActivity actualizados en Redis para visitante: ${visitorId.value} (user-interaction)`,
        );
      } else {
        // Heartbeat automático → solo actualiza lastActivity (mantiene sesión)
        this.logger.debug(
          `Solo LastActivity actualizado en Redis para visitante: ${visitorId.value} (heartbeat automático)`,
        );
      }

      // REACTIVACIÓN CONDICIONAL: Solo reactiva si es una interacción del usuario
      // - Si activityType es 'user-interaction': reactiva a ONLINE si está AWAY/OFFLINE
      // - Si activityType es 'heartbeat' o undefined: solo mantiene sesión, NO reactiva

      if (isUserInteraction) {
        try {
          const currentStatus =
            await this.connectionService.getConnectionStatus(visitorId);

          if (currentStatus.isAway()) {
            this.logger.log(
              `Reactivando visitante ${visitorId.value} desde AWAY a ONLINE (user-interaction)`,
            );
            visitor.returnFromAway();
          } else if (currentStatus.isOffline()) {
            this.logger.log(
              `Reactivando visitante ${visitorId.value} desde OFFLINE a ONLINE (user-interaction)`,
            );
            visitor.goOnline();
          }
        } catch {
          // Si no existe estado en Redis (primera vez), simplemente continuar
          // El estado se sincronizará en la próxima conexión explícita
          this.logger.debug(
            `Estado de conexión no encontrado para visitante ${visitorId.value}, continuando sin reactivación`,
          );
        }
      } else {
        // Heartbeat automático: solo actualiza timestamp, no cambia estado de conexión
        this.logger.debug(
          `Heartbeat automático para visitante ${visitorId.value}, no se modifica el estado de conexión`,
        );
      }

      // Persistir cambios con eventos
      const visitorContext = this.publisher.mergeObjectContext(visitor);
      const saveResult = await this.visitorRepository.save(visitorContext);

      if (saveResult.isErr()) {
        this.logger.error(
          'Error al guardar visitante:',
          saveResult.error.message,
        );
        throw new Error('Error al actualizar heartbeat de sesión');
      }

      // Commit eventos
      if (visitorContext && typeof visitorContext.commit === 'function') {
        visitorContext.commit();
      } else {
        this.logger.warn(
          'EventPublisher no disponible, eventos no serán despachados',
        );
      }

      // Calcular lead score y emitir evento si es "hot" (solo en user-interaction)
      if (isUserInteraction) {
        await this.checkAndEmitHighIntentEvent(visitor);
      }

      this.logger.log(
        `Heartbeat actualizado exitosamente para sesión: ${command.sessionId}`,
      );
    } catch (error) {
      this.logger.error('Error al actualizar heartbeat de sesión:', error);
      throw error;
    }
  }

  private async checkAndEmitHighIntentEvent(visitor: VisitorV2): Promise<void> {
    try {
      const visitorId = visitor.getId();
      const sessions = visitor.getSessions();

      // Obtener estadísticas de tracking
      const trackingStatsResult =
        await this.trackingRepository.getStatsByVisitor(visitorId);

      let totalPagesVisited = 0;
      if (trackingStatsResult.isOk()) {
        const stats = trackingStatsResult.unwrap();
        totalPagesVisited = stats.eventsByType['PAGE_VIEW'] || 0;
      }

      // Obtener chats del visitante
      const chatVisitorId = ChatVisitorId.create(visitorId.getValue());
      const chatsResult =
        await this.chatRepository.findByVisitorId(chatVisitorId);
      const totalChats = chatsResult.isOk() ? chatsResult.unwrap().length : 0;

      // Calcular estadísticas
      const totalSessions = sessions.length;
      const totalTimeConnectedMs = sessions.reduce(
        (total, session) => total + session.getDuration(),
        0,
      );

      // Calcular lead score
      const leadScore = this.leadScoringService.calculateScore({
        totalSessions,
        totalPagesVisited,
        totalTimeConnectedMs,
        totalChats,
        lifecycle: visitor.getLifecycle().getValue(),
      });

      const scorePrimitives = leadScore.toPrimitives();

      // Solo emitir si el tier es "hot" y no hemos notificado ya
      if (scorePrimitives.tier === 'hot') {
        // Usar Redis para verificar si ya notificamos
        const notifiedKey = `high-intent-notified:${visitorId.getValue()}`;
        const alreadyNotified =
          await this.connectionService.hasKey(notifiedKey);

        if (!alreadyNotified) {
          // Marcar como notificado (expira en 24h)
          await this.connectionService.setKeyWithExpiry(
            notifiedKey,
            'true',
            86400,
          );

          // Emitir evento
          const event = new VisitorBecameHighIntentEvent({
            visitorId: visitorId.getValue(),
            tenantId: visitor.getTenantId().getValue(),
            siteId: visitor.getSiteId().getValue(),
            fingerprint: visitor.getFingerprint().getValue(),
            leadScore: scorePrimitives,
            timestamp: new Date().toISOString(),
          });

          this.eventBus.publish(event);

          this.logger.log(
            `🔥 Emitido VisitorBecameHighIntentEvent para visitante ${visitorId.getValue()} (score: ${scorePrimitives.score})`,
          );
        }
      }
    } catch (error) {
      // No fallar el heartbeat si falla el cálculo de lead score
      this.logger.warn(
        `Error al verificar high-intent: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
