import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ChatSearchProvider } from '../chat-search.provider';
import { ChatSchema } from '../../schemas/chat.schema';
import { SearchScope } from 'src/context/shared/domain/search';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

/**
 * Crea un mock del Model de Mongoose con soporte para chaining (find, select, limit, lean, exec).
 */
function createChatModelMock(docs: any[]) {
  const execMock = jest.fn().mockResolvedValue(docs);
  const leanMock = jest.fn().mockReturnValue({ exec: execMock });
  const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
  const selectMock = jest.fn().mockReturnValue({ limit: limitMock });
  const findMock = jest.fn().mockReturnValue({ select: selectMock });
  return { find: findMock, _exec: execMock };
}

describe('ChatSearchProvider', () => {
  let provider: ChatSearchProvider;
  let chatModel: ReturnType<typeof createChatModelMock>;

  const companyId = Uuid.random().value;

  const buildDoc = (overrides: Partial<any> = {}) => ({
    id: Uuid.random().value,
    status: 'OPEN',
    visitorInfo: { name: 'Juan García', email: 'juan@example.com' },
    assignedCommercialId: null,
    createdAt: new Date('2024-01-15'),
    ...overrides,
  });

  beforeEach(async () => {
    chatModel = createChatModelMock([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatSearchProvider,
        {
          provide: getModelToken(ChatSchema.name),
          useValue: chatModel,
        },
      ],
    }).compile();

    provider = module.get<ChatSearchProvider>(ChatSearchProvider);
  });

  describe('scope', () => {
    it('debe exponer scope CHATS', () => {
      expect(provider.scope).toEqual([SearchScope.CHATS]);
    });
  });

  describe('search', () => {
    it('debe retornar resultados mapeados correctamente', async () => {
      const doc = buildDoc();
      chatModel = createChatModelMock([doc]);

      // Re-crear el provider con el nuevo mock
      const module = await Test.createTestingModule({
        providers: [
          ChatSearchProvider,
          { provide: getModelToken(ChatSchema.name), useValue: chatModel },
        ],
      }).compile();
      provider = module.get(ChatSearchProvider);

      const results = await provider.search({
        query: 'Juan',
        companyId,
        limit: 5,
      });

      expect(results).toHaveLength(1);
      const r = results[0].toPrimitives();
      expect(r.id).toBe(doc.id);
      expect(r.scope).toBe(SearchScope.CHATS);
      expect(r.title).toBe('Juan García');
      expect(r.url).toBe(`/chats/${doc.id}`);
      expect(r.metadata?.status).toBe('OPEN');
      expect(r.metadata?.email).toBe('juan@example.com');
    });

    it('debe usar "Visitante desconocido" cuando visitorInfo.name no existe', async () => {
      const doc = buildDoc({ visitorInfo: {} });
      chatModel = createChatModelMock([doc]);
      const module = await Test.createTestingModule({
        providers: [
          ChatSearchProvider,
          { provide: getModelToken(ChatSchema.name), useValue: chatModel },
        ],
      }).compile();
      provider = module.get(ChatSearchProvider);

      const results = await provider.search({ query: 'x', companyId });
      expect(results[0].toPrimitives().title).toBe('Visitante desconocido');
    });

    it('debe filtrar por assignedCommercialId cuando agentId está presente', async () => {
      const agentId = Uuid.random().value;
      chatModel = createChatModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          ChatSearchProvider,
          { provide: getModelToken(ChatSchema.name), useValue: chatModel },
        ],
      }).compile();
      provider = module.get(ChatSearchProvider);

      await provider.search({ query: 'test', companyId, agentId });

      expect(chatModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ assignedCommercialId: agentId }),
      );
    });

    it('NO debe incluir assignedCommercialId en el filtro cuando agentId no está presente', async () => {
      chatModel = createChatModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          ChatSearchProvider,
          { provide: getModelToken(ChatSchema.name), useValue: chatModel },
        ],
      }).compile();
      provider = module.get(ChatSearchProvider);

      await provider.search({ query: 'test', companyId });

      const filterArg = chatModel.find.mock.calls[0][0];
      expect(filterArg.assignedCommercialId).toBeUndefined();
    });

    it('debe incluir $text con la query en el filtro', async () => {
      chatModel = createChatModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          ChatSearchProvider,
          { provide: getModelToken(ChatSchema.name), useValue: chatModel },
        ],
      }).compile();
      provider = module.get(ChatSearchProvider);

      await provider.search({ query: 'hola mundo', companyId });

      expect(chatModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ $text: { $search: 'hola mundo' } }),
      );
    });

    it('debe usar limit 5 por defecto cuando no se especifica', async () => {
      // Verificamos usando una cadena de mocks que capture el argumento de limit
      const execMock = jest.fn().mockResolvedValue([]);
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
      const selectMock = jest.fn().mockReturnValue({ limit: limitMock });
      const findMock = jest.fn().mockReturnValue({ select: selectMock });
      const model = { find: findMock };

      const module = await Test.createTestingModule({
        providers: [
          ChatSearchProvider,
          { provide: getModelToken(ChatSchema.name), useValue: model },
        ],
      }).compile();
      provider = module.get(ChatSearchProvider);

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
          ChatSearchProvider,
          {
            provide: getModelToken(ChatSchema.name),
            useValue: { find: findMock },
          },
        ],
      }).compile();
      provider = module.get(ChatSearchProvider);

      const results = await provider.search({ query: 'test', companyId });
      expect(results).toEqual([]);
    });

    it('debe retornar [] cuando no hay documentos', async () => {
      chatModel = createChatModelMock([]);
      const module = await Test.createTestingModule({
        providers: [
          ChatSearchProvider,
          { provide: getModelToken(ChatSchema.name), useValue: chatModel },
        ],
      }).compile();
      provider = module.get(ChatSearchProvider);

      const results = await provider.search({ query: 'nothing', companyId });
      expect(results).toEqual([]);
    });
  });
});
