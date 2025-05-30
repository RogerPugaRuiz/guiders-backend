import { Test, TestingModule } from '@nestjs/testing';
import { CreateApiKeyOnCompanyCreatedEventHandler } from './create-api-key-on-company-created-event.handler';
import { CreateApiKeyForDomainUseCase } from '../usecase/create-api-key-for-domain.usecase';
import {
  CompanyCreatedEvent,
  Payload,
} from 'src/context/company/features/company-management/domain/events/company-created.event';

describe('CreateApiKeyOnCompanyCreatedEventHandler', () => {
  let handler: CreateApiKeyOnCompanyCreatedEventHandler;
  let useCase: CreateApiKeyForDomainUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateApiKeyOnCompanyCreatedEventHandler,
        {
          provide: CreateApiKeyForDomainUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get(CreateApiKeyOnCompanyCreatedEventHandler);
    useCase = module.get(CreateApiKeyForDomainUseCase);
  });

  it('debe crear una API Key para cada dominio de la empresa', async () => {
    const payload: Payload = {
      id: 'company-uuid',
      companyName: 'Test Company',
      domains: ['dominio1.com', 'dominio2.com'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const event = new CompanyCreatedEvent(payload);
    const spy = jest
      .spyOn(useCase, 'execute')
      .mockResolvedValue({ apiKey: 'test-key' });

    await handler.handle(event);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith('dominio1.com', 'company-uuid');
    expect(spy).toHaveBeenCalledWith('dominio2.com', 'company-uuid');
  });

  it('no debe crear API Key si no hay dominios', async () => {
    const payload: Payload = {
      id: 'company-uuid',
      companyName: 'Test Company',
      domains: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const event = new CompanyCreatedEvent(payload);
    const spy = jest.spyOn(useCase, 'execute');

    await handler.handle(event);

    expect(spy).not.toHaveBeenCalled();
  });
});
