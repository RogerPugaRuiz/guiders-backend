import {
  AssignmentRules,
  AssignmentRulesData,
} from '../../../../domain/value-objects/assignment-rules';
import { AssignmentRulesMongoEntity } from '../../entity/assignment-rules-mongoose.entity';

/**
 * Mapper para convertir entre el value object AssignmentRules
 * y la entidad de persistencia MongoDB
 */
export class AssignmentRulesMapper {
  /**
   * Convierte de value object de dominio a entidad de persistencia
   */
  static toPersistence(
    rules: AssignmentRules,
  ): Partial<AssignmentRulesMongoEntity> {
    const primitives = rules.toPrimitives();

    return {
      id: this.generateId(primitives.companyId, primitives.siteId),
      companyId: primitives.companyId,
      siteId: primitives.siteId,
      defaultStrategy: primitives.defaultStrategy,
      maxChatsPerCommercial: primitives.maxChatsPerCommercial,
      maxWaitTimeSeconds: primitives.maxWaitTimeSeconds,
      enableSkillBasedRouting: primitives.enableSkillBasedRouting,
      workingHours: primitives.workingHours,
      fallbackStrategy: primitives.fallbackStrategy,
      priorities: new Map(Object.entries(primitives.priorities)),
      isActive: primitives.isActive,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  /**
   * Convierte de entidad de persistencia a value object de dominio
   */
  static fromPersistence(entity: AssignmentRulesMongoEntity): AssignmentRules {
    const rulesData: AssignmentRulesData = {
      companyId: entity.companyId,
      siteId: entity.siteId,
      defaultStrategy: entity.defaultStrategy,
      maxChatsPerCommercial: entity.maxChatsPerCommercial,
      maxWaitTimeSeconds: entity.maxWaitTimeSeconds,
      enableSkillBasedRouting: entity.enableSkillBasedRouting,
      workingHours: entity.workingHours,
      fallbackStrategy: entity.fallbackStrategy,
      priorities: entity.priorities
        ? Object.fromEntries(entity.priorities)
        : {},
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return AssignmentRules.fromPrimitives(rulesData);
  }

  /**
   * Genera un ID único para la combinación empresa/sitio
   */
  private static generateId(companyId: string, siteId?: string): string {
    return siteId ? `${companyId}:${siteId}` : companyId;
  }

  /**
   * Convierte primitivos directamente a entidad de persistencia
   * Útil para crear nuevas entidades sin instanciar el value object
   */
  static primitivesToPersistence(
    primitives: AssignmentRulesData,
  ): Partial<AssignmentRulesMongoEntity> {
    return {
      id: this.generateId(primitives.companyId, primitives.siteId),
      companyId: primitives.companyId,
      siteId: primitives.siteId,
      defaultStrategy: primitives.defaultStrategy,
      maxChatsPerCommercial: primitives.maxChatsPerCommercial,
      maxWaitTimeSeconds: primitives.maxWaitTimeSeconds,
      enableSkillBasedRouting: primitives.enableSkillBasedRouting,
      workingHours: primitives.workingHours,
      fallbackStrategy: primitives.fallbackStrategy,
      priorities: new Map(Object.entries(primitives.priorities)),
      isActive: primitives.isActive,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
