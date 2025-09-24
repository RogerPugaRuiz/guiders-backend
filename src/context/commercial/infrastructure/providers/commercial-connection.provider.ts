import { Provider } from '@nestjs/common';
import { COMMERCIAL_CONNECTION_DOMAIN_SERVICE } from '../../domain/commercial-connection.domain-service';
import { RedisCommercialConnectionDomainService } from '../connection/redis-commercial-connection.domain-service';

/**
 * Provider para el servicio de dominio de gestión de conexiones de comerciales
 */
export const COMMERCIAL_CONNECTION_SERVICE_PROVIDER: Provider = {
  provide: COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  useClass: RedisCommercialConnectionDomainService,
};
