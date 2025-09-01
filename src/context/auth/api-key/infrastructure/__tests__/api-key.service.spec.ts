// Prueba unitaria para ApiKeyService
// Ubicación: src/context/auth/api-key/infrastructure/__tests__/api-key.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyService } from '../api-key.service';
import { CreateApiKeyForDomainUseCase } from '../../application/usecase/create-api-key-for-domain.usecase';
import { ApiKeyDomain } from '../../domain/model/api-key-domain';
import { ApiKeyCompanyId } from '../../domain/model/api-key-company-id';
import { GetApiKeysByCompanyIdUseCase } from '../../application/usecase/get-api-keys-by-company-id.usecase';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let createApiKeyForDomainUseCase: CreateApiKeyForDomainUseCase;
  let getApiKeysByCompanyIdUseCase: GetApiKeysByCompanyIdUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: CreateApiKeyForDomainUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetApiKeysByCompanyIdUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    createApiKeyForDomainUseCase = module.get<CreateApiKeyForDomainUseCase>(
      CreateApiKeyForDomainUseCase,
    );
    getApiKeysByCompanyIdUseCase = module.get<GetApiKeysByCompanyIdUseCase>(
      GetApiKeysByCompanyIdUseCase,
    );
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe crear api key para dominio', async () => {
    const domain = 'example.com';
    const companyId = 'company-123';
    const expectedResult = { apiKey: 'api-key-456' };

    const executeSpy = jest
      .spyOn(createApiKeyForDomainUseCase, 'execute')
      .mockResolvedValue(expectedResult);

    const result = await service.createApiKeyForDomain(domain, companyId);

    expect(executeSpy).toHaveBeenCalled();
    const args = executeSpy.mock.calls[0];
    expect(args[0]).toBeInstanceOf(ApiKeyDomain);
    expect(args[0].getValue()).toBe(domain);
    expect(args[1]).toBeInstanceOf(ApiKeyCompanyId);
    expect(args[1].getValue()).toBe(companyId);
    expect(result).toEqual(expectedResult);
  });

  it('debe listar api keys por companyId', async () => {
    const companyId = 'company-123';
    const expectedList = [
      {
        kid: 'kid-1',
        domain: 'example.com',
        createdAt: new Date().toISOString(),
      },
    ];
    const executeSpy = jest
      .spyOn(getApiKeysByCompanyIdUseCase, 'execute')
      .mockResolvedValue(expectedList as any);

    const result = await service.listCompanyApiKeys(companyId);
    expect(executeSpy).toHaveBeenCalled();
    // Verificamos que se haya pasado un VO correcto
    const passedArg = executeSpy.mock.calls[0][0];
    expect(passedArg).toBeInstanceOf(ApiKeyCompanyId);
    expect(passedArg.getValue()).toBe(companyId);
    expect(result).toEqual(expectedList);
  });
});
