import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateDefaultVisitorCommandHandler } from '../create-default-visitor.command-handler';
import { CreateDefaultVisitorCommand } from '../create-default-visitor.command';
import {
  IVisitorRepository,
  VISITOR_REPOSITORY,
} from '../../../domain/visitor.repository';
import { Visitor } from '../../../domain/visitor.aggregate';
import { DomainError } from '../../../../shared/domain/domain.error';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';
import { ok, err } from '../../../../shared/domain/result';
import {
  AliasGeneratorService,
  ALIAS_GENERATOR_SERVICE,
} from '../../services/alias-generator.service';

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

// Mock para el servicio de generación de alias
const mockAliasGeneratorService: jest.Mocked<AliasGeneratorService> = {
  generate: jest.fn(),
};

describe('CreateDefaultVisitorCommandHandler', () => {
  let handler: CreateDefaultVisitorCommandHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule], // Importar CqrsModule para acceder a EventPublisher
      providers: [
        CreateDefaultVisitorCommandHandler,
        {
          provide: VISITOR_REPOSITORY,
          useValue: mockVisitorRepository,
        },
        {
          provide: ALIAS_GENERATOR_SERVICE,
          useValue: mockAliasGeneratorService,
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

  it('should create a default visitor successfully with generated alias', async () => {
    // Arrange
    const visitorAccountId = Uuid.generate();
    const command = new CreateDefaultVisitorCommand(visitorAccountId);
    const generatedAlias = 'Brave Lion';

    // Mock para la respuesta del generador de alias
    mockAliasGeneratorService.generate.mockReturnValue(generatedAlias);

    // Mock para la respuesta exitosa del repositorio
    const mockSave = jest.fn().mockResolvedValue(ok(undefined));
    mockVisitorRepository.save = mockSave;

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.isOk()).toBeTruthy();
    expect(mockAliasGeneratorService.generate).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Verificar que el save se llamó con un objeto Visitor que tiene nombre
    const visitor = mockSave.mock.calls[0][0] as Visitor;
    expect(visitor).toBeInstanceOf(Visitor);

    const idValue = visitor.id.value;
    expect(idValue).toBe(visitorAccountId);

    // Verificar que el visitante tiene el alias generado
    const nameOptional = visitor.name;
    expect(nameOptional.isPresent()).toBeTruthy();
    if (nameOptional.isPresent()) {
      expect(nameOptional.get().value).toBe(generatedAlias);
    }
  });

  it('should handle repository errors', async () => {
    // Arrange
    const visitorAccountId = Uuid.generate();
    const command = new CreateDefaultVisitorCommand(visitorAccountId);
    const generatedAlias = 'Clever Fox';

    // Mock para la respuesta del generador de alias
    mockAliasGeneratorService.generate.mockReturnValue(generatedAlias);

    // Mock para simular un error en el repositorio
    const repoError = new TestRepositoryError(
      'Error al guardar en el repositorio',
    );
    const mockSave = jest.fn().mockResolvedValue(err(repoError));
    mockVisitorRepository.save = mockSave;

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.isErr()).toBeTruthy();
    if (result.isErr()) {
      expect(result.error.getName()).toBe('REPO_ERROR');
    }
    expect(mockAliasGeneratorService.generate).toHaveBeenCalledTimes(1);
  });

  it('should handle unexpected errors', async () => {
    // Arrange
    const visitorAccountId = Uuid.generate();
    const command = new CreateDefaultVisitorCommand(visitorAccountId);
    const generatedAlias = 'Swift Eagle';

    // Mock para la respuesta del generador de alias
    mockAliasGeneratorService.generate.mockReturnValue(generatedAlias);

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
    expect(mockAliasGeneratorService.generate).toHaveBeenCalledTimes(1);
  });
});
