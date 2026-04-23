import { Inject, Injectable } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  INTEGRATION_API_KEY_REPOSITORY,
  IntegrationApiKeyRepository,
} from '../../domain/repository/integration-api-key.repository';
import { IntegrationApiKeyId } from '../../domain/model/integration-api-key-id';
import { IntegrationApiKeyCompanyId } from '../../domain/model/integration-api-key-company-id';
import {
  IntegrationApiKeyNotFoundError,
  IntegrationApiKeyAlreadyRevokedError,
} from '../../domain/errors/integration-api-key.errors';
import { RevokeIntegrationApiKeyCommand } from './revoke-integration-api-key.command';

@Injectable()
export class RevokeIntegrationApiKeyCommandHandler {
  constructor(
    @Inject(INTEGRATION_API_KEY_REPOSITORY)
    private readonly repository: IntegrationApiKeyRepository,
  ) {}

  async execute(
    command: RevokeIntegrationApiKeyCommand,
  ): Promise<Result<void, DomainError>> {
    const key = await this.repository.findById(
      IntegrationApiKeyId.create(command.id),
    );

    if (!key) {
      return err(new IntegrationApiKeyNotFoundError(command.id));
    }

    // Verificar que la key pertenece a la compañía del solicitante
    if (key.companyId.getValue() !== command.companyId) {
      return err(new IntegrationApiKeyNotFoundError(command.id));
    }

    if (key.status.isRevoked()) {
      return err(new IntegrationApiKeyAlreadyRevokedError(command.id));
    }

    const revokedKey = key.revoke();
    await this.repository.save(revokedKey);

    return ok(undefined);
  }
}
