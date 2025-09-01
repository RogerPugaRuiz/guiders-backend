import { Test, TestingModule } from '@nestjs/testing';
import { CreateApiKeyOnCompanyCreatedEventHandler } from './create-api-key-on-company-created-event.handler';
import { CreateApiKeyForDomainUseCase } from '../usecase/create-api-key-for-domain.usecase';
import {
  CompanyCreatedEvent,
  Payload,
} from 'src/context/company/domain/events/company-created.event';
import { ApiKeyDomain } from '../../domain/model/api-key-domain';
import { ApiKeyCompanyId } from '../../domain/model/api-key-company-id';

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

    // Primera llamada
    const firstCall = spy.mock.calls[0];
    expect(firstCall[0]).toBeInstanceOf(ApiKeyDomain);
    expect(firstCall[0].getValue()).toBe('dominio1.com');
    expect(firstCall[1]).toBeInstanceOf(ApiKeyCompanyId);
    expect(firstCall[1].getValue()).toBe('company-uuid');

    // Segunda llamada
    const secondCall = spy.mock.calls[1];
    expect(secondCall[0]).toBeInstanceOf(ApiKeyDomain);
    expect(secondCall[0].getValue()).toBe('dominio2.com');
    expect(secondCall[1]).toBeInstanceOf(ApiKeyCompanyId);
    expect(secondCall[1].getValue()).toBe('company-uuid');
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
