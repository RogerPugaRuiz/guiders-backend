import {
  AssignmentStrategy,
  AssignmentCriteria,
  CommercialInfo,
} from '../chat-auto-assignment.domain-service';

describe('ChatAutoAssignmentDomainService - Interfaces', () => {
  describe('AssignmentStrategy enum', () => {
    it('debería contener todas las estrategias esperadas', () => {
      expect(AssignmentStrategy.ROUND_ROBIN).toBe('ROUND_ROBIN');
      expect(AssignmentStrategy.WORKLOAD_BALANCED).toBe('WORKLOAD_BALANCED');
      expect(AssignmentStrategy.SKILL_BASED).toBe('SKILL_BASED');
      expect(AssignmentStrategy.RANDOM).toBe('RANDOM');
    });
  });

  describe('interfaces', () => {
    it('debería definir CommercialInfo correctamente', () => {
      const commercialInfo: CommercialInfo = {
        id: 'commercial-1',
        name: 'Juan Pérez',
        isOnline: true,
        currentChats: 2,
        maxChats: 5,
        skills: ['ventas', 'soporte'],
        lastAssignedAt: new Date(),
        lastActivity: new Date(),
        priority: 5,
      };

      expect(commercialInfo.id).toBe('commercial-1');
      expect(commercialInfo.name).toBe('Juan Pérez');
      expect(commercialInfo.isOnline).toBe(true);
      expect(commercialInfo.currentChats).toBe(2);
      expect(commercialInfo.maxChats).toBe(5);
      expect(commercialInfo.skills).toEqual(['ventas', 'soporte']);
      expect(commercialInfo.priority).toBe(5);
    });

    it('debería definir AssignmentCriteria correctamente', () => {
      const criteria: AssignmentCriteria = {
        strategy: AssignmentStrategy.SKILL_BASED,
        requiredSkills: ['ventas'],
        maxWaitTimeSeconds: 300,
        priorityWeight: 1.5,
        excludeCommercialIds: ['commercial-2'],
      };

      expect(criteria.strategy).toBe(AssignmentStrategy.SKILL_BASED);
      expect(criteria.requiredSkills).toEqual(['ventas']);
      expect(criteria.maxWaitTimeSeconds).toBe(300);
      expect(criteria.priorityWeight).toBe(1.5);
      expect(criteria.excludeCommercialIds).toEqual(['commercial-2']);
    });
  });
});
