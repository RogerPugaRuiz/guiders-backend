import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { CrmApiError } from '../../../domain/errors/leads.error';
import {
  LeadcarsConfig,
  LeadcarsCreateLeadRequest,
  LeadcarsCreateLeadResponse,
  LeadcarsAddChatConversationRequest,
  LeadcarsAddConversationResponse,
  LeadcarsAddCommentRequest,
  LeadcarsAddCommentResponse,
  LeadcarsListConcesionariosResponse,
  LeadcarsListSedesResponse,
  LeadcarsListCampanasResponse,
  LEADCARS_API_URLS,
  LEADCARS_RETRY_CONFIG,
  LEADCARS_REQUIRED_HEADERS,
} from './leadcars.types';

@Injectable()
export class LeadcarsApiService {
  private readonly logger = new Logger(LeadcarsApiService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Crea un nuevo lead en LeadCars
   */
  async createLead(
    request: LeadcarsCreateLeadRequest,
    config: LeadcarsConfig,
  ): Promise<Result<LeadcarsCreateLeadResponse, DomainError>> {
    const url = `${this.getBaseUrl(config)}/leads`;

    return this.executeWithRetry<LeadcarsCreateLeadResponse>(
      () => this.post<LeadcarsCreateLeadResponse>(url, request, config),
      'createLead',
    );
  }

  /**
   * Añade una conversación de chat a un lead existente
   */
  async addChatConversation(
    leadId: number,
    request: Omit<LeadcarsAddChatConversationRequest, 'lead_id'>,
    config: LeadcarsConfig,
  ): Promise<Result<LeadcarsAddConversationResponse, DomainError>> {
    const url = `${this.getBaseUrl(config)}/leads/${leadId}/chat_conversation`;
    const payload: LeadcarsAddChatConversationRequest = {
      ...request,
      lead_id: leadId,
    };

    return this.executeWithRetry<LeadcarsAddConversationResponse>(
      () => this.post<LeadcarsAddConversationResponse>(url, payload, config),
      'addChatConversation',
    );
  }

  /**
   * Añade un comentario a un lead existente
   */
  async addComment(
    leadId: number,
    request: Omit<LeadcarsAddCommentRequest, 'lead_id'>,
    config: LeadcarsConfig,
  ): Promise<Result<LeadcarsAddCommentResponse, DomainError>> {
    const url = `${this.getBaseUrl(config)}/leads/${leadId}/comments`;
    const payload: LeadcarsAddCommentRequest = {
      ...request,
      lead_id: leadId,
    };

    return this.executeWithRetry<LeadcarsAddCommentResponse>(
      () => this.post<LeadcarsAddCommentResponse>(url, payload, config),
      'addComment',
    );
  }

  /**
   * Obtiene la lista de concesionarios disponibles
   */
  async listConcesionarios(
    config: LeadcarsConfig,
  ): Promise<Result<LeadcarsListConcesionariosResponse, DomainError>> {
    const url = `${this.getBaseUrl(config)}/concesionarios`;

    return this.executeWithRetry<LeadcarsListConcesionariosResponse>(
      () => this.get<LeadcarsListConcesionariosResponse>(url, config),
      'listConcesionarios',
    );
  }

  /**
   * Obtiene la lista de sedes de un concesionario
   */
  async listSedes(
    concesionarioId: number,
    config: LeadcarsConfig,
  ): Promise<Result<LeadcarsListSedesResponse, DomainError>> {
    const url = `${this.getBaseUrl(config)}/sedes/${concesionarioId}`;

    return this.executeWithRetry<LeadcarsListSedesResponse>(
      () => this.get<LeadcarsListSedesResponse>(url, config),
      'listSedes',
    );
  }

  /**
   * Obtiene la lista de campañas disponibles
   */
  async listCampanas(
    config: LeadcarsConfig,
  ): Promise<Result<LeadcarsListCampanasResponse, DomainError>> {
    const url = `${this.getBaseUrl(config)}/campanas`;

    return this.executeWithRetry<LeadcarsListCampanasResponse>(
      () => this.get<LeadcarsListCampanasResponse>(url, config),
      'listCampanas',
    );
  }

  /**
   * Verifica que la conexión con LeadCars funciona
   */
  async testConnection(
    config: LeadcarsConfig,
  ): Promise<Result<boolean, DomainError>> {
    const result = await this.listConcesionarios(config);

    if (result.isErr()) {
      return err(result.error);
    }

    const response = result.unwrap();
    return ok(response.success === true);
  }

  // ============ Métodos privados ============

  private getBaseUrl(config: LeadcarsConfig): string {
    return config.useSandbox
      ? LEADCARS_API_URLS.sandbox
      : LEADCARS_API_URLS.production;
  }

  private getHeaders(config: LeadcarsConfig): Record<string, string> {
    return {
      ...LEADCARS_REQUIRED_HEADERS,
      'cliente-token': config.clienteToken,
    };
  }

  private async get<T>(
    url: string,
    config: LeadcarsConfig,
  ): Promise<Result<T, DomainError>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        headers: this.getHeaders(config),
        timeout: 30000,
      };

