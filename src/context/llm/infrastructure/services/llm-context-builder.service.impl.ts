/**
 * Implementación del servicio constructor de contexto para LLM
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  LlmContextBuilderService,
  BuildContextParams,
  LLM_CONTEXT_BUILDER_SERVICE,
} from '../../domain/services/llm-context-builder.service';
import {
  LlmContext,
  VisitorContextData,
  CompanyContextData,
} from '../../domain/value-objects/llm-context';
import { LlmMessage } from '../../domain/services/llm-provider.service';
import {
  LlmContextBuildError,
  LlmEmptyChatError,
} from '../../domain/errors/llm.error';
import {
  IMessageRepository,
  MESSAGE_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/message.repository';
import { ChatId } from 'src/context/conversations-v2/domain/value-objects/chat-id';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from 'src/context/visitors-v2/domain/visitor-v2.repository';
import { VisitorId } from 'src/context/visitors-v2/domain/value-objects/visitor-id';
import { Provider } from '@nestjs/common';

@Injectable()
export class LlmContextBuilderServiceImpl implements LlmContextBuilderService {
  private readonly logger = new Logger(LlmContextBuilderServiceImpl.name);

  private readonly DEFAULT_SYSTEM_PROMPT = `Eres un asistente virtual de atención al cliente profesional y amable.
Tu objetivo es ayudar a los visitantes del sitio web a resolver sus dudas de manera clara y concisa.

Instrucciones:
- Responde siempre en español de manera profesional pero cercana
- Si no conoces la respuesta a algo específico, indica que un comercial humano puede ayudar
- Sugiere la opción de "hablar con un agente" si la consulta es muy compleja o requiere información confidencial
- No inventes información sobre productos, precios o disponibilidad
- Mantén las respuestas breves y al punto (máximo 2-3 párrafos)
- Si el visitante saluda, responde de forma amigable antes de preguntar en qué puedes ayudar`;

  constructor(
    @Inject(MESSAGE_V2_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async buildContext(
    params: BuildContextParams,
  ): Promise<Result<LlmContext, DomainError>> {
    try {
      this.logger.debug(`Construyendo contexto para chat ${params.chatId}`);

      // 1. Obtener historial de mensajes
      const historyResult = await this.getConversationHistory(
        params.chatId,
        params.maxHistoryMessages || 20,
      );

      if (historyResult.isErr()) {
        return err(historyResult.error);
      }

      const conversationHistory = historyResult.unwrap();

      // 2. Obtener contexto del visitante si se solicita
      let visitorContext: VisitorContextData | undefined;
      if (params.includeVisitorInfo !== false) {
        const visitorResult = await this.getVisitorContext(params.visitorId);
        if (visitorResult.isOk()) {
          visitorContext = visitorResult.unwrap();
        } else {
          this.logger.warn(
            `No se pudo obtener contexto del visitante: ${visitorResult.error.message}`,
          );
        }
      }

      // 3. Construir el prompt del sistema
      const systemPrompt =
        params.customSystemPrompt || this.DEFAULT_SYSTEM_PROMPT;

      // 4. Crear el contexto
      const context = LlmContext.create({
        systemPrompt,
        conversationHistory,
        visitorContext,
        companyContext: undefined, // TODO: Implementar cuando esté disponible CompanyRepository
      });

      this.logger.debug(
        `Contexto construido: ${conversationHistory.length} mensajes`,
      );

      return ok(context);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return err(new LlmContextBuildError(errorMessage, params.chatId));
    }
  }

  async buildSimpleContext(
    chatId: string,
    maxMessages = 10,
  ): Promise<Result<LlmContext, DomainError>> {
    try {
      const historyResult = await this.getConversationHistory(
        chatId,
        maxMessages,
      );

      if (historyResult.isErr()) {
        return err(historyResult.error);
      }

      const context = LlmContext.create({
        systemPrompt: this.DEFAULT_SYSTEM_PROMPT,
        conversationHistory: historyResult.unwrap(),
      });

      return ok(context);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return err(new LlmContextBuildError(errorMessage, chatId));
    }
  }

  /**
   * Obtiene el historial de conversación formateado para el LLM
   */
  private async getConversationHistory(
    chatId: string,
    maxMessages: number,
  ): Promise<Result<LlmMessage[], DomainError>> {
    const messagesResult = await this.messageRepository.findByChatId(
      ChatId.create(chatId),
      { senderType: undefined }, // Incluir todos los tipos
      { field: 'sentAt', direction: 'ASC' },
      maxMessages,
      0,
    );

    if (messagesResult.isErr()) {
      return err(messagesResult.error);
    }

    const { messages } = messagesResult.unwrap();

    if (messages.length === 0) {
      return err(new LlmEmptyChatError(chatId));
    }

    // Convertir mensajes a formato LLM
    const llmMessages: LlmMessage[] = messages
      .filter((msg) => !msg.isSystemMessage()) // Excluir mensajes del sistema
      .map((msg) => ({
        role: this.mapSenderToRole(msg.senderId, msg.isAI),
        content: msg.content.value,
      }));

    return ok(llmMessages);
  }

  /**
   * Mapea el senderId al rol correspondiente para el LLM
   */
  private mapSenderToRole(
    senderId: string,
    isAI: boolean,
  ): 'user' | 'assistant' {
    // Los mensajes de IA y comerciales son "assistant"
    if (isAI || senderId === 'ai') {
      return 'assistant';
    }

    // Si el senderId parece ser un UUID de comercial, es assistant
    // Los visitantes envían desde su visitorId
    // Esta es una heurística simple - en producción se podría mejorar
    if (senderId.startsWith('commercial-') || senderId.includes('commercial')) {
      return 'assistant';
    }

    // Por defecto, asumimos que es un visitante (user)
    return 'user';
  }

  /**
   * Obtiene el contexto del visitante
   */
  private async getVisitorContext(
    visitorId: string,
  ): Promise<Result<VisitorContextData, DomainError>> {
    const visitorResult = await this.visitorRepository.findById(
      VisitorId.create(visitorId),
    );

    if (visitorResult.isErr()) {
      return err(visitorResult.error);
    }

    const visitor = visitorResult.unwrap();
    const primitives = visitor.toPrimitives();

    // VisitorV2 tiene una estructura simplificada - adaptamos lo disponible
    const context: VisitorContextData = {
      name: undefined, // VisitorV2 no tiene identificación con nombre
      email: undefined, // VisitorV2 no tiene identificación con email
      currentUrl: primitives.currentUrl,
      currentPageTitle: undefined, // VisitorV2 solo tiene URL, no título
      lifecycle: primitives.lifecycle,
      country: undefined, // VisitorV2 no tiene geolocalización
      city: undefined,
      device: undefined, // VisitorV2 no tiene info de dispositivo
      browser: undefined,
      visitCount: primitives.sessions?.length || 1,
    };

    return ok(context);
  }
}

/**
 * Provider para inyección de dependencias
 */
export const LlmContextBuilderServiceProvider: Provider = {
  provide: LLM_CONTEXT_BUILDER_SERVICE,
  useClass: LlmContextBuilderServiceImpl,
};
