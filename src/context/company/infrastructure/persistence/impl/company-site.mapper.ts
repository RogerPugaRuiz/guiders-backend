import { Site } from '../../../domain/entities/site';
import { CompanySiteTypeOrmEntity } from '../typeorm/company-site.entity';

/**
 * Mapper para convertir entre Site de dominio y CompanySiteTypeOrmEntity de persistencia
 */
export class CompanySiteMapper {
  static toDomain(entity: CompanySiteTypeOrmEntity): {
    domain: string;
    isCanonical: boolean;
  } {
    return {
      domain: entity.domain,
      isCanonical: entity.isCanonical,
    };
  }

  static toPersistence(
    site: Site,
    companyId: string,
  ): CompanySiteTypeOrmEntity[] {
    const primitives = site.toPrimitives();
    const entities: CompanySiteTypeOrmEntity[] = [];

    // Crear entidad para el dominio canónico
    const canonicalEntity = new CompanySiteTypeOrmEntity();
    canonicalEntity.domain = primitives.canonicalDomain;
    canonicalEntity.isCanonical = true;
    canonicalEntity.companyId = companyId;
    entities.push(canonicalEntity);

    // Crear entidades para los aliases
    primitives.domainAliases.forEach((alias) => {
      const aliasEntity = new CompanySiteTypeOrmEntity();
      aliasEntity.domain = alias;
      aliasEntity.isCanonical = false;
      aliasEntity.companyId = companyId;
      entities.push(aliasEntity);
    });

    return entities;
  }

  /**
   * Convierte un array de CompanySiteTypeOrmEntity a un Site de dominio
   */
  static groupToSite(
    entities: CompanySiteTypeOrmEntity[],
    siteName: string,
    siteId: string,
  ): Site {
    const canonical = entities.find((e) => e.isCanonical);
    const aliases = entities.filter((e) => !e.isCanonical).map((e) => e.domain);

    if (!canonical) {
      throw new Error('No se encontró dominio canónico para el sitio');
    }

    return Site.fromPrimitives({
      id: siteId,
      name: siteName,
      canonicalDomain: canonical.domain,
      domainAliases: aliases,
    });
  }
}
