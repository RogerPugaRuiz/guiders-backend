import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VisitorSearchProvider } from '../visitor-search.provider';
import { VisitorV2MongoEntity } from '../../persistence/entity/visitor-v2-mongo.entity';
import { SearchScope } from 'src/context/shared/domain/search';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

function createVisitorModelMock(docs: any[]) {
  const execMock = jest.fn().mockResolvedValue(docs);
  const leanMock = jest.fn().mockReturnValue({ exec: execMock });
  const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
  const selectMock = jest.fn().mockReturnValue({ limit: limitMock });
  const findMock = jest.fn().mockReturnValue({ select: selectMock });
  return { find: findMock, _limit: limitMock };
}

describe('VisitorSearchProvider', () => {
  let provider: VisitorSearchProvider;

  const companyId = Uuid.random().value;

  const buildDoc = (overrides: Partial<any> = {}) => ({
    id: Uuid.random().value,
    fingerprint: `fp_${Uuid.random().value}`,
    lifecycle: 'visitor',
    connectionStatus: 'online',
    createdAt: new Date(),
    ...overrides,
  });

  describe('scope', () => {
    it('debe exponer scope VISITORS', async () => {
      const model = createVisitorModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          VisitorSearchProvider,
          {
            provide: getModelToken(VisitorV2MongoEntity.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(VisitorSearchProvider);
      expect(provider.scope).toEqual([SearchScope.VISITORS]);
    });
  });

  describe('search', () => {
    it('debe retornar resultados mapeados correctamente', async () => {
      const doc = buildDoc({ id: 'abcd1234-5678-abcd-1234-567890abcdef' });
      const model = createVisitorModelMock([doc]);
      const module = await Test.createTestingModule({
        providers: [
          VisitorSearchProvider,
          {
            provide: getModelToken(VisitorV2MongoEntity.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(VisitorSearchProvider);

      const results = await provider.search({ query: 'abcd1234', companyId });

      expect(results).toHaveLength(1);
      const r = results[0].toPrimitives();
      expect(r.id).toBe(doc.id);
      expect(r.scope).toBe(SearchScope.VISITORS);
      expect(r.title).toContain('Visitante');
      expect(r.title).toContain('abcd1234');
      expect(r.url).toBe(`/visitors/${doc.id}`);
      expect(r.metadata?.lifecycle).toBe('visitor');
      expect(r.metadata?.connectionStatus).toBe('online');
      expect(r.metadata?.fingerprint).toBe(doc.fingerprint);
    });

    it('debe usar $or con regex para id y fingerprint', async () => {
      const model = createVisitorModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          VisitorSearchProvider,
          {
            provide: getModelToken(VisitorV2MongoEntity.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(VisitorSearchProvider);

      await provider.search({ query: 'abc123', companyId });

      const filterArg = model.find.mock.calls[0][0];
      expect(filterArg.$or).toBeDefined();
      expect(filterArg.$or).toHaveLength(2);
      expect(filterArg.$or[0].id).toBeInstanceOf(RegExp);
      expect(filterArg.$or[1].fingerprint).toBeInstanceOf(RegExp);
    });

    it('debe filtrar por tenantId (companyId)', async () => {
      const model = createVisitorModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          VisitorSearchProvider,
          {
            provide: getModelToken(VisitorV2MongoEntity.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(VisitorSearchProvider);

      await provider.search({ query: 'test', companyId });

      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: companyId }),
      );
    });

    it('debe usar limit 5 por defecto', async () => {
      const execMock = jest.fn().mockResolvedValue([]);
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const selectMock = jest.fn().mockReturnValue({ limit: limitMock });
      const findMock = jest.fn().mockReturnValue({ select: selectMock });

      const module = await Test.createTestingModule({
        providers: [
          VisitorSearchProvider,
          {
            provide: getModelToken(VisitorV2MongoEntity.name),
            useValue: { find: findMock },
          },
        ],
      }).compile();
      provider = module.get(VisitorSearchProvider);

      await provider.search({ query: 'test', companyId });
      expect(limitMock).toHaveBeenCalledWith(5);
    });

    it('debe retornar [] cuando el modelo lanza un error (resiliencia)', async () => {
      const execMock = jest.fn().mockRejectedValue(new Error('MongoDB down'));
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const selectMock = jest.fn().mockReturnValue({ limit: limitMock });
      const findMock = jest.fn().mockReturnValue({ select: selectMock });

      const module = await Test.createTestingModule({
        providers: [
          VisitorSearchProvider,
          {
            provide: getModelToken(VisitorV2MongoEntity.name),
            useValue: { find: findMock },
          },
        ],
      }).compile();
      provider = module.get(VisitorSearchProvider);

      const results = await provider.search({ query: 'fail', companyId });
      expect(results).toEqual([]);
    });

    it('debe retornar [] cuando no hay documentos', async () => {
      const model = createVisitorModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          VisitorSearchProvider,
          {
            provide: getModelToken(VisitorV2MongoEntity.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(VisitorSearchProvider);

      const results = await provider.search({ query: 'nothing', companyId });
      expect(results).toEqual([]);
    });
  });
});
