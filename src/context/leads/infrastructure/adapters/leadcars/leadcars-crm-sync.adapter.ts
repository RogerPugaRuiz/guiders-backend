import { Injectable, Logger } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  ICrmSyncService,
  CrmType,
  LeadContactDataPrimitives,
  CrmCompanyConfigPrimitives,
  SyncLeadResult,
  ChatSyncData,
} from '../../../domain/services/crm-sync.service';
import {
  CrmConfigInvalidError,
  LeadSyncFailedError,
  ChatSyncFailedError,
} from '../../../domain/errors/leads.error';
import { LeadcarsApiService } from './leadcars-api.service';
import {
  LeadcarsConfig,
  LeadcarsCreateLeadRequest,
  LeadcarsTipoLead,
  LeadcarsChatMessage,
} from './leadcars.types';

@Injectable()
export class LeadcarsCrmSyncAdapter implements ICrmSyncService {
  readonly crmType: CrmType = 'leadcars';

  private readonly logger = new Logger(LeadcarsCrmSyncAdapter.name);

  constructor(private readonly apiService: LeadcarsApiService) {}

  /**
   * Sincroniza un lead con LeadCars
   */
  async syncLead(
    contactData: LeadContactDataPrimitives,
    config: CrmCompanyConfigPrimitives,
  ): Promise<Result<SyncLeadResult, DomainError>> {
    this.logger.log(
      `Sincronizando lead para visitor ${contactData.visitorId} con LeadCars`,
    );

    // Validar configuración
    const validationErrors = this.validateConfig(config);
    if (validationErrors.length > 0) {
      return err(
        new CrmConfigInvalidError('leadcars', validationErrors.join('; ')),
      );
    }

    const leadcarsConfig = this.extractLeadcarsConfig(config);

    // Construir request
    const request = this.buildCreateLeadRequest(contactData, leadcarsConfig);

    // Llamar a LeadCars API
    const result = await this.apiService.createLead(request, leadcarsConfig);

    if (result.isErr()) {
      this.logger.error(
        `Error sincronizando lead ${contactData.visitorId}: ${result.error.message}`,
      );
      return err(
        new LeadSyncFailedError(
          contactData.visitorId,
          'leadcars',
          result.error.message,
        ),
      );
    }

    const response = result.unwrap();

    if (!response.success || !response.data) {
      const errorMsg = response.error?.message || 'Respuesta sin datos';
      this.logger.error(`LeadCars rechazó el lead: ${errorMsg}`);
      return err(
        new LeadSyncFailedError(contactData.visitorId, 'leadcars', errorMsg),
      );
    }

    this.logger.log(
      `Lead sincronizado exitosamente: ${response.data.id} (ref: ${response.data.referencia})`,
    );

    return ok({
      externalLeadId: response.data.id.toString(),
      metadata: {
        referencia: response.data.referencia,
        estado: response.data.estado,
        createdAt: response.data.created_at,
      },
    });
  }

  /**
   * Sincroniza una conversación de chat con un lead en LeadCars
   */
  async syncChat(
    externalLeadId: string,
    chatData: ChatSyncData,
    config: CrmCompanyConfigPrimitives,
  ): Promise<Result<void, DomainError>> {
    this.logger.log(
      `Sincronizando chat ${chatData.chatId} con lead ${externalLeadId} en LeadCars`,
    );

    // Validar configuración
    const validationErrors = this.validateConfig(config);
    if (validationErrors.length > 0) {
      return err(
        new CrmConfigInvalidError('leadcars', validationErrors.join('; ')),
      );
    }

    const leadcarsConfig = this.extractLeadcarsConfig(config);
    const leadId = parseInt(externalLeadId, 10);

    if (isNaN(leadId)) {
      return err(
        new ChatSyncFailedError(
          chatData.chatId,
          'leadcars',
          `ID de lead inválido: ${externalLeadId}`,
        ),
      );
    }

    // Convertir mensajes al formato de LeadCars
    const conversacion = this.convertMessagesToLeadcarsFormat(
      chatData.messages,
    );

    // Llamar a LeadCars API
    const result = await this.apiService.addChatConversation(
      leadId,
      {
        conversacion,
        fecha_inicio: chatData.startedAt.toISOString(),
        fecha_fin: chatData.closedAt?.toISOString(),
        resumen: chatData.summary,
        metadata: {
          chatId: chatData.chatId,
          visitorId: chatData.visitorId,
          companyId: chatData.companyId,
        },
      },
      leadcarsConfig,
    );

    if (result.isErr()) {
      this.logger.error(
        `Error sincronizando chat ${chatData.chatId}: ${result.error.message}`,
      );
      return err(
        new ChatSyncFailedError(
          chatData.chatId,
          'leadcars',
          result.error.message,
        ),
      );
    }

    const response = result.unwrap();

    if (!response.success) {
      const errorMsg = response.error?.message || 'Error desconocido';
      this.logger.error(`LeadCars rechazó la conversación: ${errorMsg}`);
      return err(
        new ChatSyncFailedError(chatData.chatId, 'leadcars', errorMsg),
      );
    }

    this.logger.log(
      `Chat ${chatData.chatId} sincronizado exitosamente con lead ${externalLeadId}`,
    );

    return ok(undefined);
  }

