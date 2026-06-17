/**
 * Evento de dominio emitido cuando una autenticación de embed token
 * es exitosa (cualquier endpoint: /start, /refresh, /authenticate-session).
 *
 * Se persiste a MongoDB por `PersistEmbedTokenAuthenticatedEventHandler`
 * (Story 2.2) con TTL 12 meses (NFR-S7 GDPR).
 *
 * Shape:
 * - companyId, userId: identidad del usuario autenticado
 * - origin, ipAddress, userAgent: contexto de la request
 * - endpoint: qué endpoint de embed fue autenticado
 * - timestamp: cuándo ocurrió
 *
 * NOTA: ipAddress es la IP raw — el handler la hashea con SHA-256 antes
 * de persistir (GDPR Art. 4(1) compliance).
 */

import { DomainEvent } from 'src/context/shared/domain/domain-event';

export interface EmbedTokenAuthenticatedEventAttributes {
  companyId: string;
  userId: string;
  origin: string;
  timestamp: string; // ISO 8601
  ipAddress: string; // raw (se hashea en el handler)
  userAgent: string;
  endpoint: string;
}

export class EmbedTokenAuthenticatedEvent extends DomainEvent<EmbedTokenAuthenticatedEventAttributes> {
  public static readonly EVENT_NAME = 'EmbedTokenAuthenticatedEvent';
}
