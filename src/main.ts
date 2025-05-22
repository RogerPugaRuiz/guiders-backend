import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Referer'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Guiders Backend')
    .setDescription('Documentación de la API del backend de Guiders')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const logger = new Logger('bootstrap');
  logger.log(`Application is running in ${process.env.NODE_ENV} mode`);
  logger.log(`Application is running on ${process.env.PORT ?? 3000} port`);
  // Se ignora el warning de promesa no gestionada explícitamente, ya que main.ts es el entrypoint y está controlado por Nest

  void app.listen(process.env.PORT ?? 3000);
}
bootstrap();
