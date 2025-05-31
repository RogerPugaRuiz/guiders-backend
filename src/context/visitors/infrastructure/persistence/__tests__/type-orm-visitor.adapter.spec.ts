// Prueba unitaria para TypeOrmVisitorAdapter
// Ubicación: src/context/visitors/infrastructure/persistence/__tests__/type-orm-visitor.adapter.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmVisitorAdapter } from '../type-orm-visitor.adapter';
import { VisitorTypeOrmEntity } from '../visitor-typeorm.entity';
import { Visitor } from '../../../domain/visitor';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

describe('TypeOrmVisitorAdapter', () => {
  let adapter: TypeOrmVisitorAdapter;
  let repository: Repository<VisitorTypeOrmEntity>;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
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
    repository = module.get<Repository<VisitorTypeOrmEntity>>(
      getRepositoryToken(VisitorTypeOrmEntity),
    );
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
      });

      jest.spyOn(repository, 'save').mockResolvedValue(new VisitorTypeOrmEntity());

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
});