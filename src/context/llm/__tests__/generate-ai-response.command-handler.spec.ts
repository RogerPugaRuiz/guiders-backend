/**
 * Tests unitarios para GenerateAIResponseCommandHandler
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { GenerateAIResponseCommandHandler } from '../application/commands/generate-ai-response.command-handler';
import { GenerateAIResponseCommand } from '../application/commands/generate-ai-response.command';
import {
  LlmProviderService,
  LLM_PROVIDER_SERVICE,
} from '../domain/services/llm-provider.service';
import {
  LlmContextBuilderService,
  LLM_CONTEXT_BUILDER_SERVICE,
} from '../domain/services/llm-context-builder.service';
import {
  ILlmConfigRepository,
  LLM_CONFIG_REPOSITORY,
} from '../domain/llm-config.repository';
import {
  IMessageRepository,
  MESSAGE_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/message.repository';
import {
  ToolExecutorService,
  TOOL_EXECUTOR_SERVICE,
} from '../domain/services/tool-executor.service';
import { QueryBus } from '@nestjs/cqrs';
import { ok, err, okVoid } from 'src/context/shared/domain/result';
import { LlmContext } from '../domain/value-objects/llm-context';
import { LlmResponse } from '../domain/value-objects/llm-response';
import { LlmCompanyConfig } from '../domain/value-objects/llm-company-config';
import { LlmProviderError } from '../domain/errors/llm.error';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('GenerateAIResponseCommandHandler', () => {
  let handler: GenerateAIResponseCommandHandler;
  let mockLlmProvider: jest.Mocked<LlmProviderService>;
  let mockContextBuilder: jest.Mocked<LlmContextBuilderService>;
  let mockConfigRepository: jest.Mocked<ILlmConfigRepository>;
  let mockMessageRepository: jest.Mocked<IMessageRepository>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;
  let mockToolExecutor: jest.Mocked<ToolExecutorService>;
  let mockQueryBus: jest.Mocked<QueryBus>;
  let mockWebsocketGateway: { emitToRoom: jest.Mock };

  const chatId = Uuid.random().value;
  const visitorId = Uuid.random().value;
  const companyId = Uuid.random().value;
  const triggerMessageId = Uuid.random().value;

  beforeEach(async () => {
    mockLlmProvider = {
      generateCompletion: jest.fn(),
      generateCompletionWithTools: jest.fn(),
      generateSuggestions: jest.fn(),
      getProviderName: jest.fn().mockReturnValue('groq'),
      getDefaultModel: jest.fn().mockReturnValue('llama-3.3-70b-versatile'),
    };

    mockContextBuilder = {
      buildContext: jest.fn(),
      buildSimpleContext: jest.fn(),
    };

    // Mock completo de ILlmConfigRepository
    mockConfigRepository = {
      findByCompanyId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<ILlmConfigRepository>;

    // Mock completo de IMessageRepository (solo métodos usados)
    mockMessageRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      match: jest.fn(),
      count: jest.fn(),
      findByChatId: jest.fn(),
      findByVisitorId: jest.fn(),
      findByCommercialId: jest.fn(),
      getUnreadMessages: jest.fn(),
      markAsRead: jest.fn(),
      getLastMessage: jest.fn(),
      getFirstMessage: jest.fn(),
      findByType: jest.fn(),
      searchByContent: jest.fn(),
      findWithAttachments: jest.fn(),
      countByChatId: jest.fn(),
      getConversationStats: jest.fn(),
      getMessageMetrics: jest.fn(),
      getAverageResponseTime: jest.fn(),
      findByDateRange: jest.fn(),
      getSystemMessages: jest.fn(),
      getLastReadMessage: jest.fn(),
      getMessageSequence: jest.fn(),
    } as jest.Mocked<IMessageRepository>;

    mockEventPublisher = {
      mergeObjectContext: jest
        .fn()
        .mockImplementation((obj: Record<string, unknown>) => ({
          ...obj,
          commit: jest.fn(),
        })),
      mergeClassContext: jest.fn(),
    } as unknown as jest.Mocked<EventPublisher>;

    mockToolExecutor = {
      executeTools: jest.fn(),
      getAvailableTools: jest.fn().mockReturnValue([
        {
          name: 'example_tool',
          description: 'Example tool',
          parameters: {},
        },
      ]),
    } as jest.Mocked<ToolExecutorService>;

    mockQueryBus = {
      execute: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<QueryBus>;

    mockWebsocketGateway = {
      emitToRoom: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateAIResponseCommandHandler,
        { provide: LLM_PROVIDER_SERVICE, useValue: mockLlmProvider },
        { provide: LLM_CONTEXT_BUILDER_SERVICE, useValue: mockContextBuilder },
        { provide: TOOL_EXECUTOR_SERVICE, useValue: mockToolExecutor },
        { provide: LLM_CONFIG_REPOSITORY, useValue: mockConfigRepository },
        { provide: MESSAGE_V2_REPOSITORY, useValue: mockMessageRepository },
        { provide: 'WEBSOCKET_GATEWAY', useValue: mockWebsocketGateway },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    }).compile();

    handler = module.get<GenerateAIResponseCommandHandler>(
      GenerateAIResponseCommandHandler,
    );
  });

  describe('execute', () => {
    const defaultCommand = new GenerateAIResponseCommand(
      chatId,
      visitorId,
      companyId,
      triggerMessageId,
    );

    const mockConfig = LlmCompanyConfig.createDefault(companyId);

    const mockContext = LlmContext.create({
      systemPrompt: 'Eres un asistente',
      conversationHistory: [{ role: 'user', content: 'Hola' }],
    });

    const mockLlmResponse = LlmResponse.create({
      content: '¡Hola! ¿En qué puedo ayudarte?',
      model: 'llama-3.3-70b-versatile',
      tokensUsed: 20,
      processingTimeMs: 500,
    });

    beforeEach(() => {
      // Mock de generateCompletionWithTools para que nunca tenga finish_reason tool_calls
      mockLlmProvider.generateCompletionWithTools = jest.fn().mockResolvedValue(
        ok({
          response: mockLlmResponse,
          finishReason: 'stop',
          toolCalls: undefined,
        }),
      );
    });

    it('debería generar respuesta de IA exitosamente', async () => {
      mockConfigRepository.findByCompanyId.mockResolvedValue(ok(mockConfig));
      mockContextBuilder.buildContext.mockResolvedValue(ok(mockContext));
      mockLlmProvider.generateCompletionWithTools.mockResolvedValue(
        ok({
          response: mockLlmResponse,
          finishReason: 'stop',
          toolCalls: undefined,
        }),
      );
      mockMessageRepository.save.mockResolvedValue(okVoid());

      const result = await handler.execute(defaultCommand);

      expect(result).toBeDefined();
      expect(result.content).toBe('¡Hola! ¿En qué puedo ayudarte?');
      expect(result.messageId).toBeDefined();
      expect(mockLlmProvider.generateCompletionWithTools).toHaveBeenCalled();
      expect(mockMessageRepository.save).toHaveBeenCalled();
    });

    it('debería crear configuración por defecto si no existe', async () => {
      mockConfigRepository.findByCompanyId.mockResolvedValue(
        err({ message: 'No encontrado' } as any),
      );
      mockConfigRepository.save.mockResolvedValue(okVoid());
      mockContextBuilder.buildContext.mockResolvedValue(ok(mockContext));
      mockLlmProvider.generateCompletion.mockResolvedValue(ok(mockLlmResponse));
      mockMessageRepository.save.mockResolvedValue(okVoid());

      const result = await handler.execute(defaultCommand);

      expect(result).toBeDefined();
      expect(mockConfigRepository.save).toHaveBeenCalled();
    });

    it('debería lanzar error si falla la construcción del contexto', async () => {
      mockConfigRepository.findByCompanyId.mockResolvedValue(ok(mockConfig));
      mockContextBuilder.buildContext.mockResolvedValue(
        err({ message: 'Error construyendo contexto' } as any),
      );

      await expect(handler.execute(defaultCommand)).rejects.toThrow(
        'Error al construir contexto',
      );
      expect(mockLlmProvider.generateCompletion).not.toHaveBeenCalled();
    });

    it('debería lanzar error si falla el proveedor LLM', async () => {
      mockConfigRepository.findByCompanyId.mockResolvedValue(ok(mockConfig));
      mockContextBuilder.buildContext.mockResolvedValue(ok(mockContext));
      mockLlmProvider.generateCompletionWithTools.mockResolvedValue(
        err(new LlmProviderError('groq', 'API error')),
      );

      await expect(handler.execute(defaultCommand)).rejects.toThrow(
        'Error en LLM',
      );
      expect(mockMessageRepository.save).not.toHaveBeenCalled();
    });

    it('debería aplicar delay configurado antes de responder', async () => {
      const configWithDelay = LlmCompanyConfig.create({
        companyId,
        aiAutoResponseEnabled: true,
        aiSuggestionsEnabled: true,
        aiRespondWithCommercial: false,
        preferredProvider: 'groq',
        preferredModel: 'llama-3.3-70b-versatile',
        maxResponseTokens: 500,
        temperature: 0.7,
        responseDelayMs: 100, // 100ms de delay
      });

      mockConfigRepository.findByCompanyId.mockResolvedValue(
        ok(configWithDelay),
      );
      mockContextBuilder.buildContext.mockResolvedValue(ok(mockContext));
      mockLlmProvider.generateCompletion.mockResolvedValue(ok(mockLlmResponse));
      mockMessageRepository.save.mockResolvedValue(okVoid());

      const startTime = Date.now();
      await handler.execute(defaultCommand);
      const elapsed = Date.now() - startTime;

      // Verificar que al menos pasó el delay configurado
      expect(elapsed).toBeGreaterThanOrEqual(90); // Un poco menos para tolerancia
    });

    it('debería usar custom system prompt si está configurado', async () => {
      const configWithCustomPrompt = LlmCompanyConfig.create({
        companyId,
        aiAutoResponseEnabled: true,
        aiSuggestionsEnabled: true,
        aiRespondWithCommercial: false,
        preferredProvider: 'groq',
        preferredModel: 'llama-3.3-70b-versatile',
        customSystemPrompt: 'Eres el asistente de MiEmpresa',
        maxResponseTokens: 500,
        temperature: 0.7,
        responseDelayMs: 0,
      });

      mockConfigRepository.findByCompanyId.mockResolvedValue(
        ok(configWithCustomPrompt),
      );
      mockContextBuilder.buildContext.mockResolvedValue(ok(mockContext));
      mockLlmProvider.generateCompletion.mockResolvedValue(ok(mockLlmResponse));
      mockMessageRepository.save.mockResolvedValue(okVoid());

      await handler.execute(defaultCommand);

      expect(mockContextBuilder.buildContext).toHaveBeenCalledWith(
        expect.objectContaining({
          customSystemPrompt: 'Eres el asistente de MiEmpresa',
        }),
      );
    });

    it('debería retornar el processingTimeMs en la respuesta', async () => {
      mockConfigRepository.findByCompanyId.mockResolvedValue(ok(mockConfig));
      mockContextBuilder.buildContext.mockResolvedValue(ok(mockContext));
      mockLlmProvider.generateCompletion.mockResolvedValue(ok(mockLlmResponse));
      mockMessageRepository.save.mockResolvedValue(okVoid());

      const result = await handler.execute(defaultCommand);

      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
