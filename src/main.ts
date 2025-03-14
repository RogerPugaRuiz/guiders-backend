import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Referer'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  const logger = new Logger('bootstrap');
  logger.log(`Application is running in ${process.env.NODE_ENV} mode`);
  logger.log(`Application is running on ${process.env.PORT ?? 3000} port`);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
