import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConnectionTimeToVisitors1753188314038
  implements MigrationInterface
{
  name = 'AddConnectionTimeToVisitors1753188314038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "visitors" ADD "connectionTime" bigint`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "visitors" DROP COLUMN "connectionTime"`,
    );
  }
}
