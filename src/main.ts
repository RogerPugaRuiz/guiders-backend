import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar el prefijo global para todas las rutas (Nginx maneja el proxy)
  // Excluir docs del prefijo API para que sean accesibles directamente
  app.setGlobalPrefix('api', { exclude: ['/docs', '/docs-json'] });

  // Configuración de CORS más específica para producción
  const corsOptions = {
    origin:
      process.env.NODE_ENV === 'production'
        ? [
            process.env.FRONTEND_URL || 'http://localhost:4001',
            process.env.DOMAIN
              ? `https://${process.env.DOMAIN}`
              : 'http://localhost',
            process.env.DOMAIN
              ? `http://${process.env.DOMAIN}`
              : 'http://localhost',
          ]
        : '*',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Origin',
      'Referer',
      'X-Requested-With',
      'Accept',
      'Cache-Control',
      'X-Real-IP',
      'X-Forwarded-For',
      'X-Forwarded-Proto',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
  };

  app.enableCors(corsOptions);

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Guiders Backend')
    .setDescription('Documentación de la API del backend de Guiders')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Configurar la ruta de Swagger (sin prefijo API porque está excluido)
  SwaggerModule.setup('docs', app, document);

  // Configuración adicional para WebSockets y proxy reverso
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const logger = new Logger('bootstrap');
  logger.log(
    `Application is running in ${process.env.NODE_ENV || 'development'} mode`,
  );
  logger.log(`Global prefix: api (excluded: /docs, /docs-json)`);
  logger.log(`CORS origin: ${JSON.stringify(corsOptions.origin)}`);
  logger.log(`Application is running on port ${process.env.PORT ?? 3000}`);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
// Se invoca bootstrap y se maneja la promesa correctamente para evitar warnings de promesas no gestionadas
bootstrap().catch((err) => {
  // Se registra el error en caso de fallo en el arranque
  console.error('Error during bootstrap:', err);
});
