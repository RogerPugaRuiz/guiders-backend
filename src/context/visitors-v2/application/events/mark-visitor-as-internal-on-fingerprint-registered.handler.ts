import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CommercialFingerprintRegisteredEvent } from '../../../commercial/domain/events/commercial-fingerprint-registered.event';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';

/**
 * Event Handler que marca visitantes como internos cuando se registra un fingerprint de comercial
 *
 * Patrón: MarkVisitorAsInternalOnCommercialFingerprintRegistered
 *
 * Cuando un comercial registra su fingerprint:
 * 1. Busca todos los visitantes que tengan ese fingerprint
 * 2. Marca cada uno como interno (isInternal: true)
 * 3. Actualiza en el repositorio
 *
 * Esto permite identificar automáticamente visitas de empleados/comerciales
 * en el sistema y excluirlas de métricas de visitantes reales si es necesario
 */
@EventsHandler(CommercialFingerprintRegisteredEvent)
export class MarkVisitorAsInternalOnCommercialFingerprintRegisteredEventHandler
  implements IEventHandler<CommercialFingerprintRegisteredEvent>
{
  private readonly logger = new Logger(
    MarkVisitorAsInternalOnCommercialFingerprintRegisteredEventHandler.name,
  );

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async handle(event: CommercialFingerprintRegisteredEvent): Promise<void> {
    try {
      const { commercialId, fingerprint } = event;

      this.logger.log(
        `📌 Procesando fingerprint registrado: comercial=${commercialId}, fingerprint=${fingerprint}`,
      );

      // 1. Buscar todos los visitantes con este fingerprint
      const visitorsResult =
        await this.visitorRepository.findByFingerprint(fingerprint);

      if (visitorsResult.isErr()) {
        this.logger.error(
          `Error al buscar visitantes por fingerprint: ${visitorsResult.error.message}`,
        );
        return;
      }

      const visitors = visitorsResult.unwrap();

      if (visitors.length === 0) {
        this.logger.log(
          `ℹ️  No se encontraron visitantes con fingerprint ${fingerprint}`,
        );
        return;
      }

      this.logger.log(
        `🔍 Encontrados ${visitors.length} visitantes con fingerprint ${fingerprint}`,
      );

      // 2. Marcar cada visitante como interno y actualizar
      let markedCount = 0;
      let alreadyInternalCount = 0;

      for (const visitor of visitors) {
        if (visitor.getIsInternal()) {
          // Ya está marcado como interno
          alreadyInternalCount++;
          continue;
        }

        // Marcar como interno (retorna nueva instancia inmutable)
        const updatedVisitor = visitor.markAsInternal();

        // Actualizar en el repositorio
        const updateResult =
          await this.visitorRepository.update(updatedVisitor);

        if (updateResult.isErr()) {
          this.logger.error(
            `Error al actualizar visitante ${visitor.getId().getValue()}: ${updateResult.error.message}`,
          );
          continue;
        }

        markedCount++;
        this.logger.log(
          `✅ Visitante ${visitor.getId().getValue()} marcado como interno`,
        );
      }

      this.logger.log(
        `🎯 Resumen: ${markedCount} visitantes marcados como internos, ${alreadyInternalCount} ya eran internos`,
      );
    } catch (error) {
      this.logger.error(
        `Error procesando evento CommercialFingerprintRegisteredEvent: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
