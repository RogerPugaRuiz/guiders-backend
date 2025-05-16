import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTestEntity1747413482303 implements MigrationInterface {
    name = 'CreateTestEntity1747413482303'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "test_entity" DROP COLUMN "createdAt"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "test_entity" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
