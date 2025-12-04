/**
 * Tests unitarios para GroqLlmProviderService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  GroqLlmProviderService,
  GroqLlmProviderServiceProvider,
} from '../infrastructure/providers/groq-llm-provider.service';
import { LLM_PROVIDER_SERVICE } from '../domain/services/llm-provider.service';
import { LlmProviderError } from '../domain/errors/llm.error';

// Mock del SDK de Groq
jest.mock('groq-sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('GroqLlmProviderService', () => {
  let service: GroqLlmProviderService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockGroqClient: any;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroqLlmProviderServiceProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GroqLlmProviderService>(LLM_PROVIDER_SERVICE);

    // Acceder al cliente mock interno
    mockGroqClient = (service as any).client;
  });

  describe('getProviderName', () => {
    it('debería retornar "groq"', () => {
      expect(service.getProviderName()).toBe('groq');
    });
  });

  describe('getDefaultModel', () => {
    it('debería retornar el modelo por defecto de Groq', () => {
      expect(service.getDefaultModel()).toBe('llama-3.3-70b-versatile');
    });
  });

  describe('generateCompletion', () => {
    const defaultParams = {
      systemPrompt: 'Eres un asistente de atención al cliente',
      conversationHistory: [
        { role: 'user' as const, content: 'Hola, tengo una pregunta' },
      ],
      maxTokens: 500,
      temperature: 0.7,
    };

    it('debería generar una respuesta exitosa', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '¡Hola! Estaré encantado de ayudarte. ¿En qué puedo asistirte?',
            },
          },
        ],
        usage: {
          total_tokens: 42,
        },
        model: 'llama-3.3-70b-versatile',
      };

      mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateCompletion(defaultParams);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.content).toBe('¡Hola! Estaré encantado de ayudarte. ¿En qué puedo asistirte?');
      expect(response.model).toBe('llama-3.3-70b-versatile');
      expect(response.tokensUsed).toBe(42);
    });

    it('debería incluir el system prompt en los mensajes', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Respuesta' } }],
        usage: { total_tokens: 10 },
        model: 'llama-3.3-70b-versatile',
      };

      mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

      await service.generateCompletion(defaultParams);

      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'system', content: defaultParams.systemPrompt },
          ]),
        }),
      );
    });

    it('debería retornar error cuando la API falla', async () => {
      mockGroqClient.chat.completions.create.mockRejectedValue(
        new Error('API rate limit exceeded'),
      );

      const result = await service.generateCompletion(defaultParams);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LlmProviderError);
      }
    });

    it('debería retornar error cuando no hay contenido en la respuesta', async () => {
      const mockResponse = {
        choices: [{ message: { content: null } }],
        usage: { total_tokens: 0 },
        model: 'llama-3.3-70b-versatile',
      };

      mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateCompletion(defaultParams);

      expect(result.isErr()).toBe(true);
    });

    it('debería usar valores por defecto para maxTokens y temperature', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Respuesta' } }],
        usage: { total_tokens: 10 },
        model: 'llama-3.3-70b-versatile',
      };

      mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

      await service.generateCompletion({
        systemPrompt: 'Test',
        conversationHistory: [],
      });

      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 500, // valor por defecto
          temperature: 0.7, // valor por defecto
        }),
      );
    });
  });

  describe('generateSuggestions', () => {
    const defaultParams = {
      systemPrompt: 'Genera sugerencias de respuesta',
      conversationHistory: [
        { role: 'user' as const, content: '¿Cuánto cuesta el producto?' },
      ],
    };

    it('debería generar sugerencias exitosamente', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: `1. El precio del producto es de 99€
2. Puedo ayudarte con información de precios
3. ¿Te gustaría conocer nuestras ofertas actuales?`,
            },
          },
        ],
        usage: { total_tokens: 50 },
        model: 'llama-3.3-70b-versatile',
      };

      mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.generateSuggestions(defaultParams, 3);

      expect(result.isOk()).toBe(true);
      const suggestions = result.unwrap();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('debería retornar error cuando la API falla', async () => {
      mockGroqClient.chat.completions.create.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.generateSuggestions(defaultParams, 3);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LlmProviderError);
      }
    });
  });
});
