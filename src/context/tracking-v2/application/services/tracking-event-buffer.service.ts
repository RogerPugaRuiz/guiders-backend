import { Injectable, Logger, Inject, OnModuleDestroy } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';
import { TrackingEvent } from '../../domain/tracking-event.aggregate';
import {
  TrackingEventRepository,
  TRACKING_EVENT_REPOSITORY,
} from '../../domain/tracking-event.repository';
import {
  EventThrottlingDomainService,
  EventAggregationDomainService,
} from '../../domain/services';
import { Result, okVoid, err } from '../../../shared/domain/result';
import { DomainError } from '../../../shared/domain/domain.error';
import { BufferFlushError } from '../../domain/errors/tracking.error';

/**
 * Configuración del buffer
 */
export interface BufferConfig {
  maxSize: number; // Tamaño máximo antes de flush automático
  flushIntervalMs: number; // Intervalo de flush en milisegundos
  enableThrottling: boolean; // Habilitar throttling
  enableAggregation: boolean; // Habilitar agregación
}

/**
 * Estadísticas del buffer
 */
export interface BufferStats {
  currentSize: number;
  totalReceived: number;
  totalFlushed: number;
  totalDiscarded: number;
  lastFlushAt: Date | null;
  flushCount: number;
}

/**
 * Servicio de aplicación para gestionar el buffer de eventos en memoria
 * Implementa batching con flush automático por tamaño o tiempo
 */
@Injectable()
export class TrackingEventBufferService implements OnModuleDestroy {
  private readonly logger = new Logger(TrackingEventBufferService.name);
  private buffer: TrackingEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private stats: BufferStats = {
    currentSize: 0,
    totalReceived: 0,
    totalFlushed: 0,
    totalDiscarded: 0,
    lastFlushAt: null,
    flushCount: 0,
  };

  private readonly config: BufferConfig = {
    maxSize: parseInt(process.env.TRACKING_BUFFER_MAX_SIZE || '500', 10),
    flushIntervalMs: parseInt(
      process.env.TRACKING_BUFFER_FLUSH_INTERVAL_MS || '5000',
      10,
    ),
    enableThrottling: process.env.TRACKING_ENABLE_THROTTLING !== 'false',
    enableAggregation: process.env.TRACKING_ENABLE_AGGREGATION !== 'false',
  };

  constructor(
    @Inject(TRACKING_EVENT_REPOSITORY)
    private readonly repository: TrackingEventRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly throttlingService: EventThrottlingDomainService,
    private readonly aggregationService: EventAggregationDomainService,
  ) {
    this.startFlushTimer();
    this.logger.log(
      `Buffer inicializado con maxSize=${this.config.maxSize}, ` +
        `flushInterval=${this.config.flushIntervalMs}ms, ` +
        `throttling=${this.config.enableThrottling}, ` +
        `aggregation=${this.config.enableAggregation}`,
    );
  }

  /**
   * Añade eventos al buffer
   * Si alcanza el tamaño máximo, hace flush automático
   */
  async add(events: TrackingEvent[]): Promise<Result<void, DomainError>> {
    if (events.length === 0) {
      return okVoid();
    }

    this.logger.debug(
      `Añadiendo ${events.length} eventos al buffer (tamaño actual: ${this.buffer.length})`,
    );

    let processedEvents = events;
    this.stats.totalReceived += events.length;

    // Aplicar throttling si está habilitado
    if (this.config.enableThrottling) {
      const originalSize = processedEvents.length;
      processedEvents = this.throttlingService.apply(processedEvents);
      const discarded = originalSize - processedEvents.length;
      this.stats.totalDiscarded += discarded;

      if (discarded > 0) {
        this.logger.debug(
          `Throttling descartó ${discarded} eventos (${((discarded / originalSize) * 100).toFixed(1)}%)`,
        );
      }
    }

    // Añadir eventos al buffer
    this.buffer.push(...processedEvents);
    this.stats.currentSize = this.buffer.length;

    // Flush automático si alcanza el tamaño máximo
    if (this.buffer.length >= this.config.maxSize) {
      this.logger.log(
        `Buffer alcanzó tamaño máximo (${this.buffer.length}/${this.config.maxSize}), ejecutando flush automático`,
      );
      return await this.flush();
    }

    return okVoid();
  }

