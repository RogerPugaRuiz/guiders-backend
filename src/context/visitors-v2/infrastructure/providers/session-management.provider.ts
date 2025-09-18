import { Provider } from '@nestjs/common';
import {
  SESSION_MANAGEMENT_DOMAIN_SERVICE,
  SessionManagementDomainServiceImpl,
} from '../../domain/session-management.domain-service';

/**
 * Provider para el servicio de dominio de gestión de sesiones
 */
export const SESSION_MANAGEMENT_SERVICE_PROVIDER: Provider = {
  provide: SESSION_MANAGEMENT_DOMAIN_SERVICE,
  useClass: SessionManagementDomainServiceImpl,
};
