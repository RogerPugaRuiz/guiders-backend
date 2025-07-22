// Prueba unitaria para TypeOrmVisitorAdapter
// Ubicación: src/context/visitors/infrastructure/persistence/__tests__/type-orm-visitor.adapter.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TypeOrmVisitorAdapter } from '../type-orm-visitor.adapter';
import { VisitorTypeOrmEntity } from '../visitor-typeorm.entity';
import { Visitor } from '../../../domain/visitor';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { Criteria } from 'src/context/shared/domain/criteria';
import { CriteriaConverter } from 'src/context/shared/infrastructure/criteria-converter/criteria-converter';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

// Mock de CriteriaConverter
jest.mock(
  'src/context/shared/infrastructure/criteria-converter/criteria-converter',
);

describe('TypeOrmVisitorAdapter', () => {
  let adapter: TypeOrmVisitorAdapter;
  let repository: jest.Mocked<Repository<VisitorTypeOrmEntity>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<VisitorTypeOrmEntity>>;

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    } as any;

    const mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmVisitorAdapter,
        {
          provide: getRepositoryToken(VisitorTypeOrmEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    adapter = module.get<TypeOrmVisitorAdapter>(TypeOrmVisitorAdapter);
    repository = module.get(getRepositoryToken(VisitorTypeOrmEntity));
  });

  it('debe estar definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('findById', () => {
    it('debe encontrar un visitor por ID correctamente', async () => {
      // Arrange
      const visitorId = new VisitorId(Uuid.generate());
      const mockEntity = new VisitorTypeOrmEntity();
      mockEntity.id = visitorId.value;
      mockEntity.name = 'Test User';
      mockEntity.email = 'test@example.com';
      mockEntity.tel = '+34123456789';
      mockEntity.tags = ['test'];
      mockEntity.notes = ['nota'];
      mockEntity.currentPage = '/home';

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockEntity);

      // Act
      const result = await adapter.findById(visitorId);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const visitor = result.unwrap();
        expect(visitor).toBeInstanceOf(Visitor);
        const primitives = visitor.toPrimitives();
        expect(primitives.id).toBe(visitorId.value);
        expect(primitives.name).toBe('Test User');
      }
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: visitorId.value },
      });
    });

    it('debe retornar error cuando no encuentra el visitor', async () => {
      // Arrange
      const visitorId = new VisitorId(Uuid.generate());
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await adapter.findById(visitorId);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Visitor no encontrado');
      }
    });

    it('debe manejar errores de base de datos', async () => {
      // Arrange
      const visitorId = new VisitorId(Uuid.generate());
      const dbError = new Error('Database connection failed');
      jest.spyOn(repository, 'findOne').mockRejectedValue(dbError);

      // Act
      const result = await adapter.findById(visitorId);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Error al buscar Visitor');
      }
    });
  });

  describe('save', () => {
    it('debe guardar un visitor correctamente', async () => {
      // Arrange
      const visitor = Visitor.fromPrimitives({
        id: Uuid.generate(),
        name: 'Test User',
        email: 'test@example.com',
        tel: '+34123456789',
        tags: ['test'],
        notes: ['nota'],
        currentPage: '/home',
        connectionTime: 1500,
      });

      jest
        .spyOn(repository, 'save')
        .mockResolvedValue(new VisitorTypeOrmEntity());

      // Act
      const result = await adapter.save(visitor);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('debe manejar errores al guardar', async () => {
      // Arrange
      const visitor = Visitor.fromPrimitives({
        id: Uuid.generate(),
        name: 'Test User',
        email: 'test@example.com',
        tel: '+34123456789',
        tags: ['test'],
        notes: ['nota'],
        currentPage: '/home',
        connectionTime: 1500,
      });

      const saveError = new Error('Database save failed');
      jest.spyOn(repository, 'save').mockRejectedValue(saveError);

      // Act
      const result = await adapter.save(visitor);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Error al guardar Visitor');
      }
    });
  });

  describe('match', () => {
    const mockCriteria = new Criteria<Visitor>();

    it('debe buscar visitors usando criterios', async () => {
      // Arrange
      const mockSql = 'id = :id';
      const mockParameters = { id: '123' };
      (CriteriaConverter.toPostgresSql as jest.Mock).mockReturnValue({
        sql: `WHERE ${mockSql}`,
        parameters: mockParameters,
      });

      const mockEntities = [
        {
          id: Uuid.generate(),
          name: 'Test User 1',
          email: 'test1@example.com',
          tel: '+34123456789',
          tags: ['test'],
          notes: ['nota'],
          currentPage: '/home',
          connectionTime: 2000,
        },
      ];
      queryBuilder.getMany.mockResolvedValue(mockEntities);

      // Act
      const result = await adapter.match(mockCriteria);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toBeInstanceOf(Visitor);
      }
      expect(CriteriaConverter.toPostgresSql).toHaveBeenCalledWith(
        mockCriteria,
        'visitors',
        expect.objectContaining({
          id: 'id',
          name: 'name',
          email: 'email',
          tel: 'tel',
          tags: 'tags',
          notes: 'notes',
          currentPage: 'currentPage',
        }),
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(mockSql);
      expect(queryBuilder.setParameters).toHaveBeenCalledWith(mockParameters);
    });

    it('debe retornar array vacío cuando no hay coincidencias', async () => {
      // Arrange
      (CriteriaConverter.toPostgresSql as jest.Mock).mockReturnValue({
        sql: 'WHERE id = :id',
        parameters: { id: '123' },
      });
      queryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await adapter.match(mockCriteria);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('debe manejar errores en la query', async () => {
      // Arrange
      const error = new Error('SQL error');
      (CriteriaConverter.toPostgresSql as jest.Mock).mockReturnValue({
        sql: 'WHERE id = :id',
        parameters: { id: '123' },
      });
      queryBuilder.getMany.mockRejectedValue(error);

      // Act
      const result = await adapter.match(mockCriteria);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Error al buscar Visitors: SQL error',
        );
      }
    });

    it('debe manejar errores del CriteriaConverter', async () => {
      // Arrange
      const error = new Error('Criteria conversion error');
      (CriteriaConverter.toPostgresSql as jest.Mock).mockImplementation(() => {
        throw error;
      });

      // Act
      const result = await adapter.match(mockCriteria);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          'Error al buscar Visitors: Criteria conversion error',
        );
      }
    });
  });
});
