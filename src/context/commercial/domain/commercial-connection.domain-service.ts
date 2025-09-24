import { CommercialId } from './value-objects/commercial-id';
import { CommercialConnectionStatus } from './value-objects/commercial-connection-status';
import { CommercialLastActivity } from './value-objects/commercial-last-activity';

/**
 * Interfaz del domain service para gestionar conexiones de comerciales
 * Esta abstracción permite que el dominio interactúe con la infraestructura de conexiones
 * sin conocer los detalles de implementación (Redis, etc.)
 */
export interface CommercialConnectionDomainService {
  /**
   * Establece o actualiza el estado de conexión de un comercial
   */
  setConnectionStatus(
    commercialId: CommercialId,
    connectionStatus: CommercialConnectionStatus,
  ): Promise<void>;

  /**
   * Obtiene el estado actual de conexión de un comercial
   */
  getConnectionStatus(
    commercialId: CommercialId,
  ): Promise<CommercialConnectionStatus>;

  /**
   * Actualiza la última actividad de un comercial (heartbeat)
   */
  updateLastActivity(
    commercialId: CommercialId,
    lastActivity: CommercialLastActivity,
  ): Promise<void>;

  /**
   * Obtiene la última actividad de un comercial
   */
  getLastActivity(commercialId: CommercialId): Promise<CommercialLastActivity>;

  /**
   * Elimina el registro de conexión de un comercial (cuando se desconecta definitivamente)
   */
  removeConnection(commercialId: CommercialId): Promise<void>;

  /**
   * Verifica si un comercial está actualmente online
   */
  isCommercialOnline(commercialId: CommercialId): Promise<boolean>;

  /**
   * Verifica si un comercial está activo (no expirado según timeout)
   */
  isCommercialActive(
    commercialId: CommercialId,
    timeoutMinutes?: number,
  ): Promise<boolean>;

  /**
   * Obtiene todos los comerciales que están online
   */
  getOnlineCommercials(): Promise<CommercialId[]>;

  /**
   * Obtiene todos los comerciales que están disponibles (online y no busy)
   */
  getAvailableCommercials(): Promise<CommercialId[]>;

  /**
   * Obtiene todos los comerciales que están ocupados (busy)
   */
  getBusyCommercials(): Promise<CommercialId[]>;

  /**
   * Obtiene todos los comerciales activos (considerando timeout)
   */
  getActiveCommercials(timeoutMinutes?: number): Promise<CommercialId[]>;
}

/**
 * Símbolo para inyección de dependencias
 */
export const COMMERCIAL_CONNECTION_DOMAIN_SERVICE = Symbol(
  'CommercialConnectionDomainService',
);
