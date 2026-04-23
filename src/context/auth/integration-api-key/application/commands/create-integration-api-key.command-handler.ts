import { Inject, Injectable } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  INTEGRATION_API_KEY_REPOSITORY,
  IntegrationApiKeyRepository,
} from '../../domain/repository/integration-api-key.repository';
import {
  INTEGRATION_API_KEY_GENERATOR,
  IntegrationApiKeyGenerator,
} from '../services/integration-api-key-generator';
import { IntegrationApiKey } from '../../domain/model/integration-api-key.aggregate';
import { IntegrationApiKeyCompanyId } from '../../domain/model/integration-api-key-company-id';
import { IntegrationApiKeyName } from '../../domain/model/integration-api-key-name';
import { IntegrationApiKeyEnvironment } from '../../domain/model/integration-api-key-environment';
import { IntegrationApiKeyToken } from '../../domain/model/integration-api-key-token';
import { CreateIntegrationApiKeyCommand } from './create-integration-api-key.command';

export interface CreateIntegrationApiKeyResult {
  id: string;
  name: string;
  plainToken: string;
  tokenPrefix: string;
  environment: string;
  createdAt: Date;
}

@Injectable()
export class CreateIntegrationApiKeyCommandHandler {
  constructor(
    @Inject(INTEGRATION_API_KEY_REPOSITORY)
    private readonly repository: IntegrationApiKeyRepository,
    @Inject(INTEGRATION_API_KEY_GENERATOR)
    private readonly generator: IntegrationApiKeyGenerator,
  ) {}

  async execute(
    command: CreateIntegrationApiKeyCommand,
  ): Promise<Result<CreateIntegrationApiKeyResult, DomainError>> {
    const { plainToken, tokenPrefix, tokenHash } =
      await this.generator.generate(command.environment);

    const key = IntegrationApiKey.create({
      companyId: IntegrationApiKeyCompanyId.create(command.companyId),
      name: IntegrationApiKeyName.create(command.name),
      tokenHash: IntegrationApiKeyToken.create(tokenHash),
      tokenPrefix,
      environment: IntegrationApiKeyEnvironment.create(command.environment),
    });

    await this.repository.save(key);

    return ok({
      id: key.id.getValue(),
      name: key.name.getValue(),
      plainToken,
      tokenPrefix,
      environment: key.environment.getValue(),
      createdAt: key.createdAt,
    });
  }
}
