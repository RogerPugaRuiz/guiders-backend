import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LeadSearchProvider } from '../lead-search.provider';
import { LeadContactDataSchema } from '../../persistence/schemas/lead-contact-data.schema';
import { SearchScope } from 'src/context/shared/domain/search';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

function createLeadModelMock(docs: any[]) {
  const execMock = jest.fn().mockResolvedValue(docs);
  const leanMock = jest.fn().mockReturnValue({ exec: execMock });
  const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
  const selectMock = jest.fn().mockReturnValue({ limit: limitMock });
  const findMock = jest.fn().mockReturnValue({ select: selectMock });
  return { find: findMock, _limit: limitMock };
}

describe('LeadSearchProvider', () => {
  let provider: LeadSearchProvider;

  const companyId = Uuid.random().value;

  const buildDoc = (overrides: Partial<any> = {}) => ({
    id: Uuid.random().value,
    nombre: 'María',
    apellidos: 'López',
    email: 'maria@example.com',
    telefono: '+34600000001',
    visitorId: Uuid.random().value,
    extractedAt: new Date(),
    ...overrides,
  });

  describe('scope', () => {
    it('debe exponer scope LEADS', async () => {
      const model = createLeadModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          LeadSearchProvider,
          {
            provide: getModelToken(LeadContactDataSchema.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(LeadSearchProvider);
      expect(provider.scope).toEqual([SearchScope.LEADS]);
    });
  });

  describe('search', () => {
    it('debe retornar resultados mapeados con nombre completo', async () => {
      const doc = buildDoc();
      const model = createLeadModelMock([doc]);
      const module = await Test.createTestingModule({
        providers: [
          LeadSearchProvider,
          {
            provide: getModelToken(LeadContactDataSchema.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(LeadSearchProvider);

      const results = await provider.search({ query: 'María', companyId });

      expect(results).toHaveLength(1);
      const r = results[0].toPrimitives();
      expect(r.id).toBe(doc.id);
      expect(r.scope).toBe(SearchScope.LEADS);
      expect(r.title).toBe('María López');
      expect(r.subtitle).toBe('maria@example.com');
      expect(r.url).toBe(`/leads/${doc.visitorId}`);
      expect(r.metadata?.email).toBe('maria@example.com');
      expect(r.metadata?.visitorId).toBe(doc.visitorId);
    });

    it('debe usar teléfono como subtitle cuando no hay email', async () => {
      const doc = buildDoc({ email: undefined });
      const model = createLeadModelMock([doc]);
      const module = await Test.createTestingModule({
        providers: [
          LeadSearchProvider,
          {
            provide: getModelToken(LeadContactDataSchema.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(LeadSearchProvider);

      const results = await provider.search({ query: 'María', companyId });
      expect(results[0].toPrimitives().subtitle).toBe('+34600000001');
    });

    it('debe usar "Sin contacto" como subtitle cuando no hay email ni teléfono', async () => {
      const doc = buildDoc({ email: undefined, telefono: undefined });
      const model = createLeadModelMock([doc]);
      const module = await Test.createTestingModule({
        providers: [
          LeadSearchProvider,
          {
            provide: getModelToken(LeadContactDataSchema.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(LeadSearchProvider);

      const results = await provider.search({ query: 'María', companyId });
      expect(results[0].toPrimitives().subtitle).toBe('Sin contacto');
    });

    it('debe usar "Lead sin nombre" cuando nombre y apellidos están vacíos', async () => {
      const doc = buildDoc({ nombre: undefined, apellidos: undefined });
      const model = createLeadModelMock([doc]);
      const module = await Test.createTestingModule({
        providers: [
          LeadSearchProvider,
          {
            provide: getModelToken(LeadContactDataSchema.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(LeadSearchProvider);

      const results = await provider.search({ query: 'test', companyId });
      expect(results[0].toPrimitives().title).toBe('Lead sin nombre');
    });

    it('debe incluir $text con la query en el filtro', async () => {
      const model = createLeadModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          LeadSearchProvider,
          {
            provide: getModelToken(LeadContactDataSchema.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(LeadSearchProvider);

      await provider.search({ query: 'garcia', companyId });

      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({ $text: { $search: 'garcia' } }),
      );
    });

    it('debe filtrar por companyId', async () => {
      const model = createLeadModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          LeadSearchProvider,
          {
            provide: getModelToken(LeadContactDataSchema.name),
            useValue: model,
          },
        ],
      }).compile();
      provider = module.get(LeadSearchProvider);

      await provider.search({ query: 'test', companyId });

      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId }),
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
          LeadSearchProvider,
          {
            provide: getModelToken(LeadContactDataSchema.name),
            useValue: { find: findMock },
          },
        ],
      }).compile();
      provider = module.get(LeadSearchProvider);

      await provider.search({ query: 'test', companyId });
      expect(limitMock).toHaveBeenCalledWith(5);
    });

    it('debe retornar [] cuando el modelo lanza un error (resiliencia)', async () => {
      const execMock = jest.fn().mockRejectedValue(new Error('Timeout'));
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const selectMock = jest.fn().mockReturnValue({ limit: limitMock });
      const findMock = jest.fn().mockReturnValue({ select: selectMock });

      const module = await Test.createTestingModule({
        providers: [
          LeadSearchProvider,
          {
            provide: getModelToken(LeadContactDataSchema.name),
            useValue: { find: findMock },
          },
        ],
      }).compile();
      provider = module.get(LeadSearchProvider);

      const results = await provider.search({ query: 'fail', companyId });
      expect(results).toEqual([]);
    });
  });
});
