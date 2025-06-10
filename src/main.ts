import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar el prefijo global para todas las rutas en producción
  // if (process.env.NODE_ENV === 'production') {
  //   app.setGlobalPrefix('api', { exclude: ['/docs', '/docs-json'] });
  // }

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

  // Configurar la ruta de Swagger (no necesitamos añadir 'api' porque ya se aplica con setGlobalPrefix)
  SwaggerModule.setup(
    `${process.env.NODE_ENV === 'production' ? 'api/' : ''}docs`,
    app,
    document,
  );
  // Configurar el logger para mostrar información de arranque

  const logger = new Logger('bootstrap');
  logger.log(`Application is running in ${process.env.NODE_ENV} mode`);
  logger.log(`Application is running on ${process.env.PORT ?? 3000} port`);
  // Se ignora el warning de promesa no gestionada explícitamente, ya que main.ts es el entrypoint y está controlado por Nest

  await app.listen(process.env.PORT ?? 3000);
}
// Se invoca bootstrap y se maneja la promesa correctamente para evitar warnings de promesas no gestionadas
bootstrap().catch((err) => {
  // Se registra el error en caso de fallo en el arranque
  console.error('Error during bootstrap:', err);
});
