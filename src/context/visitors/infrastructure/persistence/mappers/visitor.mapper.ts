// Clase responsable de mapear entre la entidad de infraestructura y la entidad de dominio Visitor
// Se ubica en infrastructure/persistence/mappers/visitor.mapper.ts
import { Visitor } from '../../../domain/visitor';
import { VisitorTypeOrmEntity } from '../visitor-typeorm.entity';

export class VisitorMapper {
  // Convierte una entidad de infraestructura a una entidad de dominio
  static fromPersistence(entity: VisitorTypeOrmEntity): Visitor {
    return Visitor.fromPrimitives({
      id: entity.id,
      name: entity.name,
      email: entity.email,
      tel: entity.tel,
      tags: entity.tags,
    });
  }

  // Convierte una entidad de dominio a una entidad de infraestructura
  static toPersistence(visitor: Visitor): VisitorTypeOrmEntity {
    const primitives = visitor.toPrimitives();
    const entity = new VisitorTypeOrmEntity();
    entity.id = primitives.id;
    entity.name = primitives.name;
    entity.email = primitives.email;
    entity.tel = primitives.tel;
    entity.tags = primitives.tags;
    // currentPage y connectionTime eliminados
    return entity;
  }
}
