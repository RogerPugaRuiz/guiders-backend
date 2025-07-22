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
      notes: entity.notes,
      currentPage: entity.currentPage, // Mapeo del nuevo campo
      connectionTime:
        typeof entity.connectionTime === 'string'
          ? parseInt(entity.connectionTime, 10)
          : entity.connectionTime, // Conversión manual de string a number
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
    entity.notes = primitives.notes;
    entity.currentPage = primitives.currentPage; // Mapeo del nuevo campo
    entity.connectionTime = primitives.connectionTime; // Mapeo del tiempo de conexión
    return entity;
  }
}
