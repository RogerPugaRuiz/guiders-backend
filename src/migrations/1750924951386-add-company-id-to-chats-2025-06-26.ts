import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyIdToChats202506261750924951386
  implements MigrationInterface
{
  name = 'AddCompanyIdToChats202506261750924951386';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar la columna como nullable primero
    await queryRunner.query(`ALTER TABLE "chats" ADD "companyId" uuid`);

    // Actualizar registros existentes con un UUID por defecto
    // Nota: Debes reemplazar 'your-default-company-id' con un UUID válido de tu empresa
    await queryRunner.query(
      `UPDATE "chats" SET "companyId" = uuid_generate_v4() WHERE "companyId" IS NULL`,
    );

    // Hacer la columna NOT NULL
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "companyId" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "companyId"`);
  }
}
