import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita la extensión pg_trgm y crea un índice GIN en la columna company_name
 * de la tabla companies para soportar búsquedas ILIKE eficientes desde CompanySearchProvider.
 */
export class AddPgtrgmIndexToCompanies1764000000000
  implements MigrationInterface
{
  name = 'AddPgtrgmIndexToCompanies1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Habilitar extensión pg_trgm (requiere superuser o pg_extension privilege)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Crear índice GIN sobre company_name para soportar ILIKE eficientemente
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_companies_company_name_trgm
       ON companies USING GIN (company_name gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_companies_company_name_trgm`,
    );
    // No se elimina la extensión pg_trgm ya que puede ser usada por otras tablas
  }
}
