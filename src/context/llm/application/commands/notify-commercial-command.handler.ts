/**
 * Command Handler para notificar a comerciales sobre una escalación del LLM
 * Envía notificación via WebSocket si está conectado, o email como fallback
 */

import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotifyCommercialCommand } from './notify-commercial.command';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations-v2/domain/chat.repository';
import {
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  CommercialConnectionDomainService,
} from 'src/context/commercial/domain/commercial-connection.domain-service';
import {
  USER_ACCOUNT_REPOSITORY,
  UserAccountRepository,
} from 'src/context/auth/auth-user/domain/user-account.repository';
import {
  EMAIL_SENDER_SERVICE,
  EmailSenderService,
} from 'src/context/shared/domain/email/email-sender.service';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';
import { ChatId } from 'src/context/conversations-v2/domain/value-objects/chat-id';
import { CommercialId } from 'src/context/commercial/domain/value-objects/commercial-id';
import { CommercialEscalationRequestedEvent } from '../../domain/events/commercial-escalation-requested.event';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { UserAccountCompanyId } from 'src/context/auth/auth-user/domain/value-objects/user-account-company-id';
import { RoleEnum } from 'src/context/auth/auth-user/domain/value-objects/role';

/**
 * Error cuando no hay comerciales disponibles para notificar
 */
export class NoCommercialsAvailableError extends DomainError {
  constructor() {
    super('No hay comerciales disponibles para notificar');
  }
}

/**
 * Error genérico en el proceso de escalación
 */
export class EscalationProcessError extends DomainError {
  constructor(message: string) {
    super(`Error en escalación: ${message}`);
  }
}

/**
 * Datos de una notificación individual
 */
interface NotificationResult {
  commercialId: string;
  method: 'websocket' | 'email';
  success: boolean;
  error?: string;
}

/**
 * Handler que procesa el comando de notificación a comerciales
 * cuando el LLM solicita escalado a humano
 */
