import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCurrentPageAndConnectionTimeFromVisitors1756920000000
  implements MigrationInterface
{
  name = 'DropCurrentPageAndConnectionTimeFromVisitors1756920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "visitors" DROP COLUMN IF EXISTS "currentPage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "visitors" DROP COLUMN IF EXISTS "connectionTime"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "visitors" ADD "currentPage" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "visitors" ADD "connectionTime" bigint`,
    );
  }
}
