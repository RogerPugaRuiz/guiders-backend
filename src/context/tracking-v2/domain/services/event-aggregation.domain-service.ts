import { TrackingEvent } from '../tracking-event.aggregate';

/**
 * Resultado de la agregación
 */
export interface AggregationResult {
  aggregated: TrackingEvent[];
  originalCount: number;
  aggregatedCount: number;
  reductionRate: number;
  aggregatedByType: Record<string, number>;
}

/**
 * Servicio de dominio para agregar eventos duplicados
 * Consolida eventos similares en un único evento con contador
 */
export class EventAggregationDomainService {
  /**
   * Agrega eventos duplicados dentro del mismo batch
   * Dos eventos son duplicados si tienen la misma clave de agregación
   * y ocurrieron dentro de una ventana temporal
   */
  public aggregate(events: TrackingEvent[]): AggregationResult {
    const originalCount = events.length;
    const aggregationMap = new Map<string, TrackingEvent>();

    // Agrupar eventos por clave de agregación
    events.forEach((event) => {
      const key = event.getAggregationKey();

      if (aggregationMap.has(key)) {
        // Ya existe un evento con esta clave, verificar si se puede agregar
        const existingEvent = aggregationMap.get(key)!;

        if (existingEvent.canAggregateWith(event)) {
          // Incrementar contador del evento existente
          existingEvent.incrementCount(event.getCount());
        } else {
          // No se puede agregar, añadir como evento separado
          // Modificar la clave para que sea única
          const uniqueKey = `${key}:${event.getId().getValue()}`;
          aggregationMap.set(uniqueKey, event);
        }
      } else {
        // Primer evento con esta clave
        aggregationMap.set(key, event);
      }
    });

    // Convertir el mapa a array
    const aggregated = Array.from(aggregationMap.values());
    const aggregatedCount = aggregated.length;
    const reductionRate =
      originalCount > 0
        ? ((originalCount - aggregatedCount) / originalCount) * 100
        : 0;

    // Calcular estadísticas por tipo
    const aggregatedByType: Record<string, number> = {};
    aggregated.forEach((event) => {
      const eventType = event.getEventType().getValue();
      const count = event.getCount();
      aggregatedByType[eventType] = (aggregatedByType[eventType] || 0) + count;
    });

    return {
      aggregated,
      originalCount,
      aggregatedCount,
      reductionRate,
      aggregatedByType,
    };
  }

  /**
   * Agrega eventos por visitante
   * Útil para análisis agregados
   */
  public aggregateByVisitor(
    events: TrackingEvent[],
  ): Map<string, TrackingEvent[]> {
    const visitorMap = new Map<string, TrackingEvent[]>();

    events.forEach((event) => {
      const visitorId = event.getVisitorId().getValue();

      if (!visitorMap.has(visitorId)) {
        visitorMap.set(visitorId, []);
      }

      visitorMap.get(visitorId)!.push(event);
    });

    return visitorMap;
  }

  /**
   * Agrega eventos por sesión
   */
  public aggregateBySession(
    events: TrackingEvent[],
  ): Map<string, TrackingEvent[]> {
    const sessionMap = new Map<string, TrackingEvent[]>();

    events.forEach((event) => {
      const sessionId = event.getSessionId().getValue();

      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, []);
      }

      sessionMap.get(sessionId)!.push(event);
    });

    return sessionMap;
  }

  /**
   * Agrega eventos por tipo
   */
  public aggregateByType(
    events: TrackingEvent[],
  ): Map<string, TrackingEvent[]> {
    const typeMap = new Map<string, TrackingEvent[]>();

    events.forEach((event) => {
      const eventType = event.getEventType().getValue();

      if (!typeMap.has(eventType)) {
        typeMap.set(eventType, []);
      }

      typeMap.get(eventType)!.push(event);
    });

    return typeMap;
  }

  /**
   * Cuenta eventos totales incluyendo los agregados
   */
  public getTotalEventsCount(events: TrackingEvent[]): number {
    return events.reduce((sum, event) => sum + event.getCount(), 0);
  }

  /**
   * Obtiene el resumen de agregación
   */
  public getSummary(events: TrackingEvent[]): AggregationSummary {
    const totalEvents = this.getTotalEventsCount(events);
    const uniqueEvents = events.length;
    const averageCount = uniqueEvents > 0 ? totalEvents / uniqueEvents : 0;

    const eventsByType: Record<string, number> = {};
    const countByType: Record<string, number> = {};

    events.forEach((event) => {
      const eventType = event.getEventType().getValue();
      eventsByType[eventType] = (eventsByType[eventType] || 0) + 1;
      countByType[eventType] = (countByType[eventType] || 0) + event.getCount();
    });

    return {
      totalEvents,
      uniqueEvents,
      averageCount,
      eventsByType,
      countByType,
    };
  }
}

/**
 * Resumen de agregación
 */
export interface AggregationSummary {
  totalEvents: number;
  uniqueEvents: number;
  averageCount: number;
  eventsByType: Record<string, number>;
  countByType: Record<string, number>;
}
