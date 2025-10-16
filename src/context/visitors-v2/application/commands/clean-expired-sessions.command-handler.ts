import { ICommandHandler, CommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CleanExpiredSessionsCommand } from './clean-expired-sessions.command';
import {
  SESSION_MANAGEMENT_DOMAIN_SERVICE,
  SessionManagementDomainService,
} from '../../domain/session-management.domain-service';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { Result, ok, err } from '../../../shared/domain/result';
import { VisitorV2PersistenceError } from '../../infrastructure/persistence/impl/visitor-v2-mongo.repository.impl';

/**
 * Command Handler para limpiar sesiones expiradas de visitantes
 * Utiliza el servicio de dominio para aplicar la lógica de timeout
 */
@CommandHandler(CleanExpiredSessionsCommand)
export class CleanExpiredSessionsCommandHandler
  implements ICommandHandler<CleanExpiredSessionsCommand>
{
  private readonly logger = new Logger(CleanExpiredSessionsCommandHandler.name);

  constructor(
    @Inject(SESSION_MANAGEMENT_DOMAIN_SERVICE)
    private readonly sessionManagementService: SessionManagementDomainService,
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: CleanExpiredSessionsCommand,
  ): Promise<Result<{ cleanedCount: number }, VisitorV2PersistenceError>> {
    this.logger.debug('Iniciando limpieza de sesiones expiradas');

    try {
      // Obtener visitantes con sesiones activas para verificar
      const visitorsResult =
        await this.visitorRepository.findWithActiveSessions({
          limit: command.batchSize || 100,
          tenantId: command.tenantId,
        });

      if (visitorsResult.isErr()) {
        return err(visitorsResult.error);
      }

      const visitors = visitorsResult.value;
      let cleanedCount = 0;

      for (const visitor of visitors) {
        // Verificar si tiene sesiones expiradas
        if (this.sessionManagementService.hasExpiredSessions(visitor)) {
          // Limpiar sesiones expiradas
          const cleanedVisitor =
            this.sessionManagementService.cleanExpiredSessions(visitor);

          // Merge con EventPublisher para publicar eventos
          const visitorContext =
            this.publisher.mergeObjectContext(cleanedVisitor);

          // Guardar el visitante actualizado
          const saveResult = await this.visitorRepository.save(visitorContext);
          if (saveResult.isErr()) {
            this.logger.warn(
              `Error al guardar visitante ${visitor.getId().getValue()}: ${saveResult.error.message}`,
            );
            continue;
          }

          // Commit eventos de sesiones cerradas
          if (visitorContext && typeof visitorContext.commit === 'function') {
            visitorContext.commit();
          }

          cleanedCount++;
          this.logger.debug(
            `Limpiadas sesiones expiradas para visitante: ${visitor.getId().getValue()}`,
          );
        }
      }

      this.logger.log(
        `Limpieza completada. Visitantes procesados: ${cleanedCount}`,
      );

      return ok({ cleanedCount });
    } catch (error) {
      this.logger.error('Error durante la limpieza de sesiones', error);
      return err(
        new VisitorV2PersistenceError(
          'Error durante la limpieza de sesiones expiradas',
        ),
      );
    }
  }
}
