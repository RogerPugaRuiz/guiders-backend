import { ICommandHandler, CommandHandler } from '@nestjs/cqrs';
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
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

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
  ) {}

  async execute(
    command: CleanExpiredSessionsCommand,
  ): Promise<Result<{ cleanedCount: number }, DomainError>> {
    this.logger.debug('Iniciando limpieza de sesiones expiradas');

    try {
      // Obtener visitantes con sesiones activas para verificar
      const visitorsResult =
        await this.visitorRepository.findWithActiveSessions({
          limit: command.batchSize || 100,
          tenantId: command.tenantId,
        });

      if (visitorsResult.isErr()) {
        return Result.err(visitorsResult.error);
      }

      const visitors = visitorsResult.value;
      let cleanedCount = 0;

      for (const visitor of visitors) {
        // Verificar si tiene sesiones expiradas
        if (this.sessionManagementService.hasExpiredSessions(visitor)) {
          // Limpiar sesiones expiradas
          const cleanedVisitor =
            this.sessionManagementService.cleanExpiredSessions(visitor);

          // Guardar el visitante actualizado
          const saveResult = await this.visitorRepository.save(cleanedVisitor);
          if (saveResult.isErr()) {
            this.logger.warn(
              `Error al guardar visitante ${visitor.getId().getValue()}: ${saveResult.error.message}`,
            );
            continue;
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

      return Result.ok({ cleanedCount });
    } catch (error) {
      this.logger.error('Error durante la limpieza de sesiones', error);
      return Result.err(
        new DomainError('Error durante la limpieza de sesiones expiradas'),
      );
    }
  }
}
