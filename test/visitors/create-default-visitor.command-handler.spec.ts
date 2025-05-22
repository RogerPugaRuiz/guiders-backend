/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { CreateDefaultVisitorCommandHandler } from '../../src/context/visitors/application/commands/create-default-visitor.command-handler';
import { CreateDefaultVisitorCommand } from '../../src/context/visitors/application/commands/create-default-visitor.command';
import {
  IVisitorRepository,
  VISITOR_REPOSITORY,
} from '../../src/context/visitors/domain/visitor.repository';
import { Visitor } from '../../src/context/visitors/domain/visitor';
import { DomainError } from '../../src/context/shared/domain/domain.error';
import { Uuid } from '../../src/context/shared/domain/value-objects/uuid';
import { ok, err } from '../../src/context/shared/domain/result';

// Clase de error personalizada para las pruebas
class TestRepositoryError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'REPO_ERROR';
  }
}

// Mock para el repositorio de visitantes
const mockVisitorRepository: jest.Mocked<IVisitorRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  match: jest.fn(),
};

describe('CreateDefaultVisitorCommandHandler', () => {
  let handler: CreateDefaultVisitorCommandHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateDefaultVisitorCommandHandler,
        {
          provide: VISITOR_REPOSITORY,
          useValue: mockVisitorRepository,
        },
      ],
    }).compile();

    handler = module.get<CreateDefaultVisitorCommandHandler>(
      CreateDefaultVisitorCommandHandler,
    );

    // Reset de los mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should create a default visitor successfully', async () => {
    // Arrange
    const visitorAccountId = Uuid.generate();
    const command = new CreateDefaultVisitorCommand(visitorAccountId);

    // Mock para la respuesta exitosa del repositorio
    const mockSave = jest.fn().mockResolvedValue(ok(undefined));
    mockVisitorRepository.save = mockSave;

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.isOk()).toBeTruthy();
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Verificar que el save se llamó con un objeto Visitor
    const visitor = mockSave.mock.calls[0][0] as Visitor;
    expect(visitor).toBeInstanceOf(Visitor);
    expect(visitor.id.value).toBe(visitorAccountId);
  });

  it('should handle repository errors', async () => {
    // Arrange
    const visitorAccountId = Uuid.generate();
    const command = new CreateDefaultVisitorCommand(visitorAccountId);

    // Mock para simular un error en el repositorio
    const repoError = new TestRepositoryError('Error al guardar en el repositorio');
    const mockSave = jest.fn().mockResolvedValue(err(repoError));
    mockVisitorRepository.save = mockSave;

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.isErr()).toBeTruthy();
    if (result.isErr()) {
      expect(result.error.getName()).toBe('REPO_ERROR');
    }
  });

  it('should handle unexpected errors', async () => {
    // Arrange
    const visitorAccountId = Uuid.generate();
    const command = new CreateDefaultVisitorCommand(visitorAccountId);

    // Mock para simular una excepción
    const mockSave = jest.fn().mockImplementation(() => {
      throw new Error('Unexpected error');
    });
    mockVisitorRepository.save = mockSave;

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.isErr()).toBeTruthy();
    if (result.isErr()) {
      expect(result.error.getName()).toBe('DEFAULT_VISITOR_CREATION_ERROR');
    }
  });
});