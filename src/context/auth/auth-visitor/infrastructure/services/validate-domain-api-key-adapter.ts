import { Inject, Injectable, Logger } from '@nestjs/common';
import { ValidateDomainApiKey } from '../../application/services/validate-domain-api-key';
import { VisitorAccountApiKey } from '../../domain/models/visitor-account-api-key';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from 'src/context/auth/api-key/domain/repository/api-key.repository';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ValidateDomainApiKeyAdapter implements ValidateDomainApiKey {
  private readonly logger = new Logger(ValidateDomainApiKeyAdapter.name);
  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly repository: ApiKeyRepository,
    private readonly configService: ConfigService,
  ) {}

  async validate(params: {
    apiKey: VisitorAccountApiKey;
    domain: string;
  }): Promise<boolean> {
    const apiKey = await this.repository.getApiKeyByApiKey(params.apiKey);
    if (!apiKey) {
      return false;
    }

    // Normalizar dominios eliminando el prefijo www. para comparación
    const normalizedStoredDomain = this.normalizeDomain(
      apiKey.domain.getValue(),
    );
    const normalizedProvidedDomain = this.normalizeDomain(params.domain);

    this.logger.log('Stored domain (normalized): ' + normalizedStoredDomain);
    this.logger.log(
      'Provided domain (normalized): ' + normalizedProvidedDomain,
    );

    return normalizedStoredDomain === normalizedProvidedDomain;
  }

  private normalizeDomain(domain: string): string {
    // Eliminar prefijo www. si existe para permitir comparación flexible
    return domain.startsWith('www.') ? domain.substring(4) : domain;
  }
}
