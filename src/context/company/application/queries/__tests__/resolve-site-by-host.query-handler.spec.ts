import { Test, TestingModule } from '@nestjs/testing';
import { ResolveSiteByHostQueryHandler } from '../resolve-site-by-host.query-handler';
import { ResolveSiteByHostQuery } from '../resolve-site-by-host.query';
import {
  CompanyRepository,
  COMPANY_REPOSITORY,
} from '../../../domain/company.repository';
import { ResolveSiteByHostResponseDto } from '../../dtos/resolve-site-by-host-response.dto';
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

describe('ResolveSiteByHostQueryHandler', () => {
  let handler: ResolveSiteByHostQueryHandler;
  let companyRepository: CompanyRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveSiteByHostQueryHandler,
        {
          provide: COMPANY_REPOSITORY,
          useValue: {
            findByDomain: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<ResolveSiteByHostQueryHandler>(
      ResolveSiteByHostQueryHandler,
    );
    companyRepository = module.get<CompanyRepository>(COMPANY_REPOSITORY);
  });

  describe('execute', () => {
    it('debe devolver tenantId y siteId cuando encuentra el sitio por dominio canónico', async () => {
      // Arrange
      const host = 'landing.mytech.com';
      const query = new ResolveSiteByHostQuery(host);

      const companyId = new Uuid('550e8400-e29b-41d4-a716-446655440000');
      const siteId = new SiteId('550e8400-e29b-41d4-a716-446655440001');

      // Crear un sitio con el dominio canónico que coincide
      const site = Site.create({
        id: siteId,
        name: new SiteName('Landing Site'),
        canonicalDomain: new CanonicalDomain('landing.mytech.com'),
        domainAliases: DomainAliases.fromPrimitives(['www.mytech.com']),
      });

      const mockCompany = Company.create({
        id: companyId,
        companyName: new CompanyName('MyTech Company'),
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
      expect(result).toBeInstanceOf(ResolveSiteByHostResponseDto);
      if (result) {
        expect(result.tenantId).toBe(companyId.getValue());
        expect(result.siteId).toBe(siteId.value);
      }
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('debe devolver tenantId y siteId cuando encuentra el sitio por alias de dominio', async () => {
      // Arrange
      const host = 'www.mytech.com';
      const query = new ResolveSiteByHostQuery(host);

      const companyId = new Uuid('550e8400-e29b-41d4-a716-446655440000');
      const siteId = new SiteId('550e8400-e29b-41d4-a716-446655440001');

      // Crear un sitio donde el host es un alias
      const site = Site.create({
        id: siteId,
        name: new SiteName('Landing Site'),
        canonicalDomain: new CanonicalDomain('landing.mytech.com'),
        domainAliases: DomainAliases.fromPrimitives(['www.mytech.com', 'alt.mytech.com']),
      });

      const mockCompany = Company.create({
        id: companyId,
        companyName: new CompanyName('MyTech Company'),
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
      expect(result).toBeInstanceOf(ResolveSiteByHostResponseDto);
      if (result) {
        expect(result.tenantId).toBe(companyId.getValue());
        expect(result.siteId).toBe(siteId.value);
      }
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('debe devolver el sitio correcto cuando la empresa tiene múltiples sitios', async () => {
      // Arrange
      const host = 'blog.mytech.com';
      const query = new ResolveSiteByHostQuery(host);

      const companyId = new Uuid('550e8400-e29b-41d4-a716-446655440000');
      const siteId1 = new SiteId('550e8400-e29b-41d4-a716-446655440001');
      const siteId2 = new SiteId('550e8400-e29b-41d4-a716-446655440002');

      // Crear múltiples sitios
      const site1 = Site.create({
        id: siteId1,
        name: new SiteName('Landing Site'),
        canonicalDomain: new CanonicalDomain('landing.mytech.com'),
        domainAliases: DomainAliases.fromPrimitives(['www.mytech.com']),
      });

      const site2 = Site.create({
        id: siteId2,
        name: new SiteName('Blog Site'),
        canonicalDomain: new CanonicalDomain('blog.mytech.com'),
        domainAliases: DomainAliases.fromPrimitives(['news.mytech.com']),
      });

      const mockCompany = Company.create({
        id: companyId,
        companyName: new CompanyName('MyTech Company'),
        sites: CompanySites.fromSiteArray([site1, site2]),
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
      expect(result).toBeInstanceOf(ResolveSiteByHostResponseDto);
      if (result) {
        expect(result.tenantId).toBe(companyId.getValue());
        expect(result.siteId).toBe(siteId2.value); // Debe devolver el segundo sitio
      }
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('debe devolver null cuando no encuentra empresa para el host', async () => {
      // Arrange
      const host = 'noexiste.com';
      const query = new ResolveSiteByHostQuery(host);

      jest
        .spyOn(companyRepository, 'findByDomain')
        .mockResolvedValue(err(new CompanyNotFoundError()));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeNull();
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('debe devolver null cuando encuentra empresa pero ningún sitio maneja el host', async () => {
      // Arrange
      const host = 'otrodominio.com';
      const query = new ResolveSiteByHostQuery(host);

      const companyId = new Uuid('550e8400-e29b-41d4-a716-446655440000');
      const siteId = new SiteId('550e8400-e29b-41d4-a716-446655440001');

      // Crear sitio con diferentes dominios
      const site = Site.create({
        id: siteId,
        name: new SiteName('Landing Site'),
        canonicalDomain: new CanonicalDomain('landing.mytech.com'),
        domainAliases: DomainAliases.fromPrimitives(['www.mytech.com']),
      });

      const mockCompany = Company.create({
        id: companyId,
        companyName: new CompanyName('MyTech Company'),
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
      expect(result).toBeNull();
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('debe devolver null cuando ocurre un error en el repositorio', async () => {
      // Arrange
      const host = 'landing.mytech.com';
      const query = new ResolveSiteByHostQuery(host);

      jest
        .spyOn(companyRepository, 'findByDomain')
        .mockRejectedValue(new Error('Error de base de datos'));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeNull();
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });
  });
});