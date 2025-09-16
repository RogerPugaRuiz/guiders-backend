// Prueba unitaria para CreateCompanyCommandHandler usando Uuid del dominio
import { Test, TestingModule } from '@nestjs/testing';
import { CreateCompanyCommandHandler } from './create-company-command.handler';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../domain/company.repository';
import { CreateCompanyCommand } from './create-company.command';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { EventPublisher } from '@nestjs/cqrs';

const mockCompanyRepository = () =>
  ({
    save: jest.fn(),
  }) as unknown as CompanyRepository;

describe('CreateCompanyCommandHandler', () => {
  let handler: CreateCompanyCommandHandler;
  let repository: ReturnType<typeof mockCompanyRepository>;
  let mockPublisher: { mergeObjectContext: jest.Mock };

  beforeEach(async () => {
    mockPublisher = { mergeObjectContext: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: COMPANY_REPOSITORY, useFactory: mockCompanyRepository },
        { provide: EventPublisher, useValue: mockPublisher },
        CreateCompanyCommandHandler,
      ],
    }).compile();

    handler = module.get(CreateCompanyCommandHandler);
    repository = module.get(COMPANY_REPOSITORY);
  });

  it('debe guardar la compañía y publicar eventos usando el repositorio y publisher', async () => {
    const dto = {
      companyName: 'Test Company',
      sites: [
        {
          id: Uuid.random().value,
          name: 'Principal',
          canonicalDomain: 'test.com',
          domainAliases: [],
        },
      ],
    };
    const command = new CreateCompanyCommand(dto);

    // Espía para simular el publisher.mergeObjectContext y commit
    const mockCommit = jest.fn();
    const mockAggregate = {
      commit: mockCommit,
      getId: jest.fn(() => Uuid.random()),
    };
    mockPublisher.mergeObjectContext.mockReturnValue(mockAggregate);

    // Validación de guardado y publicación de eventos
    const saveMock = jest.fn();
    repository.save = saveMock;
    mockPublisher.mergeObjectContext.mockReturnValue(mockAggregate);

    await handler.execute(command);

    expect(saveMock).toHaveBeenCalledWith(mockAggregate);
    expect(mockPublisher.mergeObjectContext).toHaveBeenCalled();
    expect(mockCommit).toHaveBeenCalled();
    // No es necesario verificar getId porque no se usa en el flujo del handler
  });
});
