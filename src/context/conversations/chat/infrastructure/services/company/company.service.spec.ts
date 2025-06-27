import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { CompanyService } from './company.service';
import { FindCompanyByDomainQuery } from '../../../../../company/application/queries/find-company-by-domain.query';
import { FindCompanyByDomainResponseDto } from '../../../../../company/application/dtos/find-company-by-domain-response.dto';

describe('CompanyService', () => {
  let service: CompanyService;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  describe('getCompanyIdFromOrigin', () => {
    it('debe devolver el ID de la empresa cuando se encuentra por dominio', async () => {
      // Arrange
      const origin = 'https://ejemplo.com';
      const mockCompanyResponse: FindCompanyByDomainResponseDto = {
        id: 'company-uuid-123',
        companyName: 'Empresa Ejemplo',
        domains: ['ejemplo.com'],
      };

      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockCompanyResponse);

      // Act
      const result = await service.getCompanyIdFromOrigin(origin);

      // Assert
      expect(result).toBe('company-uuid-123');
      expect(queryBus.execute).toHaveBeenCalledWith(
        new FindCompanyByDomainQuery('ejemplo.com'),
      );
    });

    it('debe manejar dominios con www correctamente', async () => {
      // Arrange
      const origin = 'https://www.ejemplo.com';
      const mockCompanyResponse: FindCompanyByDomainResponseDto = {
        id: 'company-uuid-123',
        companyName: 'Empresa Ejemplo',
        domains: ['ejemplo.com'],
      };

      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockCompanyResponse);

      // Act
      const result = await service.getCompanyIdFromOrigin(origin);

      // Assert
      expect(result).toBe('company-uuid-123');
      expect(queryBus.execute).toHaveBeenCalledWith(
        new FindCompanyByDomainQuery('ejemplo.com'),
      );
    });

    it('debe devolver null cuando no se encuentra la empresa', async () => {
      // Arrange
      const origin = 'https://noexiste.com';
      jest.spyOn(queryBus, 'execute').mockResolvedValue(null);

      // Act
      const result = await service.getCompanyIdFromOrigin(origin);

      // Assert
      expect(result).toBeNull();
      expect(queryBus.execute).toHaveBeenCalledWith(
        new FindCompanyByDomainQuery('noexiste.com'),
      );
    });

    it('debe devolver null cuando ocurre un error', async () => {
      // Arrange
      const origin = 'https://ejemplo.com';
      jest
        .spyOn(queryBus, 'execute')
        .mockRejectedValue(new Error('Error de base de datos'));

      // Act
      const result = await service.getCompanyIdFromOrigin(origin);

      // Assert
      expect(result).toBeNull();
    });

    it('debe manejar URLs inválidas devolviendo null', async () => {
      // Arrange
      const origin = 'url-invalida';

      // Act
      const result = await service.getCompanyIdFromOrigin(origin);

      // Assert
      expect(result).toBeNull();
    });
  });
});
