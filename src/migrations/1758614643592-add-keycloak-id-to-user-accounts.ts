import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeycloakIdToUserAccounts1758614643592
  implements MigrationInterface
{
  name = 'AddKeycloakIdToUserAccounts1758614643592';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" ADD "keycloakId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" ADD CONSTRAINT "UQ_c1feeab2a3c36646328ce3ea2ad" UNIQUE ("keycloakId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" DROP CONSTRAINT "UQ_c1feeab2a3c36646328ce3ea2ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" DROP COLUMN "keycloakId"`,
    );
  }
}
