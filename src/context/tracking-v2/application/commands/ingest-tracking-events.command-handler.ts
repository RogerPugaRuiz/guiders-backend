import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { IngestTrackingEventsCommand } from './ingest-tracking-events.command';
import { IngestEventsResponseDto } from '../dtos';
import { TrackingEventBufferService } from '../services';
import { TrackingEvent } from '../../domain/tracking-event.aggregate';
import {
  TrackingEventId,
  EventType,
  EventMetadata,
  EventOccurredAt,
  VisitorId,
  SessionId,
  TenantId,
  SiteId,
} from '../../domain/value-objects';

/**
 * Handler para el comando de ingesta de eventos
 * Convierte DTOs a agregados y los añade al buffer
 */
@CommandHandler(IngestTrackingEventsCommand)
export class IngestTrackingEventsCommandHandler
  implements
    ICommandHandler<IngestTrackingEventsCommand, IngestEventsResponseDto>
{
  private readonly logger = new Logger(IngestTrackingEventsCommandHandler.name);

  constructor(private readonly bufferService: TrackingEventBufferService) {}

  async execute(
    command: IngestTrackingEventsCommand,
  ): Promise<IngestEventsResponseDto> {
    const startTime = Date.now();
    const receivedCount = command.events.length;

    this.logger.log(
      `Procesando ingesta de ${receivedCount} eventos para tenant=${command.tenantId}, site=${command.siteId}`,
    );

    try {
      // Convertir DTOs a agregados de dominio
      const trackingEvents: TrackingEvent[] = command.events.map((eventDto) =>
        this.createTrackingEventFromDto(
          eventDto,
          command.tenantId,
          command.siteId,
        ),
      );

      // Obtener estadísticas del buffer antes de añadir
      const statsBefore = this.bufferService.getStats();

      // Añadir eventos al buffer (aquí se aplica throttling)
      const addResult = await this.bufferService.add(trackingEvents);

      if (addResult.isErr()) {
        this.logger.error(
          `Error al añadir eventos al buffer: ${addResult.error.message}`,
        );

        return {
          success: false,
          received: receivedCount,
          processed: 0,
          discarded: 0,
          aggregated: 0,
          message: `Error al procesar eventos: ${addResult.error.message}`,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Obtener estadísticas del buffer después de añadir
      const statsAfter = this.bufferService.getStats();

      // Calcular métricas
      const processed = receivedCount;
      const discarded = statsAfter.totalDiscarded - statsBefore.totalDiscarded;
      const aggregated = this.bufferService.size();

      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `Ingesta completada: ${receivedCount} recibidos, ${processed - discarded} procesados, ` +
          `${discarded} descartados (${((discarded / receivedCount) * 100).toFixed(1)}%), ` +
          `buffer=${aggregated}, tiempo=${processingTimeMs}ms`,
      );

      return {
        success: true,
        received: receivedCount,
        processed: processed - discarded,
        discarded,
        aggregated,
        message: 'Eventos procesados exitosamente',
        processingTimeMs,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error crítico en ingesta de eventos: ${message}`);

      return {
        success: false,
        received: receivedCount,
        processed: 0,
        discarded: 0,
        aggregated: 0,
        message: `Error crítico: ${message}`,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Crea un agregado TrackingEvent desde un DTO
   */
  private createTrackingEventFromDto(
    dto: any,
    tenantId: string,
    siteId: string,
  ): TrackingEvent {
    return TrackingEvent.create({
      id: TrackingEventId.random(),
      visitorId: new VisitorId(dto.visitorId),
      sessionId: new SessionId(dto.sessionId),
      tenantId: new TenantId(tenantId),
      siteId: new SiteId(siteId),
      eventType: new EventType(dto.eventType),
      metadata: new EventMetadata(dto.metadata || {}),
      occurredAt: dto.occurredAt
        ? EventOccurredAt.fromISOString(dto.occurredAt)
        : EventOccurredAt.now(),
    });
  }
}
