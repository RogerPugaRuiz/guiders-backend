import { CommercialInfo } from './chat-auto-assignment.domain-service';

/**
 * Interface para el servicio de heartbeat de comerciales
 * Se implementa integrando con el módulo Commercial existente
 */
export interface CommercialHeartbeatService {
  /**
   * Obtiene comerciales disponibles para una empresa/sitio
   */
  getAvailableCommercials(
    companyId: string,
    siteId?: string,
  ): Promise<CommercialInfo[]>;

  /**
   * Verifica si un comercial específico está disponible
   */
  isCommercialAvailable(commercialId: string): Promise<boolean>;

  /**
   * Registra último heartbeat de un comercial
   */
  recordHeartbeat(commercialId: string): Promise<void>;

  /**
   * Obtiene estado de conexión de un comercial
   */
  getConnectionStatus(commercialId: string): Promise<{
    isOnline: boolean;
    lastActivity?: Date;
    currentChats: number;
  }>;
}

/**
 * Symbol para inyección de dependencias
 */
export const COMMERCIAL_HEARTBEAT_SERVICE = Symbol(
  'CommercialHeartbeatService',
);
