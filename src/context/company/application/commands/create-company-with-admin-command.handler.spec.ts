// Prueba unitaria para CreateCompanyWithAdminCommandHandler siguiendo DDD y usando Uuid del dominio
import { Test, TestingModule } from '@nestjs/testing';
import { CreateCompanyWithAdminCommandHandler } from './create-company-with-admin-command.handler';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../domain/company.repository';
import { CreateCompanyWithAdminCommand } from './create-company-with-admin.command';
import { EventPublisher, EventBus } from '@nestjs/cqrs';

// Mock del repositorio de compañía
const mockCompanyRepository = () =>
  ({
    save: jest.fn(),
  }) as unknown as CompanyRepository;

// Mock del publisher y eventBus
const mockPublisher = () => ({
  mergeObjectContext: jest.fn(),
});
const mockEventBus = () => ({
  publish: jest.fn(),
});

describe('CreateCompanyWithAdminCommandHandler', () => {
  let handler: CreateCompanyWithAdminCommandHandler;
  let repository: ReturnType<typeof mockCompanyRepository>;
  let publisher: ReturnType<typeof mockPublisher>;
  let eventBus: ReturnType<typeof mockEventBus>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: COMPANY_REPOSITORY, useFactory: mockCompanyRepository },
        { provide: EventPublisher, useFactory: mockPublisher },
        { provide: EventBus, useFactory: mockEventBus },
        CreateCompanyWithAdminCommandHandler,
      ],
    }).compile();

    handler = module.get(CreateCompanyWithAdminCommandHandler);
    repository = module.get(COMPANY_REPOSITORY);
    publisher = module.get(EventPublisher);
    eventBus = module.get(EventBus);
  });

  it('debe crear la compañía, persistirla y publicar el evento de integración', async () => {
    // Arrange
    const props = {
      companyName: 'GuiderTest',
      sites: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Principal',
          canonicalDomain: 'guiders.com',
          domainAliases: [],
        },
      ],
      adminName: 'Admin User',
      adminEmail: 'admin@guiders.com',
      adminTel: '123456789',
    };
    const command = new CreateCompanyWithAdminCommand(props);
    const now = new Date();
    jest.spyOn(global, 'Date').mockImplementation(() => now);

    // Mock para mergeObjectContext y commit
    const mockCommit = jest.fn();
    const mockAggregate = { commit: mockCommit };
    publisher.mergeObjectContext.mockReturnValue(mockAggregate);

    // Act
    await handler.execute(command);

    // Assert
    // Se accede al mock directamente desde el objeto mockeado

    expect((repository as any).save).toHaveBeenCalled();
    expect(publisher.mergeObjectContext).toHaveBeenCalled();
    expect(mockCommit).toHaveBeenCalled();
    // Extraemos los argumentos del evento publicado para aserción manual, tipando correctamente

    const publishCall = eventBus.publish.mock.calls[0][0] as {
      _attributes: Record<string, unknown>;
    };
    const attrs = publishCall._attributes as Record<string, any>;
    expect(attrs.companyName).toBe(props.companyName);
    expect(Array.isArray(attrs.sites)).toBe(true);
    expect(attrs.sites).toHaveLength(1);
    expect(attrs.sites[0].canonicalDomain).toBe('guiders.com');
    expect(attrs.adminName).toBe(props.adminName);
    expect(attrs.adminEmail).toBe(props.adminEmail);
    expect(attrs.adminTel).toBe(props.adminTel);
    expect(attrs.createdAt).toBe(now.toISOString());
    expect(typeof attrs.companyId).toBe('string');
    expect(attrs.companyId).toMatch(/[\w-]{36}/);
  });
});
