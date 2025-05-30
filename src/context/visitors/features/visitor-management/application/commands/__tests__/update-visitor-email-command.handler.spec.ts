import { Test, TestingModule } from '@nestjs/testing';
import { UpdateVisitorEmailCommandHandler } from '../update-visitor-email-command.handler';
import { UpdateVisitorEmailCommand } from '../update-visitor-email.command';
import {
  IVisitorRepository,
  VISITOR_REPOSITORY,
} from 'src/context/visitors/domain/visitor.repository';
import { Visitor } from 'src/context/visitors/domain/visitor';
import { ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { VisitorNotFoundError } from 'src/context/visitors/domain/errors/visitor.error';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('UpdateVisitorEmailCommandHandler', () => {
  let handler: UpdateVisitorEmailCommandHandler;
  let mockVisitorRepository: Partial<IVisitorRepository>;

  // Mock de visitante para pruebas
  const mockVisitorId = Uuid.generate();
  const mockVisitor = Visitor.fromPrimitives({
    id: mockVisitorId,
    email: 'old-email@example.com',
  });

  // Mock del resultado exitoso del repositorio
  const mockSuccessResult = ok<void, DomainError>(undefined);

  // Mock del error del repositorio

  const mockDomainError = new VisitorNotFoundError(mockVisitorId);

  const mockErrorResult = err<void, DomainError>(mockDomainError);

  beforeEach(async () => {
    // Configuración de los mocks
    mockVisitorRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    // Configuración del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVisitorEmailCommandHandler,
        {
          provide: VISITOR_REPOSITORY,
          useValue: mockVisitorRepository,
        },
      ],
    }).compile();

    handler = module.get<UpdateVisitorEmailCommandHandler>(
      UpdateVisitorEmailCommandHandler,
    );
  });

  it('debe actualizar correctamente el email del visitante', async () => {
    // Preparar los mocks
    (mockVisitorRepository.findById as jest.Mock).mockResolvedValue(
      ok(mockVisitor),
    );
    (mockVisitorRepository.save as jest.Mock).mockResolvedValue(
      mockSuccessResult,
    );

    // Ejecutar el comando
    const command = new UpdateVisitorEmailCommand(
      mockVisitorId,
      'new-email@example.com',
    );
    const result = await handler.execute(command);

    // Verificar que se llamó al método findById con el ID correcto
    expect(mockVisitorRepository.findById).toHaveBeenCalledWith(
      expect.objectContaining({
        value: mockVisitorId,
      }),
    );

    // Verificar que se guardó el visitante actualizado
    expect(mockVisitorRepository.save).toHaveBeenCalled();

    // Verificar que el resultado es exitoso
    expect(result.isOk()).toBeTruthy();
  });

  it('debe devolver error cuando el visitante no existe', async () => {
    // Preparar los mocks para simular que no se encuentra el visitante
    (mockVisitorRepository.findById as jest.Mock).mockResolvedValue(
      mockErrorResult,
    );

    // Ejecutar el comando
    const command = new UpdateVisitorEmailCommand(
      mockVisitorId,
      'new-email@example.com',
    );
    const result = await handler.execute(command);

    // Verificar que se llamó al método findById con el ID correcto
    expect(mockVisitorRepository.findById).toHaveBeenCalledWith(
      expect.objectContaining({
        value: mockVisitorId,
      }),
    );

    // Verificar que no se llamó al método save
    expect(mockVisitorRepository.save).not.toHaveBeenCalled();

    // Verificar que el resultado es un error
    expect(result.isErr()).toBeTruthy();
    result.fold(
      (error) => expect(error.message).toContain(mockVisitorId),
      () => fail('Se esperaba un error pero se obtuvo un éxito'),
    );
  });
});