  /**
   * Verifica la conexión con LeadCars
   */
  async testConnection(
    config: CrmCompanyConfigPrimitives,
  ): Promise<Result<boolean, DomainError>> {
    this.logger.log('Probando conexión con LeadCars');

    const validationErrors = this.validateConfig(config);
    if (validationErrors.length > 0) {
      return err(
        new CrmConfigInvalidError('leadcars', validationErrors.join('; ')),
      );
    }

    const leadcarsConfig = this.extractLeadcarsConfig(config);
    return this.apiService.testConnection(leadcarsConfig);
  }

  /**
   * Valida la configuración de LeadCars
   */
  validateConfig(config: CrmCompanyConfigPrimitives): string[] {
    const errors: string[] = [];
    const leadcarsConfig = config.config as Partial<LeadcarsConfig>;

    if (!leadcarsConfig.clienteToken) {
      errors.push('clienteToken es obligatorio');
    }

    if (typeof leadcarsConfig.concesionarioId !== 'number') {
      errors.push('concesionarioId es obligatorio y debe ser un número');
    }

    if (leadcarsConfig.useSandbox === undefined) {
      errors.push('useSandbox es obligatorio');
    }

    if (!leadcarsConfig.tipoLeadDefault) {
      errors.push('tipoLeadDefault es obligatorio');
    } else {
      const validTipos: LeadcarsTipoLead[] = [
        'COMPRA',
        'VENTA',
        'FINANCIACION',
        'TALLER',
        'RECAMBIOS',
        'OTRO',
      ];
      if (
        !validTipos.includes(leadcarsConfig.tipoLeadDefault as LeadcarsTipoLead)
      ) {
        errors.push(
          `tipoLeadDefault debe ser uno de: ${validTipos.join(', ')}`,
        );
      }
    }

    return errors;
  }

  // ============ Métodos privados ============

  private extractLeadcarsConfig(
    config: CrmCompanyConfigPrimitives,
  ): LeadcarsConfig {
    const rawConfig = config.config;

    return {
      clienteToken: rawConfig.clienteToken as string,
      useSandbox: rawConfig.useSandbox as boolean,
      concesionarioId: rawConfig.concesionarioId as number,
      sedeId: rawConfig.sedeId as number | undefined,
      campanaId: rawConfig.campanaId as number | undefined,
      tipoLeadDefault: rawConfig.tipoLeadDefault as string,
    };
  }

  private buildCreateLeadRequest(
    contactData: LeadContactDataPrimitives,
    config: LeadcarsConfig,
  ): LeadcarsCreateLeadRequest {
    const request: LeadcarsCreateLeadRequest = {
      nombre: contactData.nombre || 'Visitante',
      concesionario_id: config.concesionarioId,
      tipo_lead: config.tipoLeadDefault as LeadcarsTipoLead,
      origen_lead: 'CHAT',
    };

    // Campos opcionales
    if (contactData.apellidos) {
      request.apellidos = contactData.apellidos;
    }

    if (contactData.email) {
      request.email = contactData.email;
    }

    if (contactData.telefono) {
      request.telefono = contactData.telefono;
    }

    if (contactData.dni) {
      request.dni = contactData.dni;
    }

    if (contactData.poblacion) {
      request.poblacion = contactData.poblacion;
    }

    if (config.sedeId) {
      request.sede_id = config.sedeId;
    }

    if (config.campanaId) {
      request.campana_id = config.campanaId;
    }

    // Datos adicionales
    if (contactData.additionalData) {
      request.datos_adicionales = {
        ...contactData.additionalData,
        guiders_visitor_id: contactData.visitorId,
        guiders_company_id: contactData.companyId,
      };
    } else {
      request.datos_adicionales = {
        guiders_visitor_id: contactData.visitorId,
        guiders_company_id: contactData.companyId,
      };
    }

    // Añadir observaciones con info de origen
    request.observaciones = `Lead generado automáticamente desde chat de Guiders (visitor: ${contactData.visitorId})`;

    return request;
  }

  private convertMessagesToLeadcarsFormat(
    messages: ChatSyncData['messages'],
  ): LeadcarsChatMessage[] {
    return messages.map((msg) => ({
      emisor: this.mapSenderTypeToLeadcars(msg.senderType),
      mensaje: msg.content,
      fecha: msg.sentAt.toISOString(),
      metadata: msg.metadata,
    }));
  }

  private mapSenderTypeToLeadcars(
    senderType: 'visitor' | 'commercial' | 'bot' | 'system',
  ): 'VISITANTE' | 'COMERCIAL' | 'BOT' {
    switch (senderType) {
      case 'visitor':
        return 'VISITANTE';
      case 'commercial':
        return 'COMERCIAL';
      case 'bot':
      case 'system':
        return 'BOT';
      default:
        return 'VISITANTE';
    }
  }
}
