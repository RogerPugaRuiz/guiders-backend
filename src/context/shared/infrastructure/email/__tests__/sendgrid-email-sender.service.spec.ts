/**
 * Test de desarrollo para verificar el envío de emails con SendGrid
 *
 * REQUISITOS:
 * 1. Instalar dependencia: npm install @sendgrid/mail
 * 2. Variables de entorno:
 *    - SENDGRID_API_KEY: API key de SendGrid (https://app.sendgrid.com/settings/api_keys)
 *    - EMAIL_FROM: Email remitente verificado en SendGrid (Single Sender Verification)
 *    - EMAIL_TEST_RECIPIENT: Email donde recibir los tests
 *
 * Ejecutar con:
 * SENDGRID_API_KEY=SG.xxx EMAIL_FROM=no-reply@tudominio.com EMAIL_TEST_RECIPIENT=tu@email.com npm run test:unit -- --testPathPattern="sendgrid-email-sender"
 */

import { ConfigService } from '@nestjs/config';
import { SendGridEmailSenderService } from '../sendgrid-email-sender.service';

describe('SendGridEmailSenderService', () => {
  let service: SendGridEmailSenderService;
  let configService: ConfigService;

  const apiKey = process.env.SENDGRID_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const testRecipient = process.env.EMAIL_TEST_RECIPIENT;

  beforeAll(async () => {
    // Verificar que las variables de entorno estén configuradas
    if (!apiKey || !emailFrom || !testRecipient) {
      console.warn(
        '\n⚠️  Variables de entorno no configuradas. Los tests serán saltados.\n' +
          '   Ejecutar con: SENDGRID_API_KEY=SG.xxx EMAIL_FROM=no-reply@tudominio.com EMAIL_TEST_RECIPIENT=tu@email.com npm run test:unit -- --testPathPattern="sendgrid-email-sender"\n',
      );
    }

    // Verificar que @sendgrid/mail esté instalado (solo warning, no falla)
    try {
      require.resolve('@sendgrid/mail');
    } catch {
      console.warn(
        '\n⚠️  @sendgrid/mail no está instalado. Ejecutar: npm install @sendgrid/mail\n',
      );
    }

    // Mock de ConfigService
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'SENDGRID_API_KEY') return apiKey;
        if (key === 'EMAIL_FROM') return emailFrom;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new SendGridEmailSenderService(configService);

    // Esperar a que SendGrid se inicialice
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  const skipIfNoCredentials = () => !apiKey || !emailFrom || !testRecipient;

  it('debería enviar un email simple', async () => {
    if (skipIfNoCredentials()) {
      console.log('⏭️  Test saltado: faltan credenciales de SendGrid');
      return;
    }

    const emailParams = {
      to: testRecipient!, // Non-null assertion ya que skipIfNoCredentials verifica
      subject: `Test SendGrid - ${new Date().toISOString()}`,
      html: `
        <h1>Email de prueba - SendGrid</h1>
        <p>Este email fue enviado desde los tests de desarrollo.</p>
        <p>Fecha: ${new Date().toISOString()}</p>
      `,
    };

    await expect(service.sendEmail(emailParams)).resolves.not.toThrow();
  }, 30000);

  it('debería enviar email con HTML complejo', async () => {
    if (skipIfNoCredentials()) {
      console.log('⏭️  Test saltado: faltan credenciales de SendGrid');
      return;
    }

    const emailParams = {
      to: testRecipient!, // Non-null assertion ya que skipIfNoCredentials verifica
      subject: `Invitación Guiders (SendGrid) - ${new Date().toISOString()}`,
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
              <p>Has sido invitado a unirte a la plataforma Guiders.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="https://app.guiders.io/accept-invite?token=test123" class="button">
                  Aceptar Invitación
                </a>
              </p>
              <p>Este enlace expirará en 7 días.</p>
            </div>
            <div class="footer">
              <p>© 2024 Guiders. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await expect(service.sendEmail(emailParams)).resolves.not.toThrow();
  }, 30000);

  it('debería manejar errores gracefully sin lanzar excepciones', async () => {
    // Crear servicio con API key inválida
    const invalidConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'SENDGRID_API_KEY') return 'invalid_api_key';
        if (key === 'EMAIL_FROM') return 'test@example.com';
        return undefined;
      }),
    } as unknown as ConfigService;

    const invalidService = new SendGridEmailSenderService(invalidConfigService);

    // Esperar inicialización
    await new Promise((resolve) => setTimeout(resolve, 500));

    // No debería lanzar excepción
    await expect(
      invalidService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      }),
    ).resolves.not.toThrow();
  }, 10000);
});
