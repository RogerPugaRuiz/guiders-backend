import { DomainEvent } from 'src/context/shared/domain/domain-event';

export interface VisitorCurrentPageChangedPayload {
  visitorId: string;
  tenantId: string;
  siteId: string;
  previousPage: string | null;
  currentPage: string;
  timestamp: string;
}

/**
 * Evento emitido cuando un visitante cambia de página
 */
export class VisitorCurrentPageChangedEvent extends DomainEvent<VisitorCurrentPageChangedPayload> {
  constructor(payload: VisitorCurrentPageChangedPayload) {
    super(payload);
  }
}
