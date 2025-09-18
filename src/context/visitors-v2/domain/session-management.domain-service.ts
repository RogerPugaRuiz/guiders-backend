import { VisitorV2 } from './visitor-v2.aggregate';
import { SessionTimeout } from './value-objects/session-timeout';

/**
 * Servicio de dominio para gestión avanzada de sesiones
 * Centraliza la lógica de negocio relacionada con ciclo de vida de sesiones
 */
export interface SessionManagementDomainService {
  /**
   * Determina el timeout apropiado según el estado del visitante
   */
  determineTimeoutForVisitor(visitor: VisitorV2): SessionTimeout;

  /**
   * Verifica si alguna sesión del visitante ha expirado
   */
  hasExpiredSessions(visitor: VisitorV2): boolean;

  /**
   * Limpia sesiones expiradas del visitante
   */
  cleanExpiredSessions(visitor: VisitorV2): VisitorV2;

  /**
   * Verifica si el visitante debería considerarse inactivo
   */
  shouldBeMarkedAsInactive(visitor: VisitorV2): boolean;
}

/**
 * Implementación del servicio de dominio para gestión de sesiones
 */
export class SessionManagementDomainServiceImpl
  implements SessionManagementDomainService
{
  /**
   * Determina el timeout según el lifecycle del visitante
   */
  determineTimeoutForVisitor(visitor: VisitorV2): SessionTimeout {
    const lifecycle = visitor.getLifecycle();

    if (lifecycle.isConverted()) {
      return SessionTimeout.extended(); // 60 min para convertidos
    }

    if (lifecycle.isLead()) {
      return SessionTimeout.long(); // 30 min para leads
    }

    if (lifecycle.isEngaged()) {
      return SessionTimeout.medium(); // 15 min para engaged
    }

    // ANON por defecto
    return SessionTimeout.short(); // 5 min para anónimos
  }

  /**
   * Verifica si tiene sesiones expiradas
   */
  hasExpiredSessions(visitor: VisitorV2): boolean {
    const timeout = this.determineTimeoutForVisitor(visitor);
    const sessions = visitor.getSessions();

    return sessions.some((session) => {
      if (!session.isActive()) return false;
      return timeout.isExpired(session.getLastActivityAt());
    });
  }

  /**
   * Limpia sesiones expiradas y devuelve nuevo visitante
   */
  cleanExpiredSessions(visitor: VisitorV2): VisitorV2 {
    const timeout = this.determineTimeoutForVisitor(visitor);
    const updatedVisitor = visitor;

    const sessions = visitor.getSessions();
    sessions.forEach((session) => {
      if (
        session.isActive() &&
        timeout.isExpired(session.getLastActivityAt())
      ) {
        // Terminar la sesión activa expirada
        updatedVisitor.endCurrentSession();
      }
    });

    return updatedVisitor;
  }

  /**
   * Determina si el visitante debería marcarse como inactivo
   * Basado en si todas sus sesiones están expiradas y no tiene actividad reciente
   */
  shouldBeMarkedAsInactive(visitor: VisitorV2): boolean {
    const timeout = this.determineTimeoutForVisitor(visitor);
    const activeSessions = visitor.getActiveSessions();

    // Si no tiene sesiones activas, verificar la última actualización
    if (activeSessions.length === 0) {
      const lastUpdate = visitor.getUpdatedAt();
      return timeout.isExpired(lastUpdate);
    }

    // Si tiene sesiones activas, verificar si todas están expiradas
    return activeSessions.every((session) =>
      timeout.isExpired(session.getLastActivityAt()),
    );
  }
}

// Símbolo para inyección de dependencias
export const SESSION_MANAGEMENT_DOMAIN_SERVICE = Symbol(
  'SessionManagementDomainService',
);