  /**
   * Hace flush del buffer, guardando todos los eventos pendientes
   */
  async flush(): Promise<Result<void, DomainError>> {
    if (this.buffer.length === 0) {
      this.logger.debug('Buffer vacío, omitiendo flush');
      return okVoid();
    }

    const eventsToFlush = [...this.buffer];
    this.buffer = [];
    this.stats.currentSize = 0;

    const startTime = Date.now();
    this.logger.log(`Iniciando flush de ${eventsToFlush.length} eventos`);

    try {
      let finalEvents = eventsToFlush;

      // Aplicar agregación si está habilitada
      if (this.config.enableAggregation) {
        const aggregationResult =
          this.aggregationService.aggregate(eventsToFlush);
        finalEvents = aggregationResult.aggregated;

        this.logger.debug(
          `Agregación redujo eventos de ${aggregationResult.originalCount} a ${aggregationResult.aggregatedCount} ` +
            `(${aggregationResult.reductionRate.toFixed(1)}% reducción)`,
        );
      }

      // Publicar eventos de dominio antes de persistir
      finalEvents.forEach((event) => {
        const eventCtx = this.eventPublisher.mergeObjectContext(event);
        eventCtx.commit();
      });

      // Guardar en batch usando el repository
      const saveResult = await this.repository.saveBatch(finalEvents);

      if (saveResult.isErr()) {
        // Si falla, reincorporar eventos al buffer
        this.logger.error(
          `Error al guardar batch: ${saveResult.error.message}. Reincorporando eventos al buffer.`,
        );
        this.buffer.unshift(...eventsToFlush);
        this.stats.currentSize = this.buffer.length;
        return saveResult;
      }

      // Actualizar estadísticas
      this.stats.totalFlushed += finalEvents.length;
      this.stats.lastFlushAt = new Date();
      this.stats.flushCount++;

      const duration = Date.now() - startTime;
      this.logger.log(
        `Flush completado: ${finalEvents.length} eventos guardados en ${duration}ms ` +
          `(${(finalEvents.length / (duration / 1000)).toFixed(0)} eventos/seg)`,
      );

      return okVoid();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error crítico en flush: ${message}`);

      // Reincorporar eventos al buffer
      this.buffer.unshift(...eventsToFlush);
      this.stats.currentSize = this.buffer.length;

      return err(new BufferFlushError(message));
    }
  }

  /**
   * Obtiene las estadísticas actuales del buffer
   */
  getStats(): BufferStats {
    return { ...this.stats };
  }

  /**
   * Resetea las estadísticas (útil para testing)
   */
  resetStats(): void {
    this.stats = {
      currentSize: this.buffer.length,
      totalReceived: 0,
      totalFlushed: 0,
      totalDiscarded: 0,
      lastFlushAt: null,
      flushCount: 0,
    };
  }

  /**
   * Inicia el timer de flush periódico
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      if (this.buffer.length > 0) {
        this.logger.debug(
          `Flush periódico: ${this.buffer.length} eventos pendientes`,
        );
        await this.flush();
      }
    }, this.config.flushIntervalMs);
  }

  /**
   * Detiene el timer y hace flush final al destruir el módulo
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Deteniendo buffer service y haciendo flush final...');

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush final de eventos pendientes
    if (this.buffer.length > 0) {
      await this.flush();
    }

    this.logger.log('Buffer service detenido correctamente');
  }

  /**
   * Obtiene el tamaño actual del buffer
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Limpia el buffer (útil para testing)
   */
  clear(): void {
    this.buffer = [];
    this.stats.currentSize = 0;
  }
}
