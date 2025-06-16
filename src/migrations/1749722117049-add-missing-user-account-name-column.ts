import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingUserAccountNameColumn1749722117049
  implements MigrationInterface
{
  name = 'AddMissingUserAccountNameColumn1749722117049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar la columna con un valor por defecto para filas existentes
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" ADD "name" character varying(255) NOT NULL DEFAULT 'Default Name'`,
    );

    // Remover el valor por defecto para mantener el esquema deseado
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" ALTER COLUMN "name" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" DROP COLUMN "name"`,
    );
  }
}
