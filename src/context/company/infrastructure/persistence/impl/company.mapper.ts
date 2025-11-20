import { Company } from '../../../domain/company.aggregate';
import { CompanyTypeOrmEntity } from '../entity/company-typeorm.entity';
import { CompanySiteMapper } from './company-site.mapper';
import { Site } from '../../../domain/entities/site';

// Mapper para convertir entre entidad de dominio y persistencia de Company
export class CompanyMapper {
  // Convierte de entidad de persistencia a dominio
  static toDomain(entity: CompanyTypeOrmEntity): Company {
    // Convertir sites agrupando por dominio canónico
    const sites: Array<{
      id: string;
      name: string;
      canonicalDomain: string;
      domainAliases: string[];
    }> = [];

    if (entity.sites && entity.sites.length > 0) {
      // Agrupar sites por dominio canónico
      const canonicalSites = entity.sites.filter((site) => site.isCanonical);

      canonicalSites.forEach((canonicalSite, index) => {
        const aliases = entity.sites
          .filter((site) => !site.isCanonical)
          .map((site) => site.domain);

        sites.push({
          id: canonicalSite.id, // Usar el ID real del sitio desde la DB
          name: `Sitio ${index + 1}`,
          canonicalDomain: canonicalSite.domain,
          domainAliases: aliases,
        });
      });
    }

    return Company.fromPrimitives({
      id: entity.id,
      companyName: entity.companyName,
      sites: sites,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });
  }

  // Convierte de entidad de dominio a persistencia
  static toPersistence(company: Company): CompanyTypeOrmEntity {
    const primitives = company.toPrimitives();
    const entity = new CompanyTypeOrmEntity();
    entity.id = primitives.id;
    entity.companyName = primitives.companyName;

    // Crear las entidades de sites para la nueva relación
    const siteEntities = primitives.sites.flatMap((site) =>
      CompanySiteMapper.toPersistence(Site.fromPrimitives(site), primitives.id),
    );
    entity.sites = siteEntities;

    entity.createdAt = new Date(primitives.createdAt);
    entity.updatedAt = new Date(primitives.updatedAt);
    return entity;
  }
}
