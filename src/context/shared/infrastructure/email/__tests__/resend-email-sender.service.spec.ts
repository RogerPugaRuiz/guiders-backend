/**
 * Test de desarrollo para verificar el envío de emails con Resend
 *
 * REQUISITOS:
 * - RESEND_API_KEY: API key de Resend (https://resend.com/api-keys)
 * - EMAIL_FROM: Email remitente verificado en Resend (ej: no-reply@tudominio.com)
 * - EMAIL_TEST_RECIPIENT: Email donde recibir los tests (opcional, default: delivered@resend.dev)
 *
 * Ejecutar con:
 * RESEND_API_KEY=re_xxx EMAIL_FROM=no-reply@tudominio.com npm run test:unit -- --testPathPattern="resend-email-sender"
 */

import { ConfigService } from '@nestjs/config';
import { ResendEmailSenderService } from '../resend-email-sender.service';

describe('ResendEmailSenderService', () => {
  let service: ResendEmailSenderService;
  let configService: ConfigService;

  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  // Resend tiene un email especial para tests que siempre funciona
  const testRecipient =
    process.env.EMAIL_TEST_RECIPIENT || 'delivered@resend.dev';

  beforeAll(() => {
    // Verificar que las variables de entorno estén configuradas
    if (!apiKey || !emailFrom) {
      console.warn(
        '\n⚠️  Variables de entorno no configuradas. Los tests serán saltados.\n' +
          '   Ejecutar con: RESEND_API_KEY=re_xxx EMAIL_FROM=no-reply@tudominio.com npm run test:unit -- --testPathPattern="resend-email-sender"\n',
      );
    }

    // Mock de ConfigService que lee de process.env
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'RESEND_API_KEY') return apiKey;
        if (key === 'EMAIL_FROM') return emailFrom;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new ResendEmailSenderService(configService);
  });

  const skipIfNoCredentials = () => !apiKey || !emailFrom;

  it('debería enviar un email simple', async () => {
    if (skipIfNoCredentials()) {
      console.log('⏭️  Test saltado: faltan credenciales de Resend');
      return;
    }

    const emailParams = {
      to: testRecipient,
      subject: `Test Resend - ${new Date().toISOString()}`,
      html: `
        <h1>Email de prueba - Resend</h1>
        <p>Este email fue enviado desde los tests de desarrollo.</p>
        <p>Fecha: ${new Date().toISOString()}</p>
      `,
    };

    // No debería lanzar excepciones
    await expect(service.sendEmail(emailParams)).resolves.not.toThrow();
  }, 30000);

  it('debería enviar email con HTML complejo', async () => {
    if (skipIfNoCredentials()) {
      console.log('⏭️  Test saltado: faltan credenciales de Resend');
      return;
    }

    const emailParams = {
      to: testRecipient,
      subject: `Invitación Guiders - ${new Date().toISOString()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background-color: #4F46E5; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background-color: #f9fafb; }
            .button {
              display: inline-block;
              background-color: #4F46E5;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
            }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bienvenido a Guiders</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Has sido invitado a unirte a la plataforma Guiders como comercial.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="https://app.guiders.io/accept-invite?token=test123" class="button">
                  Aceptar Invitación
                </a>
              </p>
              <p>Este enlace expirará en 7 días.</p>
              <p>Saludos,<br>El equipo de Guiders</p>
            </div>
            <div class="footer">
              <p>© 2024 Guiders. Todos los derechos reservados.</p>
              <p>Si no solicitaste esta invitación, puedes ignorar este email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await expect(service.sendEmail(emailParams)).resolves.not.toThrow();
  }, 30000);

  it('debería manejar errores gracefully con API key inválida', async () => {
    // Crear servicio con API key inválida
    const invalidConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'RESEND_API_KEY') return 'invalid_api_key';
        if (key === 'EMAIL_FROM') return 'test@example.com';
        return undefined;
      }),
    } as unknown as ConfigService;

    const invalidService = new ResendEmailSenderService(invalidConfigService);

    // No debería lanzar excepción (maneja errores internamente)
    await expect(
      invalidService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      }),
    ).resolves.not.toThrow();
  }, 10000);
});
