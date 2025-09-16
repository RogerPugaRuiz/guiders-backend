import { Injectable } from '@nestjs/common';
import { TrackingEvent } from './tracking-event.aggregate';
import { VisitorIntent } from './visitor-intent.aggregate';
import { IntentType } from './value-objects/intent-type';
import { IntentConfidence } from './value-objects/intent-confidence';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { VisitorId } from './value-objects/visitor-id';

// Definición de tipos esperados en metadata
interface ProductViewMetadata {
  productId: string;
  category?: string;
  durationSeconds?: number;
}

// Servicio de dominio para detectar intenciones básicas a partir de eventos de tracking
@Injectable()
export class BasicIntentDetector {
  // Procesa una lista de eventos de tracking y detecta la intención principal
  detect(visitorId: VisitorId, events: TrackingEvent[]): VisitorIntent | null {
    // Reglas para detectar intención de compra
    if (this.isPurchaseIntent(events)) {
      return VisitorIntent.create({
        id: Uuid.random(),
        visitorId,
        type: new IntentType(IntentType.PURCHASE),
        confidence: new IntentConfidence(IntentConfidence.HIGH),
        detectedAt: new Date(),
      });
    }
    // Reglas para detectar intención de investigación
    if (this.isResearchIntent(events)) {
      return VisitorIntent.create({
        id: Uuid.random(),
        visitorId,
        type: new IntentType(IntentType.RESEARCH),
        confidence: new IntentConfidence(IntentConfidence.MEDIUM),
        detectedAt: new Date(),
      });
    }
    // Si no se detecta intención
    return null;
  }

  // Regla: Usuario ve el mismo producto 3+ veces en una sesión
  private isPurchaseIntent(events: TrackingEvent[]): boolean {
    const productViews: Record<string, number> = {};
    for (const event of events) {
      // Suponemos que eventType y metadata contienen la información necesaria
      if (event.eventType.value === 'PRODUCT_VIEW') {
        const meta = event.metadata.value as ProductViewMetadata;
        const productId =
          typeof meta.productId === 'string' ? meta.productId : undefined;
        if (productId) {
          productViews[productId] = (productViews[productId] || 0) + 1;
          if (productViews[productId] >= 3) {
            return true;
          }
        }
      }
      // Regla: Usuario ve detalles de precio/disponibilidad
      if (
        event.eventType.value === 'PRICE_VIEW' ||
        event.eventType.value === 'AVAILABILITY_VIEW'
      ) {
        return true;
      }
    }
    // Regla: Tiempo acumulado en páginas de producto > 60s
    const timeByProduct: Record<string, number> = {};
    for (const event of events) {
      if (event.eventType.value === 'PRODUCT_VIEW') {
        const meta = event.metadata.value as ProductViewMetadata;
        const productId =
          typeof meta.productId === 'string' ? meta.productId : undefined;
        const duration =
          typeof meta.durationSeconds === 'number' ? meta.durationSeconds : 0;
        if (productId) {
          timeByProduct[productId] = (timeByProduct[productId] || 0) + duration;
          if (timeByProduct[productId] > 60) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Reglas para detectar intención de investigación
  private isResearchIntent(events: TrackingEvent[]): boolean {
    // Regla: Usuario ve 3+ productos diferentes de la misma categoría
    const categoryViews: Record<string, Set<string>> = {};
    for (const event of events) {
      if (event.eventType.value === 'PRODUCT_VIEW') {
        const meta = event.metadata.value as ProductViewMetadata;
        const category =
          typeof meta.category === 'string' ? meta.category : undefined;
        const productId =
          typeof meta.productId === 'string' ? meta.productId : undefined;
        if (category && productId) {
          if (!categoryViews[category]) categoryViews[category] = new Set();
          categoryViews[category].add(productId);
          if (categoryViews[category].size >= 3) {
            return true;
          }
        }
      }
      // Regla: Usuario visita secciones de especificaciones técnicas
      if (event.eventType.value === 'TECHNICAL_SPECS_VIEW') {
        return true;
      }
      // Regla: Usuario realiza búsquedas con términos de la categoría
      if (event.eventType.value === 'CATEGORY_SEARCH') {
        return true;
      }
    }
    // Regla: Usuario alterna entre páginas de producto de forma comparativa
    const productSequence = events
      .filter((e) => e.eventType.value === 'PRODUCT_VIEW')
      .map((e) => {
        const meta = e.metadata.value as ProductViewMetadata;
        return typeof meta.productId === 'string' ? meta.productId : undefined;
      })
      .filter((id): id is string => !!id);
    if (productSequence.length >= 4) {
      const uniqueProducts = new Set(productSequence);
      if (uniqueProducts.size >= 2) {
        return true;
      }
    }
    return false;
  }
}
