import { Test, TestingModule } from '@nestjs/testing';
import { ResolveSiteCommandHandler } from './resolve-site.command-handler';
import { ResolveSiteCommand } from './resolve-site.command';
import {
  CompanyRepository,
  COMPANY_REPOSITORY,
} from '../../../company/domain/company.repository';
import { ResolveSiteResponseDto } from '../dtos/resolve-site-response.dto';
import { Company } from '../../../company/domain/company.aggregate';
import { CompanyName } from '../../../company/domain/value-objects/company-name';
import { CompanySites } from '../../../company/domain/value-objects/company-sites';
import { Site } from '../../../company/domain/entities/site';
import { SiteId } from '../../../company/domain/value-objects/site-id';
import { SiteName } from '../../../company/domain/value-objects/site-name';
import { CanonicalDomain } from '../../../company/domain/value-objects/canonical-domain';
import { DomainAliases } from '../../../company/domain/value-objects/domain-aliases';
import { Uuid } from '../../../shared/domain/value-objects/uuid';
import { ok, err } from '../../../shared/domain/result';
import { CompanyNotFoundError } from '../../../company/domain/errors/company.error';

describe('ResolveSiteCommandHandler', () => {
  let handler: ResolveSiteCommandHandler;
  let companyRepository: CompanyRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveSiteCommandHandler,
        {
          provide: COMPANY_REPOSITORY,
          useValue: {
            findByDomain: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<ResolveSiteCommandHandler>(ResolveSiteCommandHandler);
    companyRepository = module.get<CompanyRepository>(COMPANY_REPOSITORY);
  });

  describe('execute', () => {
    it('debe resolver correctamente un host a tenantId y siteId cuando encuentra el sitio por dominio canónico', async () => {
      // Arrange
      const host = 'landing.mytech.com';
      const command = new ResolveSiteCommand(host);

      const companyId = new Uuid('550e8400-e29b-41d4-a716-446655440000');
      const siteId = new SiteId('550e8400-e29b-41d4-a716-446655440001');

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
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeInstanceOf(ResolveSiteResponseDto);
      expect(result.tenantId).toBe(companyId.getValue());
      expect(result.siteId).toBe(siteId.value);
      expect(result.siteName).toBe('Landing Site');
      expect(result.tenantName).toBe('MyTech Company');
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('debe resolver correctamente un host cuando encuentra el sitio por alias de dominio', async () => {
      // Arrange
      const host = 'www.mytech.com';
      const command = new ResolveSiteCommand(host);

      const companyId = new Uuid('550e8400-e29b-41d4-a716-446655440000');
      const siteId = new SiteId('550e8400-e29b-41d4-a716-446655440001');

      const site = Site.create({
        id: siteId,
        name: new SiteName('Landing Site'),
        canonicalDomain: new CanonicalDomain('landing.mytech.com'),
        domainAliases: DomainAliases.fromPrimitives([
          'www.mytech.com',
          'alt.mytech.com',
        ]),
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
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeInstanceOf(ResolveSiteResponseDto);
      expect(result.tenantId).toBe(companyId.getValue());
      expect(result.siteId).toBe(siteId.value);
      expect(result.siteName).toBe('Landing Site');
      expect(result.tenantName).toBe('MyTech Company');
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('debe resolver el sitio correcto cuando la empresa tiene múltiples sitios', async () => {
      // Arrange
      const host = 'blog.mytech.com';
      const command = new ResolveSiteCommand(host);

      const companyId = new Uuid('550e8400-e29b-41d4-a716-446655440000');
      const siteId1 = new SiteId('550e8400-e29b-41d4-a716-446655440001');
      const siteId2 = new SiteId('550e8400-e29b-41d4-a716-446655440002');

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
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeInstanceOf(ResolveSiteResponseDto);
      expect(result.tenantId).toBe(companyId.getValue());
      expect(result.siteId).toBe(siteId2.value); // Debe devolver el segundo sitio
      expect(result.siteName).toBe('Blog Site');
      expect(result.tenantName).toBe('MyTech Company');
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('debe lanzar un error cuando no encuentra empresa para el host', async () => {
      // Arrange
      const host = 'noexiste.com';
      const command = new ResolveSiteCommand(host);

      jest
        .spyOn(companyRepository, 'findByDomain')
        .mockResolvedValue(err(new CompanyNotFoundError()));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'No se encontró un sitio para el host: noexiste.com',
      );
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('debe lanzar un error cuando encuentra empresa pero ningún sitio maneja el host', async () => {
      // Arrange
      const host = 'otrodominio.com';
      const command = new ResolveSiteCommand(host);

      const companyId = new Uuid('550e8400-e29b-41d4-a716-446655440000');
      const siteId = new SiteId('550e8400-e29b-41d4-a716-446655440001');

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

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'No se encontró un sitio específico para el host: otrodominio.com',
      );
      expect(companyRepository.findByDomain).toHaveBeenCalledWith(host);
    });
  });
});
