// Prueba unitaria para UpdateVisitorCurrentPageCommandHandler
// Ubicación: src/context/visitors/application/commands/__tests__/update-visitor-current-page-command.handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateVisitorCurrentPageCommandHandler } from '../update-visitor-current-page-command.handler';
import { UpdateVisitorCurrentPageCommand } from '../update-visitor-current-page.command';
import { IVisitorRepository, VISITOR_REPOSITORY } from '../../../domain/visitor.repository';
import { ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { VisitorCurrentPage } from '../../../domain/value-objects/visitor-current-page';

describe('UpdateVisitorCurrentPageCommandHandler', () => {
  let handler: UpdateVisitorCurrentPageCommandHandler;
  let mockRepository: jest.Mocked<IVisitorRepository>;

  beforeEach(async () => {
    // Crear mock del repositorio
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      findByCriteria: jest.fn(),
    };

    // Configuración del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVisitorCurrentPageCommandHandler,
        {
          provide: VISITOR_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<UpdateVisitorCurrentPageCommandHandler>(
      UpdateVisitorCurrentPageCommandHandler,
    );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  it('debe actualizar la página actual del visitante exitosamente', async () => {
    // Arrange
    const command = new UpdateVisitorCurrentPageCommand(
      '123e4567-e89b-12d3-a456-426614174000',
      '/products/category-1'
    );

    const mockVisitor = {
      updateCurrentPage: jest.fn().mockReturnValue({
        id: { value: '123e4567-e89b-12d3-a456-426614174000' },
        currentPage: { value: '/products/category-1' },
      }),
    } as any;

    // Mock de éxito para encontrar el visitante
    mockRepository.findById.mockResolvedValue(ok(mockVisitor));
    
    // Mock de éxito para guardar
    mockRepository.save.mockResolvedValue(ok(undefined));

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(mockRepository.findById).toHaveBeenCalledWith(
      expect.objectContaining({
        value: '123e4567-e89b-12d3-a456-426614174000'
      })
    );
    expect(mockVisitor.updateCurrentPage).toHaveBeenCalledWith(
      expect.any(VisitorCurrentPage)
    );
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('debe devolver error cuando el visitante no existe', async () => {
    // Arrange
    const command = new UpdateVisitorCurrentPageCommand(
      '123e4567-e89b-12d3-a456-426614174000',
      '/products/category-1'
    );

    const notFoundError = new DomainError('Visitor not found');
    
    // Mock de error para encontrar el visitante
    mockRepository.findById.mockResolvedValue(err(notFoundError));

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(notFoundError);
    expect(mockRepository.findById).toHaveBeenCalled();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('debe devolver error cuando falla al guardar', async () => {
    // Arrange
    const command = new UpdateVisitorCurrentPageCommand(
      '123e4567-e89b-12d3-a456-426614174000',
      '/products/category-1'
    );

    const mockVisitor = {
      updateCurrentPage: jest.fn().mockReturnValue({
        id: { value: '123e4567-e89b-12d3-a456-426614174000' },
        currentPage: { value: '/products/category-1' },
      }),
    } as any;

    const saveError = new DomainError('Save failed');

    // Mock de éxito para encontrar el visitante
    mockRepository.findById.mockResolvedValue(ok(mockVisitor));
    
    // Mock de error para guardar
    mockRepository.save.mockResolvedValue(err(saveError));

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(saveError);
    expect(mockRepository.findById).toHaveBeenCalled();
    expect(mockVisitor.updateCurrentPage).toHaveBeenCalled();
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('debe pasar la página actual correcta al value object', async () => {
    // Arrange
    const currentPage = '/home/landing-page';
    const command = new UpdateVisitorCurrentPageCommand(
      '123e4567-e89b-12d3-a456-426614174000',
      currentPage
    );

    const mockVisitor = {
      updateCurrentPage: jest.fn().mockReturnValue({
        id: { value: '123e4567-e89b-12d3-a456-426614174000' },
        currentPage: { value: currentPage },
      }),
    } as any;

    mockRepository.findById.mockResolvedValue(ok(mockVisitor));
    mockRepository.save.mockResolvedValue(ok(undefined));

    // Act
    await handler.execute(command);

    // Assert
    expect(mockVisitor.updateCurrentPage).toHaveBeenCalledWith(
      expect.objectContaining({
        value: currentPage
      })
    );
  });
});