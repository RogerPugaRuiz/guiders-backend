import { IntegrationApiKeyCompanyId } from './integration-api-key-company-id';
import { IntegrationApiKeyEnvironment } from './integration-api-key-environment';
import { IntegrationApiKeyId } from './integration-api-key-id';
import { IntegrationApiKeyName } from './integration-api-key-name';
import { IntegrationApiKeyStatus } from './integration-api-key-status';
import { IntegrationApiKeyToken } from './integration-api-key-token';

/**
 * Aggregate raíz para las API Keys de integración REST.
 * Estas claves permiten a developers externos llamar a la API pública de Guiders.
 * Son distintas a las ApiKey del widget de tracking (que usan RSA/JWKS).
 *
 * Formato del token: gdr_live_<32 hex> | gdr_test_<32 hex>
 * Solo se almacena el hash del token; el valor en claro se devuelve una sola vez.
 */
export class IntegrationApiKey {
  private constructor(
    public readonly id: IntegrationApiKeyId,
    public readonly companyId: IntegrationApiKeyCompanyId,
    public readonly name: IntegrationApiKeyName,
    public readonly tokenHash: IntegrationApiKeyToken,
    public readonly tokenPrefix: string,
    public readonly environment: IntegrationApiKeyEnvironment,
    public readonly status: IntegrationApiKeyStatus,
    public readonly createdAt: Date,
    public readonly lastUsedAt: Date | null,
    public readonly revokedAt: Date | null,
  ) {}

  public static create(params: {
    companyId: IntegrationApiKeyCompanyId;
    name: IntegrationApiKeyName;
    tokenHash: IntegrationApiKeyToken;
    tokenPrefix: string;
    environment: IntegrationApiKeyEnvironment;
  }): IntegrationApiKey {
    return new IntegrationApiKey(
      IntegrationApiKeyId.random(),
      params.companyId,
      params.name,
      params.tokenHash,
      params.tokenPrefix,
      params.environment,
      IntegrationApiKeyStatus.ACTIVE,
      new Date(),
      null,
      null,
    );
  }

  public static fromPrimitives(params: {
    id: string;
    companyId: string;
    name: string;
    tokenHash: string;
    tokenPrefix: string;
    environment: string;
    status: string;
    createdAt: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
  }): IntegrationApiKey {
    return new IntegrationApiKey(
      IntegrationApiKeyId.create(params.id),
      IntegrationApiKeyCompanyId.create(params.companyId),
      IntegrationApiKeyName.of(params.name),
      IntegrationApiKeyToken.of(params.tokenHash),
      params.tokenPrefix,
      IntegrationApiKeyEnvironment.of(params.environment),
      IntegrationApiKeyStatus.of(params.status),
      params.createdAt,
      params.lastUsedAt,
      params.revokedAt,
    );
  }

  public revoke(): IntegrationApiKey {
    return new IntegrationApiKey(
      this.id,
      this.companyId,
      this.name,
      this.tokenHash,
      this.tokenPrefix,
      this.environment,
      IntegrationApiKeyStatus.REVOKED,
      this.createdAt,
      this.lastUsedAt,
      new Date(),
    );
  }

  public markUsed(): IntegrationApiKey {
    return new IntegrationApiKey(
      this.id,
      this.companyId,
      this.name,
      this.tokenHash,
      this.tokenPrefix,
      this.environment,
      this.status,
      this.createdAt,
      new Date(),
      this.revokedAt,
    );
  }

  public toPrimitives() {
    return {
      id: this.id.getValue(),
      companyId: this.companyId.getValue(),
      name: this.name.getValue(),
      tokenHash: this.tokenHash.getValue(),
      tokenPrefix: this.tokenPrefix,
      environment: this.environment.getValue(),
      status: this.status.getValue(),
      createdAt: this.createdAt,
      lastUsedAt: this.lastUsedAt,
      revokedAt: this.revokedAt,
    };
  }
}
