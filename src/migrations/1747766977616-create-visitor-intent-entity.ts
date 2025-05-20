import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVisitorIntentEntity1747766977616 implements MigrationInterface {
    name = 'CreateVisitorIntentEntity1747766977616'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "visitor_intent" ("id" uuid NOT NULL, "visitorId" uuid NOT NULL, "type" character varying(32) NOT NULL, "confidence" character varying(16) NOT NULL, "detectedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_c56c67270b2c50814656ba3cee4" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "visitor_intent"`);
    }

}
