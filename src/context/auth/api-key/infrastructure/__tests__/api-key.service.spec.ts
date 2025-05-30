// Prueba unitaria para ApiKeyService
// Ubicación: src/context/auth/api-key/infrastructure/__tests__/api-key.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyService } from '../api-key.service';
import { CreateApiKeyForDomainUseCase } from '../../application/usecase/create-api-key-for-domain.usecase';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let createApiKeyForDomainUseCase: CreateApiKeyForDomainUseCase;

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
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    createApiKeyForDomainUseCase = module.get<CreateApiKeyForDomainUseCase>(
      CreateApiKeyForDomainUseCase,
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

    expect(executeSpy).toHaveBeenCalledWith(domain, companyId);
    expect(result).toEqual(expectedResult);
  });
});
