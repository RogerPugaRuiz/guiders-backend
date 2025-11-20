import { VisitorId } from './value-objects/visitor-id';
import { VisitorConnectionVO } from './value-objects/visitor-connection';
import { VisitorLastActivity } from './value-objects/visitor-last-activity';

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

  // Establece que un visitante está escribiendo en un chat
  setTyping(visitorId: VisitorId, chatId: string): Promise<void>;

  // Obtiene si un visitante está escribiendo en un chat
  isTyping(visitorId: VisitorId, chatId: string): Promise<boolean>;

  // Limpia el estado de "escribiendo" de un visitante en un chat
  clearTyping(visitorId: VisitorId, chatId: string): Promise<void>;

  // Obtiene todos los visitantes que están escribiendo en un chat
  getTypingInChat(chatId: string): Promise<VisitorId[]>;

  // Actualiza la última actividad de un visitante (heartbeat automático)
  updateLastActivity(
    visitorId: VisitorId,
    lastActivity: VisitorLastActivity,
  ): Promise<void>;

  // Obtiene la última actividad de un visitante
  getLastActivity(visitorId: VisitorId): Promise<VisitorLastActivity>;

  // Verifica si un visitante está activo (no expirado según timeout)
  isVisitorActive(
    visitorId: VisitorId,
    timeoutMinutes?: number,
  ): Promise<boolean>;

  // Actualiza la última actividad real del usuario (interacciones)
  updateLastUserActivity(
    visitorId: VisitorId,
    lastUserActivity: VisitorLastActivity,
  ): Promise<void>;

  // Obtiene la última actividad real del usuario
  getLastUserActivity(visitorId: VisitorId): Promise<VisitorLastActivity>;

  // Verifica si el usuario está activo (interactuando realmente, no solo heartbeat)
  isUserActive(visitorId: VisitorId, timeoutMinutes?: number): Promise<boolean>;

  // Verifica si existe una clave genérica en el cache
  hasKey(key: string): Promise<boolean>;

  // Establece una clave con tiempo de expiración
  setKeyWithExpiry(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void>;
}

// Símbolo para inyección de dependencias
export const VISITOR_CONNECTION_DOMAIN_SERVICE = Symbol(
  'VisitorConnectionDomainService',
);