@CommandHandler(NotifyCommercialCommand)
export class NotifyCommercialCommandHandler
  implements ICommandHandler<NotifyCommercialCommand>
{
  private readonly logger = new Logger(NotifyCommercialCommandHandler.name);

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userAccountRepository: UserAccountRepository,
    @Inject(EMAIL_SENDER_SERVICE)
    private readonly emailSender: EmailSenderService,
    @Inject('WEBSOCKET_GATEWAY')
    private readonly wsGateway: WebSocketGatewayBasic,
    private readonly publisher: EventPublisher,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: NotifyCommercialCommand,
  ): Promise<Result<void, DomainError>> {
    this.logger.log(
      `Procesando escalación para chat ${command.chatId}: ${command.reason || 'sin razón'}`,
    );

    try {
      // 1. Obtener el chat para verificar comercial asignado
      const chatResult = await this.chatRepository.findById(
        ChatId.create(command.chatId),
      );

      if (chatResult.isErr()) {
        this.logger.warn(`Chat ${command.chatId} no encontrado`);
        // No fallamos, continuamos sin contexto del chat
      }

      // 2. Determinar comerciales a notificar
      const targetCommercialIds = await this.getTargetCommercials(
        chatResult.isOk() ? chatResult.unwrap() : null,
        command.companyId,
      );

      if (targetCommercialIds.length === 0) {
        this.logger.warn(
          `No hay comerciales disponibles para notificar en company ${command.companyId}`,
        );
        // No retornamos error, solo logueamos - el LLM ya informó al visitante
        return ok(undefined);
      }

      // 3. Notificar a cada comercial
      const notificationResults: NotificationResult[] = [];

      for (const commercialId of targetCommercialIds) {
        const result = await this.notifyCommercial(commercialId, command);
        notificationResults.push(result);
      }

      // 4. Emitir evento de dominio para tracking
      this.emitEscalationEvent(
        command,
        targetCommercialIds,
        notificationResults,
      );

      // 5. Log resumen
      const successful = notificationResults.filter((r) => r.success).length;
      this.logger.log(
        `Escalación procesada: ${successful}/${targetCommercialIds.length} comerciales notificados`,
      );

      return ok(undefined);
    } catch (error) {
      this.logger.error(`Error procesando escalación: ${error.message}`, error);
      return err(new EscalationProcessError(error.message));
    }
  }

  /**
   * Determina los comerciales a notificar
   * Si hay comercial asignado al chat, solo ese
   * Si no, todos los comerciales de la empresa (online recibirán WebSocket, offline recibirán email)
   */
  private async getTargetCommercials(
    chat: {
      assignedCommercialId: {
        isPresent(): boolean;
        get(): { getValue(): string };
      };
    } | null,
    companyId: string,
  ): Promise<string[]> {
    // Si hay comercial asignado, solo notificar a ese
    if (chat?.assignedCommercialId?.isPresent()) {
      const assignedId = chat.assignedCommercialId.get().getValue();
      this.logger.log(`Chat tiene comercial asignado: ${assignedId}`);
      return [assignedId];
    }

    // Si no hay comercial asignado, obtener TODOS los comerciales de la empresa
    this.logger.log(
      `Chat sin comercial asignado, obteniendo todos los comerciales de company ${companyId}`,
    );

    try {
      // Obtener todos los usuarios de la empresa
      const companyUsers = await this.userAccountRepository.findByCompanyId(
        UserAccountCompanyId.create(companyId),
      );

      // Filtrar solo los que tienen rol de comercial
      const commercialUsers = companyUsers.filter((user) =>
        user.roles.toPrimitives().includes(RoleEnum.COMMERCIAL),
      );

      this.logger.log(
        `Encontrados ${commercialUsers.length} comerciales en company ${companyId}`,
      );

      return commercialUsers.map((user) => user.id.getValue());
    } catch (error) {
      this.logger.error(
        `Error obteniendo comerciales de la empresa: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Notifica a un comercial individual via WebSocket o Email
   */
  private async notifyCommercial(
    commercialId: string,
    command: NotifyCommercialCommand,
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      commercialId,
      method: 'websocket',
      success: false,
    };

    try {
      // Verificar si el comercial está online
      const isOnline = await this.connectionService.isCommercialOnline(
        CommercialId.create(commercialId),
      );

      if (isOnline) {
        // Enviar via WebSocket
        result.method = 'websocket';
        this.sendWebSocketNotification(commercialId, command);
        result.success = true;
        this.logger.log(
          `Notificación WebSocket enviada a comercial ${commercialId}`,
        );
      } else {
        // Enviar via Email como fallback
        result.method = 'email';
        await this.sendEmailNotification(commercialId, command);
        result.success = true;
        this.logger.log(
          `Notificación Email enviada a comercial ${commercialId}`,
        );
      }
    } catch (error) {
      result.success = false;
      result.error = error.message;
      this.logger.error(
        `Error notificando a comercial ${commercialId}: ${error.message}`,
      );
    }

    return result;
  }

  /**
   * Envía notificación via WebSocket al comercial
   */
  private sendWebSocketNotification(
    commercialId: string,
    command: NotifyCommercialCommand,
  ): void {
    const chatUrl = this.buildChatUrl(command.chatId);

    const payload = {
      chatId: command.chatId,
      visitorId: command.visitorId,
      companyId: command.companyId,
      message: command.message,
      reason: command.reason,
      chatUrl,
      timestamp: new Date().toISOString(),
    };

    // Emitir a la sala del comercial
    this.wsGateway.emitToRoom(
      `commercial:${commercialId}`,
      'chat:escalation-requested',
      payload,
    );
  }

  /**
   * Envía notificación via Email al comercial
   */
  private async sendEmailNotification(
    commercialId: string,
    command: NotifyCommercialCommand,
  ): Promise<void> {
    // Obtener email del comercial desde UserAccount
    const userAccount = await this.userAccountRepository.findById(commercialId);

    if (!userAccount) {
      throw new Error(
        `No se encontró cuenta de usuario para comercial ${commercialId}`,
      );
    }

    const email = userAccount.email.getValue();
    const chatUrl = this.buildChatUrl(command.chatId);

    // Generar HTML del email
    const html = this.generateEmailHtml(command, chatUrl);

    await this.emailSender.sendEmail({
      to: email,
      subject: `🔔 Solicitud de atención - Chat requiere tu ayuda`,
      html,
    });
  }

  /**
   * Construye la URL del chat para el comercial
   */
  private buildChatUrl(chatId: string): string {
    const baseUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl}/chats/${chatId}`;
  }

  /**
   * Genera el HTML del email de escalación
   */
  private generateEmailHtml(
    command: NotifyCommercialCommand,
    chatUrl: string,
  ): string {
    const reasonText = this.getReasonText(command.reason);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background-color: #4F46E5; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔔 Solicitud de Atención</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Un visitante necesita asistencia y el asistente virtual ha solicitado tu ayuda.
      </p>

      <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px; font-weight: 600;">
          Motivo: ${reasonText}
        </p>
        <p style="color: #374151; font-size: 15px; margin: 0; line-height: 1.5;">
          "${command.message}"
        </p>
      </div>

      <a href="${chatUrl}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: 600; margin-top: 16px;">
        Abrir Chat
      </a>
    </div>

    <!-- Footer -->
    <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
        Este email fue enviado automáticamente por el sistema Guiders.
      </p>
    </div>

  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Obtiene el texto legible de la razón
   */
  private getReasonText(
    reason?: 'cannot_answer' | 'visitor_requested' | 'complex_topic' | 'other',
  ): string {
    switch (reason) {
      case 'cannot_answer':
        return 'El asistente no pudo responder la pregunta';
      case 'visitor_requested':
        return 'El visitante solicitó hablar con una persona';
      case 'complex_topic':
        return 'Tema complejo que requiere atención especializada';
      case 'other':
      default:
        return 'Asistencia requerida';
    }
  }

  /**
   * Emite el evento de dominio para tracking y auditoría
   */
  private emitEscalationEvent(
    command: NotifyCommercialCommand,
    notifiedCommercialIds: string[],
    notificationResults: NotificationResult[],
  ): void {
    const event = new CommercialEscalationRequestedEvent({
      escalation: {
        chatId: command.chatId,
        visitorId: command.visitorId,
        companyId: command.companyId,
        message: command.message,
        reason: command.reason,
        requestedAt: new Date(),
        notifiedCommercialIds,
        notificationMethods: notificationResults.map((r) => ({
          commercialId: r.commercialId,
          method: r.method,
          success: r.success,
        })),
      },
    });

    // Usar EventPublisher para emitir el evento
    // Creamos un aggregate temporal solo para emitir el evento
    const tempAggregate = this.publisher.mergeObjectContext({
      apply: () => {},
      getUncommittedEvents: () => [event],
      uncommit: () => {},
    } as any);

    tempAggregate.commit();
  }
}
