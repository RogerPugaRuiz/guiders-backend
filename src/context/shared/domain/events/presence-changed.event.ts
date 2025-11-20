import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Evento de dominio que se dispara cuando cambia el estado de presencia de un usuario
 */
export class PresenceChangedEvent extends DomainEvent<{
  userId: string;
  userType: 'commercial' | 'visitor';
  previousStatus: string;
  newStatus: string;
  tenantId?: string; // Para filtrar notificaciones por empresa
}> {
  constructor(
    userId: string,
    userType: 'commercial' | 'visitor',
    previousStatus: string,
    newStatus: string,
    tenantId?: string,
  ) {
    super({ userId, userType, previousStatus, newStatus, tenantId });
  }

  /**
   * Nombre del evento para identificación
   */
  static eventName = 'presence.changed';

  /**
   * Obtiene el ID del usuario
   */
  getUserId(): string {
    return this.attributes.userId;
  }

  /**
   * Obtiene el tipo de usuario (commercial o visitor)
   */
  getUserType(): 'commercial' | 'visitor' {
    return this.attributes.userType;
  }

  /**
   * Obtiene el estado anterior
   */
  getPreviousStatus(): string {
    return this.attributes.previousStatus;
  }

  /**
   * Obtiene el nuevo estado
   */
  getNewStatus(): string {
    return this.attributes.newStatus;
  }

  /**
   * Obtiene el tenant ID (opcional)
   */
  getTenantId(): string | undefined {
    return this.attributes.tenantId;
  }
}
