import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIntegrationApiKeys1763900000000
  implements MigrationInterface
{
  name = 'CreateIntegrationApiKeys1763900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "integration_api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "tokenHash" character varying NOT NULL,
        "tokenPrefix" character varying(20) NOT NULL,
        "environment" character varying(10) NOT NULL DEFAULT 'live',
        "status" character varying(10) NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "lastUsedAt" TIMESTAMP WITH TIME ZONE,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_integration_api_keys_tokenHash" UNIQUE ("tokenHash"),
        CONSTRAINT "PK_integration_api_keys" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_integration_api_keys_companyId" ON "integration_api_keys" ("companyId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_integration_api_keys_tokenHash" ON "integration_api_keys" ("tokenHash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_integration_api_keys_tokenHash"`);
    await queryRunner.query(`DROP INDEX "IDX_integration_api_keys_companyId"`);
    await queryRunner.query(`DROP TABLE "integration_api_keys"`);
  }
}
