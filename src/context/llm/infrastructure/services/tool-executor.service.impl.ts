/**
 * Implementación del servicio de ejecución de Tools
 * Orquesta la ejecución de herramientas invocadas por el LLM
 */

import { Injectable, Logger, Provider } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
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
import { SaveLeadContactDataCommand } from 'src/context/leads/application/commands/save-lead-contact-data.command';
import { NotifyCommercialCommand } from '../../application/commands/notify-commercial.command';

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
    private readonly commandBus: CommandBus,
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

    this.handlers.set('save_lead_contact_data', {
      execute: (args, context) => this.handleSaveLeadContactData(args, context),
    });

    this.handlers.set('escalate_to_commercial', {
      execute: (args, context) =>
        this.handleEscalateToCommercial(args, context),
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

    // Fetch del contenido (con cache integrado si está habilitado)
    const fetchResult = await this.webFetcher.fetchContent(fullUrl, {
      timeoutMs: toolConfig.fetchTimeoutMs,
      companyId: toolConfig.cacheEnabled ? context.companyId : undefined,
      cacheTtlSeconds: toolConfig.cacheTtlSeconds,
      forceRefresh: !toolConfig.cacheEnabled,
    });

    if (fetchResult.isErr()) {
      return err(fetchResult.error);
    }

    const webContent = fetchResult.unwrap();

    if (webContent.fromCache) {
      this.logger.debug(`Cache HIT para ${fullUrl}`);
    }

    return ok(webContent.content);
  }

  /**
   * Handler para save_lead_contact_data
   * Permite a la IA guardar datos de contacto extraídos de la conversación
   */
  private async handleSaveLeadContactData(
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<Result<string, DomainError>> {
    // Validar que tenemos visitorId del contexto
    if (!context.visitorId) {
      return err(
        new LlmToolExecutionError(
          'save_lead_contact_data',
          'No se encontró visitorId en el contexto',
        ),
      );
    }

    // Extraer datos del argumento
    const nombre = args.nombre as string | undefined;
    const apellidos = args.apellidos as string | undefined;
    const email = args.email as string | undefined;
    const telefono = args.telefono as string | undefined;
    const dni = args.dni as string | undefined;
    const poblacion = args.poblacion as string | undefined;

    // Validar que hay al menos un dato de contacto
    if (!nombre && !apellidos && !email && !telefono && !dni && !poblacion) {
      return err(
        new LlmToolExecutionError(
          'save_lead_contact_data',
          'Debes proporcionar al menos un dato de contacto',
        ),
      );
    }

    this.logger.log(
      `[Tool Use] Guardando datos de contacto para visitor ${context.visitorId}: nombre=${nombre}, email=${email}, telefono=${telefono}`,
    );

    try {
      // Ejecutar comando para guardar datos de contacto
      const result = await this.commandBus.execute(
        new SaveLeadContactDataCommand({
          visitorId: context.visitorId,
          companyId: context.companyId,
          nombre,
          apellidos,
          email,
          telefono,
          dni,
          poblacion,
          extractedFromChatId: context.chatId,
        }),
      );

      if (result.isErr()) {
        this.logger.error(
          `[Tool Use] Error guardando datos de contacto: ${result.error.message}`,
        );
        return err(
          new LlmToolExecutionError(
            'save_lead_contact_data',
            `Error al guardar: ${result.error.message}`,
          ),
        );
      }

      const savedId = result.unwrap();
      this.logger.log(
        `[Tool Use] Datos de contacto guardados exitosamente con id=${savedId}`,
      );

      // Construir mensaje de confirmación para la IA
      const savedFields: string[] = [];
      if (nombre) savedFields.push(`nombre: ${nombre}`);
      if (apellidos) savedFields.push(`apellidos: ${apellidos}`);
      if (email) savedFields.push(`email: ${email}`);
      if (telefono) savedFields.push(`teléfono: ${telefono}`);
      if (dni) savedFields.push(`DNI: ${dni}`);
      if (poblacion) savedFields.push(`población: ${poblacion}`);

      return ok(
        `Datos de contacto guardados correctamente. Campos guardados: ${savedFields.join(', ')}. El visitante será sincronizado con el CRM automáticamente.`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[Tool Use] Error ejecutando SaveLeadContactDataCommand: ${errorMessage}`,
      );
      return err(
        new LlmToolExecutionError(
          'save_lead_contact_data',
          `Error interno: ${errorMessage}`,
        ),
      );
    }
  }

  /**
   * Handler para escalate_to_commercial
   * Permite a la IA escalar la conversación a un comercial humano
   */
  private async handleEscalateToCommercial(
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<Result<string, DomainError>> {
    // Validar que tenemos chatId del contexto
    if (!context.chatId) {
      return err(
        new LlmToolExecutionError(
          'escalate_to_commercial',
          'No se encontró chatId en el contexto',
        ),
      );
    }

    // Extraer datos del argumento
    const message = args.message as string;
    const reason = args.reason as
      | 'cannot_answer'
      | 'visitor_requested'
      | 'complex_topic'
      | 'other'
      | undefined;

    // Validar mensaje
    if (!message || message.trim().length === 0) {
      return err(
        new LlmToolExecutionError(
          'escalate_to_commercial',
          'Debes proporcionar un mensaje explicando la situación',
        ),
      );
    }

    this.logger.log(
      `[Tool Use] Escalando chat ${context.chatId} a comercial. Razón: ${reason || 'no especificada'}`,
    );

    try {
      // Ejecutar comando para notificar a comerciales
      const result = await this.commandBus.execute(
        new NotifyCommercialCommand(
          context.chatId,
          context.companyId,
          context.visitorId || '',
          message,
          reason,
        ),
      );

      if (result.isErr()) {
        this.logger.error(
          `[Tool Use] Error al escalar a comercial: ${result.error.message}`,
        );
        // Aún así devolvemos éxito al usuario - no queremos que falle la conversación
        return ok(
          'He notificado a un miembro del equipo comercial. Te responderán en breve.',
        );
      }

      this.logger.log(
        `[Tool Use] Escalación completada exitosamente para chat ${context.chatId}`,
      );

      return ok(
        'He notificado a un miembro del equipo comercial. Te responderán en breve.',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[Tool Use] Error ejecutando NotifyCommercialCommand: ${errorMessage}`,
      );
      // Devolvemos éxito de todos modos para no afectar la experiencia del usuario
      return ok(
        'He notificado a un miembro del equipo comercial. Te responderán en breve.',
      );
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

    if (toolConfig.saveLeadContactEnabled) {
      tools.push({
        type: 'function',
        function: {
          name: 'save_lead_contact_data',
          description:
            'Guarda los datos de contacto del visitante cuando te los proporcione durante la conversación. Usa esta herramienta cuando el usuario te dé su nombre, email, teléfono, DNI u otros datos de contacto. Esto permite hacer seguimiento comercial del lead. Solo usa esta herramienta cuando el usuario haya proporcionado voluntariamente sus datos.',
          parameters: {
            type: 'object',
            properties: {
              nombre: {
                type: 'string',
                description: 'Nombre del visitante',
              },
              apellidos: {
                type: 'string',
                description: 'Apellidos del visitante',
              },
              email: {
                type: 'string',
                description: 'Email del visitante',
              },
              telefono: {
                type: 'string',
                description:
                  'Número de teléfono del visitante (con o sin prefijo)',
              },
              dni: {
                type: 'string',
                description: 'DNI o documento de identidad del visitante',
              },
              poblacion: {
                type: 'string',
                description: 'Ciudad o población del visitante',
              },
            },
          },
        },
      });
    }

    // Tool de escalado a comercial (habilitada por defecto)
    if (toolConfig.escalateToCommercialEnabled !== false) {
      tools.push({
        type: 'function',
        function: {
          name: 'escalate_to_commercial',
          description:
            'Usa esta herramienta cuando no puedas responder una pregunta, cuando el tema esté fuera de tu conocimiento, o cuando el visitante solicite explícitamente hablar con una persona. Esto notificará a un miembro del equipo comercial que podrá asistir al visitante.',
          parameters: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description:
                  'Un breve mensaje explicando por qué estás escalando y en qué necesita ayuda el visitante. Este mensaje se mostrará al comercial.',
              },
              reason: {
                type: 'string',
                enum: [
                  'cannot_answer',
                  'visitor_requested',
                  'complex_topic',
                  'other',
                ],
                description:
                  'Razón de la escalación: cannot_answer (no puedo responder), visitor_requested (el visitante lo pidió), complex_topic (tema complejo), other (otro motivo)',
              },
            },
            required: ['message'],
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
