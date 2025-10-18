import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTrackingTables1760774070190 implements MigrationInterface {
  name = 'DropTrackingTables1760774070190';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Eliminar tablas de tracking en orden inverso de dependencias
    await queryRunner.query(`DROP TABLE IF EXISTS "tracking_event"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "visitor_intent"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recrear tabla visitor_intent
    await queryRunner.query(
      `CREATE TABLE "visitor_intent" ("id" uuid NOT NULL, "visitorId" uuid NOT NULL, "type" character varying(32) NOT NULL, "confidence" character varying(16) NOT NULL, "detectedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_c56c67270b2c50814656ba3cee4" PRIMARY KEY ("id"))`,
    );

    // Nota: No se recrea tracking_event porque no tenemos la definición original
    // Si se necesita rollback completo, restaurar desde backup de base de datos
  }
}