      this.logger.debug(`GET ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<T>(url, axiosConfig),
      );

      return ok(response.data);
    } catch (error) {
      return this.handleAxiosError(error, 'GET', url);
    }
  }

  private async post<T>(
    url: string,
    data: unknown,
    config: LeadcarsConfig,
  ): Promise<Result<T, DomainError>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        headers: this.getHeaders(config),
        timeout: 30000,
      };

      this.logger.debug(`POST ${url}`, { data: this.sanitizeForLog(data) });

      const response = await firstValueFrom(
        this.httpService.post<T>(url, data, axiosConfig),
      );

      return ok(response.data);
    } catch (error) {
      return this.handleAxiosError(error, 'POST', url);
    }
  }

  private handleAxiosError<T>(
    error: unknown,
    method: string,
    url: string,
  ): Result<T, DomainError> {
    if (error instanceof AxiosError) {
      const statusCode = error.response?.status;
      const responseData = error.response?.data;

      this.logger.error(`Error en ${method} ${url}: ${error.message}`, {
        statusCode,
        response: responseData,
      });

      // Extraer mensaje de error de la respuesta de LeadCars
      let errorMessage = error.message;
      if (responseData?.error?.message) {
        errorMessage = responseData.error.message;
      }

      return err(
        new CrmApiError('leadcars', errorMessage, statusCode, responseData),
      );
    }

    this.logger.error(`Error inesperado en ${method} ${url}:`, error);
    return err(
      new CrmApiError(
        'leadcars',
        error instanceof Error ? error.message : 'Error desconocido',
      ),
    );
  }

  private async executeWithRetry<T>(
    operation: () => Promise<Result<T, DomainError>>,
    operationName: string,
  ): Promise<Result<T, DomainError>> {
    let lastError: DomainError | null = null;

    for (
      let attempt = 0;
      attempt < LEADCARS_RETRY_CONFIG.maxRetries;
      attempt++
    ) {
      if (attempt > 0) {
        const delay = this.calculateBackoffDelay(attempt);
        this.logger.warn(
          `Reintento ${attempt}/${LEADCARS_RETRY_CONFIG.maxRetries - 1} para ${operationName} después de ${delay}ms`,
        );
        await this.sleep(delay);
      }

      const result = await operation();

      if (result.isOk()) {
        if (attempt > 0) {
          this.logger.log(
            `Operación ${operationName} exitosa después de ${attempt + 1} intentos`,
          );
        }
        return result;
      }

      lastError = result.error;

      // No reintentar en errores de cliente (4xx excepto 429)
      if (lastError instanceof CrmApiError) {
        const statusCode = lastError.statusCode;
        if (
          statusCode &&
          statusCode >= 400 &&
          statusCode < 500 &&
          statusCode !== 429
        ) {
          this.logger.warn(
            `No se reintentará ${operationName}: error de cliente ${statusCode}`,
          );
          return result;
        }
      }
    }

    this.logger.error(
      `Operación ${operationName} falló después de ${LEADCARS_RETRY_CONFIG.maxRetries} intentos`,
    );

    return err(lastError!);
  }

  private calculateBackoffDelay(attempt: number): number {
    const baseDelay =
      LEADCARS_RETRY_CONFIG.initialDelayMs *
      Math.pow(LEADCARS_RETRY_CONFIG.backoffMultiplier, attempt);

    // Añadir jitter para evitar thundering herd
    const jitter = Math.random() * 1000;

    return Math.min(baseDelay + jitter, LEADCARS_RETRY_CONFIG.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private sanitizeForLog(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data } as Record<string, unknown>;

    // Ocultar campos sensibles
    const sensitiveFields = ['token', 'password', 'secret', 'dni'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***HIDDEN***';
      }
    }

    return sanitized;
  }
}
