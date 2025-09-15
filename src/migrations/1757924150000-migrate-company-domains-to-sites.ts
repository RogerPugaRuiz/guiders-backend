import { MigrationInterface, QueryRunner } from 'typeorm';

interface CompanyWithDomains {
  id: string;
  domains: string[];
}

export class MigrateCompanyDomainsToSites1757924150000
  implements MigrationInterface
{
  name = 'MigrateCompanyDomainsToSites1757924150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear la tabla company_sites
    await queryRunner.query(`
      CREATE TABLE "company_sites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "domain" character varying(255) NOT NULL,
        "is_canonical" boolean NOT NULL DEFAULT false,
        "company_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_sites" PRIMARY KEY ("id")
      )
    `);

    // 2. Agregar foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "company_sites" 
      ADD CONSTRAINT "FK_company_sites_company_id" 
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);

    // 3. Migrar datos existentes de domains[] a company_sites
    // Obtener todas las empresas con sus dominios
    const companies = (await queryRunner.query(`
      SELECT id, domains FROM companies WHERE domains IS NOT NULL AND array_length(domains, 1) > 0
    `)) as CompanyWithDomains[];

    for (const company of companies) {
      const domains = company.domains;
      if (domains && domains.length > 0) {
        // El primer dominio será canónico, el resto serán aliases
        for (let i = 0; i < domains.length; i++) {
          const domain = domains[i];
          const isCanonical = i === 0;

          await queryRunner.query(
            `
            INSERT INTO company_sites (domain, is_canonical, company_id, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
          `,
            [domain, isCanonical, company.id],
          );
        }
      }
    }

    // 4. Nota: No eliminamos la columna domains todavía para mantener compatibilidad
    // Esto se hará en una migración posterior después de verificar que todo funciona
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar la tabla company_sites (los datos en domains[] seguirán existiendo)
    await queryRunner.query(`DROP TABLE "company_sites"`);
  }
}
