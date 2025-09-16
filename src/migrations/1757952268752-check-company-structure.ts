import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckCompanyStructure1757952268752 implements MigrationInterface {
  name = 'CheckCompanyStructure1757952268752';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company_sites" DROP CONSTRAINT "FK_company_sites_company_id"`,
    );
    await queryRunner.query(`ALTER TABLE "visitors" DROP COLUMN "notes"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "domains"`);
    await queryRunner.query(
      `ALTER TABLE "company_sites" ADD CONSTRAINT "FK_11e8e1d827161f4cb3b571c6dff" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company_sites" DROP CONSTRAINT "FK_11e8e1d827161f4cb3b571c6dff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "domains" text array NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "visitors" ADD "notes" text`);
    await queryRunner.query(
      `ALTER TABLE "company_sites" ADD CONSTRAINT "FK_company_sites_company_id" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
