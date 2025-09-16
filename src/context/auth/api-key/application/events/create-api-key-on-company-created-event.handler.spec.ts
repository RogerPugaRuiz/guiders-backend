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
      sites: [
        {
          id: 'site-1',
          name: 'Sitio Principal',
          canonicalDomain: 'dominio1.com',
          domainAliases: ['www.dominio1.com'],
        },
        {
          id: 'site-2',
          name: 'Blog',
          canonicalDomain: 'dominio2.com',
          domainAliases: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const event = new CompanyCreatedEvent(payload);
    const spy = jest
      .spyOn(useCase, 'execute')
      .mockResolvedValue({ apiKey: 'test-key' });

    await handler.handle(event);

    // Debe crear API Keys para: dominio1.com, www.dominio1.com, dominio2.com
    expect(spy).toHaveBeenCalledTimes(3);

    // Primera llamada - dominio1.com
    const firstCall = spy.mock.calls[0];
    expect(firstCall[0]).toBeInstanceOf(ApiKeyDomain);
    expect(firstCall[0].getValue()).toBe('dominio1.com');
    expect(firstCall[1]).toBeInstanceOf(ApiKeyCompanyId);
    expect(firstCall[1].getValue()).toBe('company-uuid');

    // Segunda llamada - www.dominio1.com
    const secondCall = spy.mock.calls[1];
    expect(secondCall[0]).toBeInstanceOf(ApiKeyDomain);
    expect(secondCall[0].getValue()).toBe('www.dominio1.com');
    expect(secondCall[1]).toBeInstanceOf(ApiKeyCompanyId);
    expect(secondCall[1].getValue()).toBe('company-uuid');

    // Tercera llamada - dominio2.com
    const thirdCall = spy.mock.calls[2];
    expect(thirdCall[0]).toBeInstanceOf(ApiKeyDomain);
    expect(thirdCall[0].getValue()).toBe('dominio2.com');
    expect(thirdCall[1]).toBeInstanceOf(ApiKeyCompanyId);
    expect(thirdCall[1].getValue()).toBe('company-uuid');
  });

  it('no debe crear API Key si no hay sitios', async () => {
    const payload: Payload = {
      id: 'company-uuid',
      companyName: 'Test Company',
      sites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const event = new CompanyCreatedEvent(payload);
    const spy = jest.spyOn(useCase, 'execute');

    await handler.handle(event);

    expect(spy).not.toHaveBeenCalled();
  });
});
