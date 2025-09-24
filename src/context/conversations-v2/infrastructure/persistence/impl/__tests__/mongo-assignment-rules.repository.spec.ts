import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongoAssignmentRulesRepository } from '../mongo-assignment-rules.repository.impl';
import { AssignmentRules } from '../../../../domain/value-objects/assignment-rules';
import { AssignmentStrategy } from '../../../../domain/services/chat-auto-assignment.domain-service';
import { AssignmentRulesMongoEntity } from '../../entity/assignment-rules-mongoose.entity';

describe('MongoAssignmentRulesRepository', () => {
  let repository: MongoAssignmentRulesRepository;
  let mockModel: any;

  beforeEach(async () => {
    const mockModelInstance = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoAssignmentRulesRepository,
        {
          provide: getModelToken(AssignmentRulesMongoEntity.name),
          useValue: mockModelInstance,
        },
      ],
    }).compile();

    repository = module.get<MongoAssignmentRulesRepository>(
      MongoAssignmentRulesRepository,
    );
    mockModel = module.get(getModelToken(AssignmentRulesMongoEntity.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('debería guardar reglas exitosamente', async () => {
      // Arrange
      const rules = AssignmentRules.create({
        companyId: 'company-123',
        siteId: 'site-456',
        defaultStrategy: AssignmentStrategy.ROUND_ROBIN,
        maxChatsPerCommercial: 5,
        maxWaitTimeSeconds: 300,
        enableSkillBasedRouting: true,
        fallbackStrategy: AssignmentStrategy.RANDOM,
        priorities: { spanish: 3 },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockModel.findOneAndUpdate.mockResolvedValue({});

      // Act
      const result = await repository.save(rules);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('debería manejar errores de guardado', async () => {
      // Arrange
      const rules = AssignmentRules.create({
        companyId: 'company-123',
        defaultStrategy: AssignmentStrategy.WORKLOAD_BALANCED,
        maxChatsPerCommercial: 3,
        maxWaitTimeSeconds: 180,
        enableSkillBasedRouting: false,
        fallbackStrategy: AssignmentStrategy.RANDOM,
        priorities: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockModel.findOneAndUpdate.mockRejectedValue(new Error('DB Error'));

      // Act
      const result = await repository.save(rules);

      // Assert
      expect(result.isErr()).toBe(true);
    });
  });

  describe('findByCompanyAndSite', () => {
    it('debería encontrar reglas existentes', async () => {
      // Arrange
      const mockEntity = {
        companyId: 'company-123',
        defaultStrategy: AssignmentStrategy.ROUND_ROBIN,
        maxChatsPerCommercial: 5,
        maxWaitTimeSeconds: 300,
        enableSkillBasedRouting: false,
        fallbackStrategy: AssignmentStrategy.RANDOM,
        priorities: new Map(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockModel.findOne.mockResolvedValue(mockEntity);

      // Act
      const result = await repository.findByCompanyAndSite('company-123');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockModel.findOne).toHaveBeenCalled();
    });
  });

  describe('findByFilters', () => {
    it('debería filtrar reglas correctamente', async () => {
      // Arrange
      mockModel.find.mockResolvedValue([]);

      // Act
      const result = await repository.findByFilters({ companyId: 'test' });

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockModel.find).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('debería actualizar reglas existentes', async () => {
      // Arrange
      const rules = AssignmentRules.create({
        companyId: 'company-123',
        defaultStrategy: AssignmentStrategy.RANDOM,
        maxChatsPerCommercial: 3,
        maxWaitTimeSeconds: 120,
        enableSkillBasedRouting: false,
        fallbackStrategy: AssignmentStrategy.ROUND_ROBIN,
        priorities: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockModel.updateOne.mockResolvedValue({ matchedCount: 1 });

      // Act
      const result = await repository.update(rules);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockModel.updateOne).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('debería eliminar reglas existentes', async () => {
      // Arrange
      mockModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      // Act
      const result = await repository.delete('company-123');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockModel.deleteOne).toHaveBeenCalled();
    });
  });

  describe('findApplicableRules', () => {
    it('debería encontrar reglas aplicables', async () => {
      // Arrange
      const mockEntity = {
        companyId: 'company-123',
        isActive: true,
        defaultStrategy: AssignmentStrategy.ROUND_ROBIN,
        maxChatsPerCommercial: 5,
        maxWaitTimeSeconds: 300,
        enableSkillBasedRouting: false,
        fallbackStrategy: AssignmentStrategy.RANDOM,
        priorities: new Map(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockModel.findOne.mockResolvedValue(mockEntity);

      // Act
      const result = await repository.findApplicableRules('company-123');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockModel.findOne).toHaveBeenCalled();
    });
  });
});
