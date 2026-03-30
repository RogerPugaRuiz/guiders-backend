/**
 * Test de desarrollo para verificar el envío de emails con Ethereal
 * Ejecutar con: npm run test:unit -- --testPathPattern="ethereal-email-sender"
 */

import { EtherealEmailSenderService } from '../ethereal-email-sender.service';

describe('EtherealEmailSenderService', () => {
  let service: EtherealEmailSenderService;

  beforeAll(() => {
    service = new EtherealEmailSenderService();
  });

  it('debería enviar un email y generar URL de preview', async () => {
    // Arrange
    const emailParams = {
      to: 'test@example.com',
      subject: 'Test de Ethereal - Guiders',
      html: `
        <h1>Email de prueba</h1>
        <p>Este es un email de prueba enviado desde los tests de desarrollo.</p>
        <p>Fecha: ${new Date().toISOString()}</p>
        <hr>
        <p><strong>Si ves este email en la URL de preview, el servicio funciona correctamente.</strong></p>
      `,
    };

    // Act & Assert
    // El servicio debería enviar el email sin lanzar excepciones
    // La URL de preview se mostrará en los logs
    await expect(service.sendEmail(emailParams)).resolves.not.toThrow();
  }, 30000); // Timeout de 30 segundos para crear cuenta Ethereal

  it('debería manejar múltiples envíos usando la misma cuenta', async () => {
    // Arrange
    const emails = [
      {
        to: 'usuario1@example.com',
        subject: 'Primer email de prueba',
        html: '<p>Contenido del primer email</p>',
      },
      {
        to: 'usuario2@example.com',
        subject: 'Segundo email de prueba',
        html: '<p>Contenido del segundo email</p>',
      },
    ];

    // Act & Assert
    for (const email of emails) {
      await expect(service.sendEmail(email)).resolves.not.toThrow();
    }
  }, 30000);

  it('debería enviar email con contenido HTML complejo', async () => {
    // Arrange
    const emailParams = {
      to: 'admin@example.com',
      subject: 'Invitación a Guiders',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .button {
              display: inline-block;
              background-color: #4F46E5;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
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
              <p>Haz clic en el siguiente botón para aceptar la invitación:</p>
              <p style="text-align: center;">
                <a href="https://app.guiders.io/accept-invite?token=abc123" class="button">
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

    // Act & Assert
    await expect(service.sendEmail(emailParams)).resolves.not.toThrow();
  }, 30000);
});
