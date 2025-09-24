import { AssignmentRules, AssignmentRulesData } from '../assignment-rules';
import { AssignmentStrategy } from '../../services/chat-auto-assignment.domain-service';

describe('AssignmentRules Value Object', () => {
  const validRulesData: AssignmentRulesData = {
    companyId: 'company-123',
    siteId: 'site-456',
    defaultStrategy: AssignmentStrategy.ROUND_ROBIN,
    maxChatsPerCommercial: 5,
    maxWaitTimeSeconds: 300,
    enableSkillBasedRouting: true,
    fallbackStrategy: AssignmentStrategy.RANDOM,
    priorities: {
      ventas: 10,
      soporte: 7,
    },
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  describe('create', () => {
    it('debería crear instancia válida con datos correctos', () => {
      const rules = AssignmentRules.create(validRulesData);

      expect(rules.companyId).toBe('company-123');
      expect(rules.siteId).toBe('site-456');
      expect(rules.defaultStrategy).toBe(AssignmentStrategy.ROUND_ROBIN);
      expect(rules.maxChatsPerCommercial).toBe(5);
      expect(rules.isActive).toBe(true);
    });

    it('debería lanzar error si companyId está vacío', () => {
      const invalidData = { ...validRulesData, companyId: '' };

      expect(() => AssignmentRules.create(invalidData)).toThrow(
        'Company ID es requerido',
      );
    });

    it('debería lanzar error si maxChatsPerCommercial es inválido', () => {
      const invalidData = { ...validRulesData, maxChatsPerCommercial: 0 };

      expect(() => AssignmentRules.create(invalidData)).toThrow(
        'Max chats per commercial debe ser mayor a 0',
      );
    });
  });

  describe('isWithinWorkingHours', () => {
    it('debería retornar true si no hay horarios definidos', () => {
      const rules = AssignmentRules.create({
        ...validRulesData,
        workingHours: undefined,
      });

      const result = rules.isWithinWorkingHours();

      expect(result).toBe(true);
    });
  });

  describe('getActiveStrategy', () => {
    it('debería retornar defaultStrategy si está activo', () => {
      const rules = AssignmentRules.create(validRulesData);

      const strategy = rules.getActiveStrategy();

      expect(strategy).toBe(AssignmentStrategy.ROUND_ROBIN);
    });

    it('debería retornar fallbackStrategy si está inactivo', () => {
      const rules = AssignmentRules.create({
        ...validRulesData,
        isActive: false,
      });

      const strategy = rules.getActiveStrategy();

      expect(strategy).toBe(AssignmentStrategy.RANDOM);
    });
  });

  describe('appliesTo', () => {
    it('debería aplicar a la empresa y sitio correctos', () => {
      const rules = AssignmentRules.create(validRulesData);

      const applies = rules.appliesTo('company-123', 'site-456');

      expect(applies).toBe(true);
    });

    it('debería no aplicar a empresa diferente', () => {
      const rules = AssignmentRules.create(validRulesData);

      const applies = rules.appliesTo('company-999', 'site-456');

      expect(applies).toBe(false);
    });
  });

  describe('toPrimitives', () => {
    it('debería convertir a objeto plano', () => {
      const rules = AssignmentRules.create(validRulesData);
      const primitives = rules.toPrimitives();

      expect(primitives).toEqual(validRulesData);
    });
  });
});
