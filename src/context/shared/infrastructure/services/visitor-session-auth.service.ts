import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../../visitors-v2/domain/visitor-v2.repository';
import { SessionId } from '../../../visitors-v2/domain/value-objects/session-id';

export interface VisitorSessionInfo {
  visitorId: string;
  tenantId: string;
  siteId: string;
  sessionId: string;
  username?: string;
  email?: string;
}

/**
 * Servicio para validar sesiones de visitante V2 y extraer información
 * para autenticación basada en cookies de sesión
 */
@Injectable()
export class VisitorSessionAuthService {
  private readonly logger = new Logger(VisitorSessionAuthService.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  /**
   * Valida un sessionId y retorna información del visitante si la sesión es válida
   */
  async validateSession(sessionId: string): Promise<VisitorSessionInfo | null> {
    try {
      this.logger.debug(`🔍 Validando sesión: ${sessionId}`);

      const sessionIdVO = new SessionId(sessionId);
      this.logger.debug(`🔍 SessionId VO creado: ${sessionIdVO.getValue()}`);

      const result = await this.visitorRepository.findBySessionId(sessionIdVO);
      this.logger.debug(
        `🔍 Resultado de búsqueda: ${result.isOk() ? 'ENCONTRADO' : 'NO ENCONTRADO'}`,
      );

      if (result.isErr()) {
        this.logger.warn(
          `❌ Sesión no encontrada: ${sessionId} - Error: ${result.error.message}`,
        );
        return null;
      }

      const visitor = result.unwrap();
      this.logger.debug(
        `✅ Visitante encontrado: ${visitor.getId().getValue()}`,
      );

      // Verificar que la sesión esté activa
      const activeSessions = visitor.getActiveSessions();
      this.logger.debug(
        `🔍 Sesiones activas encontradas: ${activeSessions.length}`,
      );

      activeSessions.forEach((session, index) => {
        this.logger.debug(`  Sesión ${index}: ${session.getId().getValue()}`);
      });

      const targetSession = activeSessions.find(
        (session) => session.getId().getValue() === sessionId,
      );

      if (!targetSession) {
        this.logger.warn(
          `❌ Sesión inactiva o no encontrada en sesiones activas: ${sessionId}`,
        );
        return null;
      }

      // Extraer información del visitante
      const visitorInfo: VisitorSessionInfo = {
        visitorId: visitor.getId().getValue(),
        tenantId: visitor.getTenantId().getValue(),
        siteId: visitor.getSiteId().getValue(),
        sessionId: sessionId,
        // Los visitantes V2 inicialmente son anónimos, no tienen username/email
        // pero podrían tenerlos si han sido identificados posteriormente
        username: undefined, // TODO: Implementar si VisitorV2 tiene nombre
        email: undefined, // TODO: Implementar si VisitorV2 tiene email
      };

      this.logger.debug(
        `✅ Sesión válida para visitante: ${visitorInfo.visitorId}`,
      );
      return visitorInfo;
    } catch (error) {
      this.logger.error(`💥 Error validando sesión ${sessionId}:`, error);
      return null;
    }
  }
}
