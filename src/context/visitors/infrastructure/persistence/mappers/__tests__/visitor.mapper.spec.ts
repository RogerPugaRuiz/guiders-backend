// Prueba unitaria para VisitorMapper
// Ubicación: src/context/visitors/infrastructure/persistence/mappers/__tests__/visitor.mapper.spec.ts
import { VisitorMapper } from '../visitor.mapper';
import { VisitorTypeOrmEntity } from '../../visitor-typeorm.entity';
import { Visitor } from '../../../../domain/visitor';
import { Uuid } from '../../../../../shared/domain/value-objects/uuid';

describe('VisitorMapper', () => {
  describe('fromPersistence', () => {
    it('debe convertir entidad TypeORM a entidad de dominio correctamente', () => {
      // Arrange
      const entity = new VisitorTypeOrmEntity();
      entity.id = '123e4567-e89b-12d3-a456-426614174000';
      entity.name = 'Juan Pérez';
      entity.email = 'juan@test.com';
      entity.tel = '+34123456789';
      entity.tags = ['premium', 'vip'];
      entity.notes = ['Primera nota', 'Segunda nota'];
      entity.currentPage = '/home';

      // Act
      const visitor = VisitorMapper.fromPersistence(entity);

      // Assert
      expect(visitor).toBeInstanceOf(Visitor);
      const primitives = visitor.toPrimitives();
      expect(primitives.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(primitives.name).toBe('Juan Pérez');
      expect(primitives.email).toBe('juan@test.com');
      expect(primitives.tel).toBe('+34123456789');
      expect(primitives.tags).toEqual(['premium', 'vip']);
      expect(primitives.notes).toEqual(['Primera nota', 'Segunda nota']);
      expect(primitives.currentPage).toBe('/home');
    });

    it('debe manejar entidad con valores nulos/opcionales', () => {
      // Arrange
      const entity = new VisitorTypeOrmEntity();
      entity.id = '987fcdeb-51a2-43d1-9a67-123456789abc';
      entity.name = null;
      entity.email = null;
      entity.tel = null;
      entity.tags = [];
      entity.notes = [];
      entity.currentPage = null;

      // Act
      const visitor = VisitorMapper.fromPersistence(entity);

      // Assert
      expect(visitor).toBeInstanceOf(Visitor);
      const primitives = visitor.toPrimitives();
      expect(primitives.id).toBe('987fcdeb-51a2-43d1-9a67-123456789abc');
      expect(primitives.name).toBeNull();
      expect(primitives.email).toBeNull();
      expect(primitives.tel).toBeNull();
      expect(primitives.tags).toEqual([]);
      expect(primitives.notes).toEqual([]);
      expect(primitives.currentPage).toBeNull();
    });
  });

  describe('toPersistence', () => {
    it('debe convertir entidad de dominio a entidad TypeORM correctamente', () => {
      // Arrange
      const validUuid = Uuid.generate();
      const visitor = Visitor.fromPrimitives({
        id: validUuid,
        name: 'María García',
        email: 'maria@test.com',
        tel: '+34987654321',
        tags: ['standard'],
        notes: ['Nota de prueba'],
        currentPage: '/contact',
      });

      // Act
      const entity = VisitorMapper.toPersistence(visitor);

      // Assert
      expect(entity).toBeInstanceOf(VisitorTypeOrmEntity);
      expect(entity.id).toBe(validUuid);
      expect(entity.name).toBe('María García');
      expect(entity.email).toBe('maria@test.com');
      expect(entity.tel).toBe('+34987654321');
      expect(entity.tags).toEqual(['standard']);
      expect(entity.notes).toEqual(['Nota de prueba']);
      expect(entity.currentPage).toBe('/contact');
    });

    it('debe manejar visitor con valores opcionales nulos', () => {
      // Arrange
      const validUuid = Uuid.generate();
      const visitor = Visitor.fromPrimitives({
        id: validUuid,
        name: null,
        email: null,
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
      });

      // Act
      const entity = VisitorMapper.toPersistence(visitor);

      // Assert
      expect(entity).toBeInstanceOf(VisitorTypeOrmEntity);
      expect(entity.id).toBe(validUuid);
      expect(entity.name).toBeNull();
      expect(entity.email).toBeNull();
      expect(entity.tel).toBeNull();
      expect(entity.tags).toEqual([]);
      expect(entity.notes).toEqual([]);
      expect(entity.currentPage).toBeNull();
    });
  });

  describe('bidirectional mapping', () => {
    it('debe mantener datos consistentes en conversión ida y vuelta', () => {
      // Arrange
      const validUuid = Uuid.generate();
      const originalData = {
        id: validUuid,
        name: 'Test User',
        email: 'test@example.com',
        tel: '+34111222333',
        tags: ['test', 'bidirectional'],
        notes: ['Nota 1', 'Nota 2'],
        currentPage: '/test-page',
      };

      // Act
      const visitor = Visitor.fromPrimitives(originalData);
      const entity = VisitorMapper.toPersistence(visitor);
      const mappedBackVisitor = VisitorMapper.fromPersistence(entity);

      // Assert
      const finalPrimitives = mappedBackVisitor.toPrimitives();
      expect(finalPrimitives).toEqual(originalData);
    });
  });
});
