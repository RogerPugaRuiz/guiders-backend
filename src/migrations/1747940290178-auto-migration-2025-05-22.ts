import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration202505221747940290178 implements MigrationInterface {
  name = 'AutoMigration202505221747940290178';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "visitor_intent" ADD "tags" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "visitor_intent" ADD "priceRange" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "visitor_intent" ADD "navigationPath" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "visitor_intent" ADD "description" character varying(512)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "visitor_intent" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "visitor_intent" DROP COLUMN "navigationPath"`,
    );
    await queryRunner.query(
      `ALTER TABLE "visitor_intent" DROP COLUMN "priceRange"`,
    );
    await queryRunner.query(`ALTER TABLE "visitor_intent" DROP COLUMN "tags"`);
  }
}
