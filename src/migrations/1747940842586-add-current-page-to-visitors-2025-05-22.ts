import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrentPageToVisitors202505221747940842586
  implements MigrationInterface
{
  name = 'AddCurrentPageToVisitors202505221747940842586';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "visitors" ADD "currentPage" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "visitors" DROP COLUMN "currentPage"`);
  }
}
