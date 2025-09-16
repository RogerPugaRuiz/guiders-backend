import { Test, TestingModule } from '@nestjs/testing';
import { FindCompanyByDomainQueryHandler } from '../find-company-by-domain.query-handler';
import { FindCompanyByDomainQuery } from '../find-company-by-domain.query';
import {
  CompanyRepository,
  COMPANY_REPOSITORY,
} from '../../../domain/company.repository';
import { FindCompanyByDomainResponseDto } from '../../dtos/find-company-by-domain-response.dto';
import { Company } from '../../../domain/company.aggregate';
import { CompanyName } from '../../../domain/value-objects/company-name';
import { CompanySites } from '../../../domain/value-objects/company-sites';
import { Site } from '../../../domain/entities/site';
import { SiteId } from '../../../domain/value-objects/site-id';
import { SiteName } from '../../../domain/value-objects/site-name';
import { CanonicalDomain } from '../../../domain/value-objects/canonical-domain';
import { DomainAliases } from '../../../domain/value-objects/domain-aliases';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';
import { ok, err } from '../../../../shared/domain/result';
import { CompanyNotFoundError } from '../../../domain/errors/company.error';

describe('FindCompanyByDomainQueryHandler', () => {
  let handler: FindCompanyByDomainQueryHandler;
  let companyRepository: CompanyRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindCompanyByDomainQueryHandler,
        {
          provide: COMPANY_REPOSITORY,
          useValue: {
            findByDomain: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<FindCompanyByDomainQueryHandler>(
      FindCompanyByDomainQueryHandler,
    );
    companyRepository = module.get<CompanyRepository>(COMPANY_REPOSITORY);
  });

  describe('execute', () => {
    it('debe devolver el DTO de respuesta cuando encuentra la empresa', async () => {
      // Arrange
      const domain = 'ejemplo.com';
      const query = new FindCompanyByDomainQuery(domain);

      const companyId = new Uuid('550e8400-e29b-41d4-a716-446655440000');

      // Crear un sitio para la empresa
      const site = Site.create({
        id: new SiteId('550e8400-e29b-41d4-a716-446655440001'),
        name: new SiteName('Sitio Principal'),
        canonicalDomain: new CanonicalDomain('ejemplo.com'),
        domainAliases: DomainAliases.fromPrimitives([]),
      });

      const mockCompany = Company.create({
        id: companyId,
        companyName: new CompanyName('Empresa Ejemplo'),
        sites: CompanySites.fromSiteArray([site]),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });

      jest
        .spyOn(companyRepository, 'findByDomain')
        .mockResolvedValue(ok(mockCompany));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(FindCompanyByDomainResponseDto);
      if (result) {
        expect(result.id).toBe(companyId.getValue());
        expect(result.companyName).toBe('Empresa Ejemplo');
        expect(result.domains).toEqual(['ejemplo.com']);
      }
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(domain);
    });

    it('debe devolver null cuando no encuentra la empresa', async () => {
      // Arrange
      const domain = 'noexiste.com';
      const query = new FindCompanyByDomainQuery(domain);

      jest
        .spyOn(companyRepository, 'findByDomain')
        .mockResolvedValue(err(new CompanyNotFoundError()));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeNull();
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(domain);
    });

    it('debe devolver null cuando ocurre un error en el repositorio', async () => {
      // Arrange
      const domain = 'ejemplo.com';
      const query = new FindCompanyByDomainQuery(domain);

      jest
        .spyOn(companyRepository, 'findByDomain')
        .mockRejectedValue(new Error('Error de base de datos'));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeNull();
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(domain);
    });
  });
});
