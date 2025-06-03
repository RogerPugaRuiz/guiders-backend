import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration202506031748970880189 implements MigrationInterface {
    name = 'AutoMigration202506031748970880189'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participants" ADD "isAnonymous" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participants" DROP COLUMN "isAnonymous"`);
    }

}
