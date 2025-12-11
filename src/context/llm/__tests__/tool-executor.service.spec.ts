/**
 * Tests unitarios para ToolExecutorServiceImpl
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ok, err } from 'src/context/shared/domain/result';
import {
  ToolExecutorServiceImpl,
  ToolExecutorServiceProvider,
} from '../infrastructure/services/tool-executor.service.impl';
import { WebContentFetcherService } from '../infrastructure/services/web-content-fetcher.service';
import { TOOL_EXECUTOR_SERVICE } from '../domain/services/tool-executor.service';
import { WebContentCacheSchema } from '../infrastructure/schemas/web-content-cache.schema';
import {
  ToolExecutionContext,
  LlmToolCall,
  ToolConfigPrimitives,
  DEFAULT_TOOL_CONFIG,
} from '../domain/tool-definitions';
import { LlmToolExecutionError } from '../domain/errors/llm.error';

describe('ToolExecutorServiceImpl', () => {
  let service: ToolExecutorServiceImpl;
  let mockWebFetcher: jest.Mocked<WebContentFetcherService>;
  let mockCacheModel: jest.Mocked<Model<any>>;

  const defaultContext: ToolExecutionContext = {
    companyId: 'company-456',
    baseDomain: 'example.com',
    allowedDomains: ['www.example.com'],
    toolConfig: {
      ...DEFAULT_TOOL_CONFIG,
      fetchPageEnabled: true,
      cacheEnabled: true,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockWebFetcher = {
      fetchContent: jest.fn(),
      buildFullUrl: jest.fn(),
      isPathSafe: jest.fn(),
      isUrlAllowed: jest.fn(),
    } as unknown as jest.Mocked<WebContentFetcherService>;

    mockCacheModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      updateOne: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<Model<any>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolExecutorServiceProvider,
        {
          provide: WebContentFetcherService,
          useValue: mockWebFetcher,
        },
        {
          provide: getModelToken(WebContentCacheSchema.name),
          useValue: mockCacheModel,
        },
      ],
    }).compile();

    service = module.get<ToolExecutorServiceImpl>(TOOL_EXECUTOR_SERVICE);
  });

  describe('getAvailableTools', () => {
    it('debería retornar fetch_page_content cuando está habilitado', () => {
      const toolConfig: ToolConfigPrimitives = {
        ...DEFAULT_TOOL_CONFIG,
        fetchPageEnabled: true,
      };

      const tools = service.getAvailableTools(toolConfig, 'example.com');

      expect(tools).toHaveLength(1);
      expect(tools[0].function.name).toBe('fetch_page_content');
      expect(tools[0].type).toBe('function');
    });

    it('debería incluir el dominio en la descripción de la tool', () => {
      const toolConfig: ToolConfigPrimitives = {
        ...DEFAULT_TOOL_CONFIG,
        fetchPageEnabled: true,
      };

      const tools = service.getAvailableTools(toolConfig, 'miempresa.com');

      expect(tools[0].function.description).toContain('miempresa.com');
    });

    it('debería retornar lista vacía cuando fetchPageEnabled es false', () => {
      const toolConfig: ToolConfigPrimitives = {
        ...DEFAULT_TOOL_CONFIG,
        fetchPageEnabled: false,
      };

      const tools = service.getAvailableTools(toolConfig, 'example.com');

      expect(tools).toHaveLength(0);
    });
  });

  describe('executeTools', () => {
    const createToolCall = (
      name: string,
      args: Record<string, unknown>,
    ): LlmToolCall => ({
      id: `call_${Date.now()}`,
      type: 'function',
      function: {
        name,
        arguments: JSON.stringify(args),
      },
    });

    describe('fetch_page_content', () => {
      beforeEach(() => {
        mockWebFetcher.isPathSafe.mockReturnValue(true);
        mockWebFetcher.buildFullUrl.mockReturnValue(
          'https://example.com/productos',
        );
        mockWebFetcher.isUrlAllowed.mockReturnValue(true);
      });

      it('debería ejecutar fetch_page_content exitosamente', async () => {
        mockWebFetcher.fetchContent.mockResolvedValue(
          ok({
            content: '# Productos\n\nNuestros productos de calidad...',
            sourceUrl: 'https://example.com/productos',
            originalSize: 5000,
            truncated: false,
            fetchTimeMs: 150,
          }),
        );

        const toolCalls = [
          createToolCall('fetch_page_content', { path: '/productos' }),
        ];

        const result = await service.executeTools(toolCalls, defaultContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);
        expect(results[0].content).toContain('Productos');
      });

      it('debería retornar error cuando path está vacío', async () => {
        const toolCalls = [createToolCall('fetch_page_content', { path: '' })];

        const result = await service.executeTools(toolCalls, defaultContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results[0].success).toBe(false);
        expect(results[0].content).toContain('Path es requerido');
      });

      it('debería retornar error cuando path no es seguro', async () => {
        mockWebFetcher.isPathSafe.mockReturnValue(false);

        const toolCalls = [
          createToolCall('fetch_page_content', { path: '../../../etc/passwd' }),
        ];

        const result = await service.executeTools(toolCalls, defaultContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results[0].success).toBe(false);
        expect(results[0].content).toContain('no válido');
      });

      it('debería respetar allowedPaths cuando está configurado', async () => {
        const restrictedContext: ToolExecutionContext = {
          ...defaultContext,
          toolConfig: {
            ...defaultContext.toolConfig,
            allowedPaths: ['/productos', '/servicios'],
          },
        };

        const toolCalls = [
          createToolCall('fetch_page_content', { path: '/admin' }),
        ];

        const result = await service.executeTools(toolCalls, restrictedContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results[0].success).toBe(false);
        expect(results[0].content).toContain('no está permitido');
      });

      it('debería permitir paths dentro de allowedPaths', async () => {
        const restrictedContext: ToolExecutionContext = {
          ...defaultContext,
          toolConfig: {
            ...defaultContext.toolConfig,
            allowedPaths: ['/productos'],
          },
        };

        mockWebFetcher.fetchContent.mockResolvedValue(
          ok({
            content: '# Productos',
            sourceUrl: 'https://example.com/productos/categoria1',
            originalSize: 100,
            truncated: false,
            fetchTimeMs: 50,
          }),
        );

        const toolCalls = [
          createToolCall('fetch_page_content', {
            path: '/productos/categoria1',
          }),
        ];

        const result = await service.executeTools(toolCalls, restrictedContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results[0].success).toBe(true);
      });

      it('debería retornar error cuando URL no pertenece al dominio permitido', async () => {
        mockWebFetcher.isUrlAllowed.mockReturnValue(false);

        const toolCalls = [
          createToolCall('fetch_page_content', { path: '/productos' }),
        ];

        const result = await service.executeTools(toolCalls, defaultContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results[0].success).toBe(false);
        expect(results[0].content).toContain('dominios permitidos');
      });

      it('debería usar cache cuando está habilitado y hay datos en cache', async () => {
        mockCacheModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            content: '# Contenido cacheado',
          }),
        } as any);

        const toolCalls = [
          createToolCall('fetch_page_content', { path: '/productos' }),
        ];

        const result = await service.executeTools(toolCalls, defaultContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results[0].success).toBe(true);
        expect(results[0].content).toBe('# Contenido cacheado');
        expect(mockWebFetcher.fetchContent).not.toHaveBeenCalled();
      });

      it('debería hacer fetch cuando cache está vacío', async () => {
        mockCacheModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        } as any);

        mockWebFetcher.fetchContent.mockResolvedValue(
          ok({
            content: '# Contenido nuevo',
            sourceUrl: 'https://example.com/productos',
            originalSize: 200,
            truncated: false,
            fetchTimeMs: 100,
          }),
        );

        const toolCalls = [
          createToolCall('fetch_page_content', { path: '/productos' }),
        ];

        const result = await service.executeTools(toolCalls, defaultContext);

        expect(result.isOk()).toBe(true);
        expect(mockWebFetcher.fetchContent).toHaveBeenCalled();
        expect(mockCacheModel.updateOne).toHaveBeenCalled();
      });

      it('debería no guardar en cache cuando cacheEnabled es false', async () => {
        const noCacheContext: ToolExecutionContext = {
          ...defaultContext,
          toolConfig: {
            ...defaultContext.toolConfig,
            cacheEnabled: false,
          },
        };

        mockWebFetcher.fetchContent.mockResolvedValue(
          ok({
            content: '# Contenido',
            sourceUrl: 'https://example.com/productos',
            originalSize: 100,
            truncated: false,
            fetchTimeMs: 50,
          }),
        );

        const toolCalls = [
          createToolCall('fetch_page_content', { path: '/productos' }),
        ];

        await service.executeTools(toolCalls, noCacheContext);

        expect(mockCacheModel.findOne).not.toHaveBeenCalled();
        expect(mockCacheModel.updateOne).not.toHaveBeenCalled();
      });

      it('debería manejar errores del fetcher', async () => {
        mockWebFetcher.fetchContent.mockResolvedValue(
          err(new LlmToolExecutionError('fetch_page_content', 'Timeout')),
        );

        const toolCalls = [
          createToolCall('fetch_page_content', { path: '/productos' }),
        ];

        const result = await service.executeTools(toolCalls, defaultContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results[0].success).toBe(false);
        expect(results[0].content).toContain('Timeout');
      });
    });

    describe('tool desconocida', () => {
      it('debería retornar error para tool no existente', async () => {
        const toolCalls = [createToolCall('unknown_tool', { param: 'value' })];

        const result = await service.executeTools(toolCalls, defaultContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results[0].success).toBe(false);
        expect(results[0].content).toContain("Tool 'unknown_tool' no existe");
      });
    });

    describe('múltiples tool calls', () => {
      beforeEach(() => {
        mockWebFetcher.isPathSafe.mockReturnValue(true);
        mockWebFetcher.isUrlAllowed.mockReturnValue(true);
      });

      it('debería ejecutar múltiples tools en secuencia', async () => {
        mockWebFetcher.buildFullUrl
          .mockReturnValueOnce('https://example.com/productos')
          .mockReturnValueOnce('https://example.com/servicios');

        mockWebFetcher.fetchContent
          .mockResolvedValueOnce(
            ok({
              content: '# Productos',
              sourceUrl: 'https://example.com/productos',
              originalSize: 100,
              truncated: false,
              fetchTimeMs: 50,
            }),
          )
          .mockResolvedValueOnce(
            ok({
              content: '# Servicios',
              sourceUrl: 'https://example.com/servicios',
              originalSize: 150,
              truncated: false,
              fetchTimeMs: 60,
            }),
          );

        const toolCalls = [
          createToolCall('fetch_page_content', { path: '/productos' }),
          createToolCall('fetch_page_content', { path: '/servicios' }),
        ];

        const result = await service.executeTools(toolCalls, defaultContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(true);
        expect(results[0].content).toBe('# Productos');
        expect(results[1].success).toBe(true);
        expect(results[1].content).toBe('# Servicios');
      });
    });

    describe('argumentos malformados', () => {
      it('debería manejar JSON inválido en arguments', async () => {
        const toolCall: LlmToolCall = {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'fetch_page_content',
            arguments: 'invalid json {',
          },
        };

        const result = await service.executeTools([toolCall], defaultContext);

        expect(result.isOk()).toBe(true);
        const results = result.unwrap();
        expect(results[0].success).toBe(false);
        expect(results[0].content).toContain('Error');
      });
    });
  });
});
