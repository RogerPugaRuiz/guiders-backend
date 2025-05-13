import { Company } from '../../../domain/company';
import { CompanyTypeOrmEntity } from '../entity/company-typeorm.entity';

// Mapper para convertir entre entidad de dominio y persistencia de Company
export class CompanyMapper {
  // Convierte de entidad de persistencia a dominio
  static toDomain(entity: CompanyTypeOrmEntity): Company {
    return Company.fromPrimitives({
      id: entity.id,
      companyName: entity.companyName,
      domain: entity.domain,
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
    entity.domain = primitives.domain;
    entity.createdAt = new Date(primitives.createdAt);
    entity.updatedAt = new Date(primitives.updatedAt);
    return entity;
  }
}
