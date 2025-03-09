import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-origin-domain',
  });

  const logger = new Logger('bootstrap');
  logger.log(`Application is running in ${process.env.NODE_ENV} mode`);
  logger.log(`Application is running on ${process.env.PORT ?? 3000} port`);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
