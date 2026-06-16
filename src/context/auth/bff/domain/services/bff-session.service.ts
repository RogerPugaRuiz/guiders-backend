/**
 * Servicio de dominio para emisión, validación y revocación de
 * BFF sessions a partir de un embed token validado.
 *
 * Las BFF sessions son credenciales opacas (256 bits, base64url)
 * almacenadas en Redis bajo el namespace `bff:session:*` con TTL 8h.
 *
 * Diferencia con `EmbedTokenService`:
 *  - `EmbedTokenService` emite tokens que cruzan dominios
 *    (LeadCars backend → iframe Guiders).
 *  - `BffSessionService` emite sessions que NO cruzan dominios
 *    (viven en la cookie del navegador del usuario).
 *
 * El `embedTokenRef` en la sesión permite trazabilidad y revocación
 * en cascada (Story 2.3 invalidará la sesión cuando el token padre
 * sea revocado).
 *
 * Implementación: ver `RedisBffSessionService` en infrastructure/.
 */

import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { BffSessionData } from '../value-objects/bff-session-data';

export interface BffSessionIssued {
  sessionId: string;
  expiresAt: string;
}

export interface IBffSessionService {
  /**
   * Genera un nuevo session ID opaco y lo almacena en Redis con TTL 8h.
   * El `embedTokenRef` se guarda en el value de Redis para trazabilidad
   * y revocación en cascada.
   */
  createSession(
    data: Omit<BffSessionData, 'embedTokenRef' | 'expiresAt'>,
    embedTokenRef: string,
  ): Promise<Result<BffSessionIssued, DomainError>>;

  /**
   * Recupera los datos de una session existente. Retorna err si no
   * existe o ha expirado.
   */
  getSession(sessionId: string): Promise<Result<BffSessionData, DomainError>>;

  /**
   * Elimina la session de Redis. Idempotente.
   */
  revokeSession(sessionId: string): Promise<Result<void, DomainError>>;
}

export const BFF_SESSION_SERVICE = Symbol('BffSessionService');
