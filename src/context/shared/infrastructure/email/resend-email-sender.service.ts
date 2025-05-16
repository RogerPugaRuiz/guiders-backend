// Servicio de envío de emails usando Resend API
// Ubicación: src/context/shared/infrastructure/email/resend-email-sender.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  EmailSenderService,
  EMAIL_SENDER_SERVICE,
} from 'src/context/shared/domain/email/email-sender.service';

@Injectable()
export class ResendEmailSenderService implements EmailSenderService {
  private readonly logger = new Logger(ResendEmailSenderService.name);
  private readonly apiKey: string;
  private readonly emailFrom: string;

  constructor(private readonly configService: ConfigService) {
    // Obtiene la API key y el remitente desde variables de entorno
    this.apiKey = this.configService.get<string>('RESEND_API_KEY') || '';
    this.emailFrom = this.configService.get<string>('EMAIL_FROM') || '';
  }

  // Implementación del envío de email usando la API de Resend
  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      // Inicializa el cliente de Resend con la API key
      const resend = new Resend(this.apiKey);
      await resend.emails.send({
        from: this.emailFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      this.logger.log(
        `Email enviado a ${params.to} con asunto "${params.subject}".`,
      );
    } catch (error: any) {
      if (error instanceof Error) {
        this.logger.error(
          `Error al enviar el email a ${params.to}: ${error.message}`,
        );
      }
    }
  }
}

// Proveedor para inyección de dependencias
export const ResendEmailSenderServiceProvider = {
  provide: EMAIL_SENDER_SERVICE,
  useClass: ResendEmailSenderService,
};
