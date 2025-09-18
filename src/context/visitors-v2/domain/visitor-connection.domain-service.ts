import { VisitorId } from './value-objects/visitor-id';
import { VisitorConnectionVO } from './value-objects/visitor-connection';

// Interfaz del domain service para gestionar conexiones de visitantes
// Esta abstracción permite que el dominio interactúe con la infraestructura de conexiones
// sin conocer los detalles de implementación (Redis, etc.)
export interface VisitorConnectionDomainService {
  // Establece o actualiza el estado de conexión de un visitante
  setConnectionStatus(
    visitorId: VisitorId,
    connection: VisitorConnectionVO,
  ): Promise<void>;

  // Obtiene el estado actual de conexión de un visitante
  getConnectionStatus(visitorId: VisitorId): Promise<VisitorConnectionVO>;

  // Elimina el registro de conexión de un visitante (cuando se desconecta definitivamente)
  removeConnection(visitorId: VisitorId): Promise<void>;

  // Verifica si un visitante está actualmente online
  isVisitorOnline(visitorId: VisitorId): Promise<boolean>;

  // Obtiene todos los visitantes que están actualmente chateando
  getChattingVisitors(): Promise<VisitorId[]>;

  // Obtiene todos los visitantes que están online (incluye chatting)
  getOnlineVisitors(): Promise<VisitorId[]>;
}

// Símbolo para inyección de dependencias
export const VISITOR_CONNECTION_DOMAIN_SERVICE = Symbol(
  'VisitorConnectionDomainService',
);
