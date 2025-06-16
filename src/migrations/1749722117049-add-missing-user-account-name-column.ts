import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingUserAccountNameColumn1749722117049
  implements MigrationInterface
{
  name = 'AddMissingUserAccountNameColumn1749722117049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" ADD "name" character varying(255) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" DROP COLUMN "name"`,
    );
  }
}
