/**
 * Implementación del servicio de ejecución de Tools
 * Orquesta la ejecución de herramientas invocadas por el LLM
 */

import { Injectable, Logger, Provider } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  ToolExecutorService,
  TOOL_EXECUTOR_SERVICE,
} from '../../domain/services/tool-executor.service';
import {
  LlmToolCall,
  LlmToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolConfigPrimitives,
} from '../../domain/tool-definitions';
import { LlmToolExecutionError } from '../../domain/errors/llm.error';
import { WebContentFetcherService } from './web-content-fetcher.service';
import {
  WebContentCacheDocument,
  WebContentCacheSchema,
} from '../schemas/web-content-cache.schema';

/**
 * Handler de una tool específica
 */
interface ToolHandler {
  execute(
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<Result<string, DomainError>>;
}

@Injectable()
export class ToolExecutorServiceImpl implements ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorServiceImpl.name);
  private readonly handlers: Map<string, ToolHandler> = new Map();

  constructor(
    private readonly webFetcher: WebContentFetcherService,
    @InjectModel(WebContentCacheSchema.name)
    private readonly cacheModel: Model<WebContentCacheDocument>,
  ) {
    this.registerHandlers();
  }

  /**
   * Registra los handlers de tools disponibles
   */
  private registerHandlers(): void {
    this.handlers.set('fetch_page_content', {
      execute: (args, context) => this.handleFetchPageContent(args, context),
    });
  }

  /**
   * Ejecuta una lista de tool calls
   */
  async executeTools(
    toolCalls: LlmToolCall[],
    context: ToolExecutionContext,
  ): Promise<Result<ToolExecutionResult[], DomainError>> {
    const results: ToolExecutionResult[] = [];

    for (const call of toolCalls) {
      const result = await this.executeSingleTool(call, context);
      results.push(result);
    }

    return ok(results);
  }

  /**
   * Ejecuta una tool individual
   */
  private async executeSingleTool(
    call: LlmToolCall,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const toolName = call.function.name;
    const handler = this.handlers.get(toolName);

    if (!handler) {
      this.logger.warn(`Tool desconocida: ${toolName}`);
      return {
        toolCallId: call.id,
        success: false,
        content: `Error: Tool '${toolName}' no existe`,
      };
    }

    try {
      // Parsear argumentos
      const args = JSON.parse(call.function.arguments) as Record<
        string,
        unknown
      >;

      this.logger.debug(
        `Ejecutando tool ${toolName} con args: ${JSON.stringify(args)}`,
      );

      // Ejecutar handler
      const result = await handler.execute(args, context);

      if (result.isErr()) {
        return {
          toolCallId: call.id,
          success: false,
          content: `Error: ${result.error.message}`,
        };
      }

      return {
        toolCallId: call.id,
        success: true,
        content: result.unwrap(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error ejecutando tool ${toolName}: ${errorMessage}`);

      return {
        toolCallId: call.id,
        success: false,
        content: `Error: ${errorMessage}`,
      };
    }
  }

  /**
   * Handler para fetch_page_content
   */
  private async handleFetchPageContent(
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<Result<string, DomainError>> {
    const path = args.path as string;

    if (!path) {
      return err(
        new LlmToolExecutionError('fetch_page_content', 'Path es requerido'),
      );
    }

    // Validar path
    if (!this.webFetcher.isPathSafe(path)) {
      return err(
        new LlmToolExecutionError(
          'fetch_page_content',
          `Path no válido: ${path}`,
        ),
      );
    }

    // Verificar si el path está permitido
    const toolConfig = context.toolConfig;
    if (toolConfig.allowedPaths && toolConfig.allowedPaths.length > 0) {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const isAllowed = toolConfig.allowedPaths.some((allowed) => {
        const normalizedAllowed = allowed.startsWith('/')
          ? allowed
          : `/${allowed}`;
        return normalizedPath.startsWith(normalizedAllowed);
      });

      if (!isAllowed) {
        return err(
          new LlmToolExecutionError(
            'fetch_page_content',
            `Path '${path}' no está permitido para este sitio`,
          ),
        );
      }
    }

    // Construir URL completa
    const fullUrl = this.webFetcher.buildFullUrl(context.baseDomain, path);

    this.logger.debug(
      `[Tool Use Debug] fullUrl="${fullUrl}", baseDomain="${context.baseDomain}", path="${path}"`,
    );

    // Verificar que la URL sea del dominio permitido
    const allDomains = [context.baseDomain, ...context.allowedDomains];
    const isAllowed = this.webFetcher.isUrlAllowed(fullUrl, allDomains);

    this.logger.debug(
      `[Tool Use Debug] isUrlAllowed=${isAllowed}, allDomains=${JSON.stringify(allDomains)}`,
    );

    if (!isAllowed) {
      return err(
        new LlmToolExecutionError(
          'fetch_page_content',
          `URL '${fullUrl}' no pertenece a los dominios permitidos`,
        ),
      );
    }

    // Buscar en cache si está habilitado
    if (toolConfig.cacheEnabled) {
      const cached = await this.getFromCache(fullUrl, context.siteId);
      if (cached) {
        this.logger.debug(`Cache hit para ${fullUrl}`);
        return ok(cached);
      }
    }

    // Fetch del contenido
    const fetchResult = await this.webFetcher.fetchContent(fullUrl, {
      timeoutMs: toolConfig.fetchTimeoutMs,
    });

    if (fetchResult.isErr()) {
      return err(fetchResult.error);
    }

    const webContent = fetchResult.unwrap();

    // Guardar en cache si está habilitado
    if (toolConfig.cacheEnabled) {
      await this.saveToCache(
        fullUrl,
        context.siteId,
        context.companyId,
        webContent.content,
        webContent.originalSize,
        webContent.truncated,
        webContent.fetchTimeMs,
        toolConfig.cacheTtlSeconds,
      );
    }

    return ok(webContent.content);
  }

  /**
   * Obtiene contenido del cache
   */
  private async getFromCache(
    url: string,
    siteId: string,
  ): Promise<string | null> {
    try {
      const cached = await this.cacheModel
        .findOne({
          url,
          siteId,
          expiresAt: { $gt: new Date() },
        })
        .exec();

      return cached?.content || null;
    } catch (error) {
      this.logger.warn(`Error leyendo cache: ${error}`);
      return null;
    }
  }

  /**
   * Guarda contenido en cache
   */
  private async saveToCache(
    url: string,
    siteId: string,
    companyId: string,
    content: string,
    originalSize: number,
    truncated: boolean,
    fetchTimeMs: number,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await this.cacheModel.updateOne(
        { url, siteId },
        {
          $set: {
            companyId,
            content,
            originalSize,
            truncated,
            fetchTimeMs,
            expiresAt,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (error) {
      this.logger.warn(`Error guardando en cache: ${error}`);
    }
  }

  /**
   * Obtiene las tools disponibles según la configuración
   */
  getAvailableTools(
    toolConfig: ToolConfigPrimitives,
    baseDomain: string,
  ): LlmToolDefinition[] {
    const tools: LlmToolDefinition[] = [];

    if (toolConfig.fetchPageEnabled) {
      tools.push({
        type: 'function',
        function: {
          name: 'fetch_page_content',
          description: `Obtiene el contenido de una página del sitio web ${baseDomain}. Usa esta herramienta cuando necesites información específica sobre productos, servicios, precios, contacto, equipo, o cualquier otro contenido del sitio web del comercial. Solo puedes acceder a páginas de este dominio.`,
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description:
                  'Ruta relativa de la página a obtener. Ejemplos: "/", "/productos", "/servicios", "/contacto", "/sobre-nosotros", "/precios"',
              },
            },
            required: ['path'],
          },
        },
      });
    }

    return tools;
  }
}

/**
 * Provider para inyección de dependencias
 */
export const ToolExecutorServiceProvider: Provider = {
  provide: TOOL_EXECUTOR_SERVICE,
  useClass: ToolExecutorServiceImpl,
};
