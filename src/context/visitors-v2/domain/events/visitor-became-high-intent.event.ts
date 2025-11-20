import { DomainEvent } from 'src/context/shared/domain/domain-event';
import { LeadScorePrimitives } from 'src/context/lead-scoring/domain/value-objects/lead-score';

export interface VisitorBecameHighIntentPayload {
  visitorId: string;
  tenantId: string;
  siteId: string;
  fingerprint: string;
  leadScore: LeadScorePrimitives;
  timestamp: string;
}

/**
 * Evento emitido cuando un visitante alcanza el tier "hot" en lead scoring
 */
export class VisitorBecameHighIntentEvent extends DomainEvent<VisitorBecameHighIntentPayload> {
  constructor(payload: VisitorBecameHighIntentPayload) {
    super(payload);
  }
}
