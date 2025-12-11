/**
 * Handler para el comando de mejorar texto
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ImproveTextCommand } from './improve-text.command';
import { ImproveTextResponseDto } from '../dtos/improve-text.dto';
import {
  LlmProviderService,
  LLM_PROVIDER_SERVICE,
} from '../../domain/services/llm-provider.service';
import {
  ILlmConfigRepository,
  LLM_CONFIG_REPOSITORY,
} from '../../domain/llm-config.repository';
import { LlmCompanyConfig } from '../../domain/value-objects/llm-company-config';

@CommandHandler(ImproveTextCommand)
export class ImproveTextCommandHandler
  implements ICommandHandler<ImproveTextCommand>
{
  private readonly logger = new Logger(ImproveTextCommandHandler.name);

  constructor(
    @Inject(LLM_PROVIDER_SERVICE)
    private readonly llmProvider: LlmProviderService,
    @Inject(LLM_CONFIG_REPOSITORY)
    private readonly configRepository: ILlmConfigRepository,
  ) {}

  async execute(command: ImproveTextCommand): Promise<ImproveTextResponseDto> {
    const startTime = Date.now();
    this.logger.debug(
      `Mejorando texto para usuario ${command.userId} (${command.text.length} caracteres)`,
    );

    try {
      // 1. Verificar configuración de la empresa
      const config = await this.getConfig(command.companyId);

      // 2. Generar texto mejorado
      const completionResult = await this.llmProvider.generateCompletion({
        systemPrompt: this.buildImproveTextPrompt(config.customSystemPrompt),
        conversationHistory: [
          {
            role: 'user',
            content: command.text,
          },
        ],
        maxTokens: 500,
        temperature: 0.3, // Baja temperatura para respuestas más consistentes
      });

      const processingTimeMs = Date.now() - startTime;

      if (completionResult.isErr()) {
        this.logger.warn(
          `Error al mejorar texto: ${completionResult.error.message}`,
        );
        return {
          improvedText: command.text, // Devolver texto original si hay error
          processingTimeMs,
        };
      }

      const response = completionResult.unwrap();

      this.logger.debug(`Texto mejorado en ${processingTimeMs}ms`);

      return {
        improvedText: response.content,
        processingTimeMs,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error mejorando texto: ${errorMessage}`);

      return {
        improvedText: command.text, // Devolver texto original si hay error
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Obtiene la configuración de la empresa
   */
  private async getConfig(companyId: string): Promise<LlmCompanyConfig> {
    const configResult = await this.configRepository.findByCompanyId(companyId);

    if (configResult.isOk()) {
      return configResult.unwrap();
    }

    // Retornar config por defecto si no existe
    return LlmCompanyConfig.createDefault(companyId);
  }

  /**
   * Construye el prompt específico para mejorar texto
   */
  private buildImproveTextPrompt(customPrompt?: string | null): string {
    const basePrompt =
      customPrompt ||
      `Eres un asistente de redacción profesional especializado en comunicación empresarial.`;

    return `${basePrompt}

Tu tarea es mejorar el siguiente texto para que:
- Sea más profesional y estructurado
- Mantenga un tono humano y natural (no robótico)
- Corrija errores ortográficos y gramaticales
- Preserve el mensaje original y la intención del autor
- Esté en español
- Sea conciso y directo

IMPORTANTE: Solo devuelve el texto mejorado, sin explicaciones, comillas, ni texto adicional.`;
  }
}
