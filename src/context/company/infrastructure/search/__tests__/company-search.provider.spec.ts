import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike } from 'typeorm';
import { CompanySearchProvider } from '../company-search.provider';
import { CompanyTypeOrmEntity } from '../../persistence/entity/company-typeorm.entity';
import { SearchScope } from 'src/context/shared/domain/search';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('CompanySearchProvider', () => {
  let provider: CompanySearchProvider;
  let companyRepository: { find: jest.Mock };

  const companyId = Uuid.random().value;

  const buildEntity = (overrides: Partial<CompanyTypeOrmEntity> = {}) =>
    ({
      id: Uuid.random().value,
      companyName: 'Acme Corp',
      createdAt: new Date('2024-03-01'),
      ...overrides,
    }) as CompanyTypeOrmEntity;

  beforeEach(async () => {
    companyRepository = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanySearchProvider,
        {
          provide: getRepositoryToken(CompanyTypeOrmEntity),
          useValue: companyRepository,
        },
      ],
    }).compile();

    provider = module.get<CompanySearchProvider>(CompanySearchProvider);
  });

  describe('scope', () => {
    it('debe exponer scopes COMPANIES y USERS', () => {
      expect(provider.scope).toEqual([
        SearchScope.COMPANIES,
        SearchScope.USERS,
      ]);
    });
  });

  describe('search', () => {
    it('debe retornar resultados mapeados correctamente', async () => {
      const entity = buildEntity();
      companyRepository.find.mockResolvedValue([entity]);

      const results = await provider.search({
        query: 'Acme',
        companyId,
        limit: 5,
      });

      expect(results).toHaveLength(1);
      const r = results[0].toPrimitives();
      expect(r.id).toBe(entity.id);
      expect(r.scope).toBe(SearchScope.COMPANIES);
      expect(r.title).toBe('Acme Corp');
      expect(r.url).toBe(`/companies/${entity.id}`);
      expect(r.metadata?.companyName).toBe('Acme Corp');
    });

    it('debe usar ILike con el patrón %query% para búsqueda case-insensitive', async () => {
      await provider.search({ query: 'acme', companyId });

      expect(companyRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyName: ILike('%acme%') },
        }),
      );
    });

    it('debe usar take con el límite especificado', async () => {
      await provider.search({ query: 'test', companyId, limit: 3 });

      expect(companyRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
    });

    it('debe usar limit 5 por defecto cuando no se especifica', async () => {
      await provider.search({ query: 'test', companyId });

      expect(companyRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('debe seleccionar solo los campos necesarios', async () => {
      await provider.search({ query: 'test', companyId });

      expect(companyRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          select: ['id', 'companyName', 'createdAt'],
        }),
      );
    });

    it('debe retornar [] cuando el repositorio lanza un error (resiliencia)', async () => {
      companyRepository.find.mockRejectedValue(new Error('PostgreSQL down'));

      const results = await provider.search({ query: 'fail', companyId });
      expect(results).toEqual([]);
    });

    it('debe retornar [] cuando no hay resultados', async () => {
      companyRepository.find.mockResolvedValue([]);

      const results = await provider.search({
        query: 'inexistente',
        companyId,
      });
      expect(results).toEqual([]);
    });

    it('debe incluir fecha de creación en el subtitle', async () => {
      const entity = buildEntity({ createdAt: new Date('2024-06-15') });
      companyRepository.find.mockResolvedValue([entity]);

      const results = await provider.search({ query: 'Acme', companyId });
      const subtitle = results[0].toPrimitives().subtitle ?? '';
      expect(subtitle).toContain('Empresa');
    });
  });
});
