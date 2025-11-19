import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarUrlToUserAccount1763466100086
  implements MigrationInterface
{
  name = 'AddAvatarUrlToUserAccount1763466100086';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" ADD "avatarUrl" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_account_entity" DROP COLUMN "avatarUrl"`,
    );
  }
}
