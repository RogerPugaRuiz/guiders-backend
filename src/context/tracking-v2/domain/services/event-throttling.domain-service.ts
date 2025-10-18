import { TrackingEvent } from '../tracking-event.aggregate';
import { EventTypes } from '../value-objects/event-type';

/**
 * Configuración de throttling por tipo de evento
 */
export interface ThrottlingConfig {
  /**
   * Porcentaje de eventos a conservar (0-100)
   * 100 = todos, 10 = 1 de cada 10, 1 = 1 de cada 100
   */
  samplingRate: number;

  /**
   * Si es true, nunca se descarta este tipo de evento
   */
  alwaysKeep?: boolean;
}

/**
 * Configuración por defecto de throttling
 */
export const DEFAULT_THROTTLING_CONFIG: Record<string, ThrottlingConfig> = {
  [EventTypes.PAGE_VIEW]: { samplingRate: 100, alwaysKeep: true },
  [EventTypes.CLICK]: { samplingRate: 100, alwaysKeep: true },
  [EventTypes.BUTTON_CLICK]: { samplingRate: 100, alwaysKeep: true },
  [EventTypes.LINK_CLICK]: { samplingRate: 100, alwaysKeep: true },
  [EventTypes.FORM_SUBMIT]: { samplingRate: 100, alwaysKeep: true },
  [EventTypes.FORM_FIELD_FOCUS]: { samplingRate: 50 },
  [EventTypes.SCROLL]: { samplingRate: 10 },
  [EventTypes.MOUSE_MOVE]: { samplingRate: 1 },
  [EventTypes.PRODUCT_VIEW]: { samplingRate: 100, alwaysKeep: true },
  [EventTypes.ADD_TO_CART]: { samplingRate: 100, alwaysKeep: true },
  [EventTypes.SEARCH]: { samplingRate: 100, alwaysKeep: true },
  [EventTypes.VIDEO_PLAY]: { samplingRate: 100 },
  [EventTypes.VIDEO_PAUSE]: { samplingRate: 100 },
  [EventTypes.VIDEO_COMPLETE]: { samplingRate: 100 },
  [EventTypes.FILE_DOWNLOAD]: { samplingRate: 100 },
  [EventTypes.CUSTOM]: { samplingRate: 100 },
};

/**
 * Servicio de dominio para aplicar throttling a eventos
 * Reduce el volumen de eventos descartando algunos según configuración
 */
export class EventThrottlingDomainService {
  constructor(
    private readonly config: Record<
      string,
      ThrottlingConfig
    > = DEFAULT_THROTTLING_CONFIG,
  ) {}

  /**
   * Aplica throttling a un array de eventos
   * Retorna solo los eventos que pasan el filtro
   */
  public apply(events: TrackingEvent[]): TrackingEvent[] {
    return events.filter((event) => this.shouldKeep(event));
  }

  /**
   * Determina si un evento debe conservarse según la configuración
   */
  private shouldKeep(event: TrackingEvent): boolean {
    const eventType = event.getEventType().getValue();

    // Si el evento es crítico, siempre se conserva
    if (event.isCritical()) {
      return true;
    }

    // Obtener configuración para este tipo de evento
    const throttlingConfig = this.config[eventType] ||
      this.config[EventTypes.CUSTOM] || {
        samplingRate: 100,
      };

    // Si está marcado como 'alwaysKeep', conservar
    if (throttlingConfig.alwaysKeep) {
      return true;
    }

    // Aplicar sampling rate probabilístico
    const randomValue = Math.random() * 100;
    return randomValue < throttlingConfig.samplingRate;
  }

  /**
   * Calcula estadísticas de throttling aplicado
   */
  public getThrottlingStats(
    originalEvents: TrackingEvent[],
    filteredEvents: TrackingEvent[],
  ): ThrottlingStats {
    const totalOriginal = originalEvents.length;
    const totalFiltered = filteredEvents.length;
    const discarded = totalOriginal - totalFiltered;
    const discardRate =
      totalOriginal > 0 ? (discarded / totalOriginal) * 100 : 0;

    const discardedByType: Record<string, number> = {};

    originalEvents.forEach((event) => {
      const eventType = event.getEventType().getValue();
      const wasKept = filteredEvents.some(
        (e) => e.getId().getValue() === event.getId().getValue(),
      );

      if (!wasKept) {
        discardedByType[eventType] = (discardedByType[eventType] || 0) + 1;
      }
    });

    return {
      totalOriginal,
      totalFiltered,
      discarded,
      discardRate,
      discardedByType,
    };
  }

  /**
   * Actualiza la configuración de throttling para un tipo de evento
   */
  public updateConfig(eventType: string, config: ThrottlingConfig): void {
    this.config[eventType] = config;
  }

  /**
   * Obtiene la configuración actual
   */
  public getConfig(): Record<string, ThrottlingConfig> {
    return { ...this.config };
  }
}

/**
 * Estadísticas de throttling
 */
export interface ThrottlingStats {
  totalOriginal: number;
  totalFiltered: number;
  discarded: number;
  discardRate: number;
  discardedByType: Record<string, number>;
}
