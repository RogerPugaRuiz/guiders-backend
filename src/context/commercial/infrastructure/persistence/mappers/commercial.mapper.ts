import { Injectable } from '@nestjs/common';
import { Commercial } from '../../../domain/commercial.aggregate';
import { CommercialSchema } from '../schemas/commercial.schema';

/**
 * Mapper para convertir entre Commercial (dominio) y CommercialSchema (persistencia)
 */
@Injectable()
export class CommercialMapper {
  /**
   * Convierte de dominio a schema de persistencia
   */
  static toSchema(commercial: Commercial): Partial<CommercialSchema> {
    const primitives = commercial.toPrimitives();

    return {
      id: primitives.id,
      name: primitives.name,
      connectionStatus: primitives.connectionStatus,
      lastActivity: primitives.lastActivity,
      metadata: primitives.metadata,
    };
  }

  /**
   * Convierte de schema de persistencia a dominio
   */
  static toDomain(schema: CommercialSchema): Commercial {
    return Commercial.fromPrimitives({
      id: schema.id,
      name: schema.name,
      connectionStatus: schema.connectionStatus,
      lastActivity: schema.lastActivity,
      createdAt: schema.createdAt || new Date(),
      updatedAt: schema.updatedAt || new Date(),
      metadata: schema.metadata,
    });
  }

  /**
   * Convierte lista de schemas a lista de agregados de dominio
   */
  static toDomainList(schemas: CommercialSchema[]): Commercial[] {
    return schemas.map((schema) => this.toDomain(schema));
  }

  /**
   * Convierte lista de agregados de dominio a lista de schemas
   */
  static toSchemaList(commercials: Commercial[]): Partial<CommercialSchema>[] {
    return commercials.map((commercial) => this.toSchema(commercial));
  }
}
