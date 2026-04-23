import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Request } from 'express';
import {
  INTEGRATION_API_KEY_REPOSITORY,
  IntegrationApiKeyRepository,
} from '../domain/repository/integration-api-key.repository';
import { IntegrationApiKeyToken } from '../domain/model/integration-api-key-token';

export const INTEGRATION_API_KEY_HEADER = 'x-api-key';

export interface IntegrationApiKeyRequest extends Request {
  integrationApiKey: {
    id: string;
    companyId: string;
    environment: string;
  };
}

/**
 * Guard que valida las Integration API Keys (gdr_live_xxx / gdr_test_xxx).
 * El token se envía en el header `x-api-key`.
 * Se hashea con SHA-256 y se busca en BD.
 * Si es válida y activa, inyecta la info en `req.integrationApiKey`.
 */
@Injectable()
export class IntegrationApiKeyGuard implements CanActivate {
  constructor(
    @Inject(INTEGRATION_API_KEY_REPOSITORY)
    private readonly repository: IntegrationApiKeyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<IntegrationApiKeyRequest>();
    const rawToken = request.headers[INTEGRATION_API_KEY_HEADER];

    if (!rawToken || typeof rawToken !== 'string') {
      throw new UnauthorizedException(
        'API Key de integración requerida en el header x-api-key',
      );
    }

    if (
      !rawToken.startsWith('gdr_live_') &&
      !rawToken.startsWith('gdr_test_')
    ) {
      throw new UnauthorizedException('Formato de API Key inválido');
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const key = await this.repository.findByTokenHash(
      IntegrationApiKeyToken.of(tokenHash),
    );

    if (!key) {
      throw new UnauthorizedException('API Key de integración no encontrada');
    }

    if (key.status.isRevoked()) {
      throw new UnauthorizedException('API Key de integración revocada');
    }

    // Actualizar lastUsedAt de forma no bloqueante (fire-and-forget)
    const updatedKey = key.markUsed();
    void this.repository.save(updatedKey);

    request.integrationApiKey = {
      id: key.id.getValue(),
      companyId: key.companyId.getValue(),
      environment: key.environment.getValue(),
    };

    return true;
  }
}
