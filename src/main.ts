import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient, type RedisClientType } from 'redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookies firmadas (p.ej. para CSRF o flags)
  app.use(cookieParser(process.env.COOKIE_SECRET || 'dev-secret'));

  // Normaliza y tipa el valor de SameSite desde variables de entorno para evitar asignaciones inseguras
  type SameSiteOption = true | false | 'lax' | 'strict' | 'none';
  const resolveSameSite = (input?: string): SameSiteOption => {
    if (!input) return 'lax';
    const v = input.toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'lax' || v === 'strict' || v === 'none') return v;
    return 'lax';
  };

  // Sesión para PKCE/state/nonce (usa Redis en prod si está configurado)
  let sessionStore: session.Store | undefined;
  if (process.env.SESSION_STORE === 'redis' && process.env.REDIS_URL) {
    try {
      const redisClient: RedisClientType = createClient({
        url: process.env.REDIS_URL,
      });
      await redisClient.connect();
      const RedisStoreTyped = RedisStore as unknown as new (opts: {
        client: RedisClientType;
        prefix?: string;
        ttl?: number;
        disableTouch?: boolean;
      }) => session.Store;
      sessionStore = new RedisStoreTyped({
        client: redisClient,
        prefix: 'bff:sess:',
        ttl: 15 * 60, // 15 min: suficiente para PKCE/state/nonce
        disableTouch: true, // no refrescar TTL en cada request
      });
    } catch (e) {
      console.warn('Redis no disponible, usando MemoryStore. Motivo:', e);
    }
  }

  app.use(
    session({
      name: 'bff_sess',
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'dev-session',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: resolveSameSite(process.env.SAMESITE), // 'none' si es cross-site
        maxAge: 15 * 60 * 1000,
      },
    }),
  );

  // Configurar el prefijo global para todas las rutas (Nginx maneja el proxy)
  // Excluir docs del prefijo API para que sean accesibles directamente
  // Excluimos docs y jwks; health queda bajo /api/health
  app.setGlobalPrefix('api', { exclude: ['/docs', '/docs-json', '/jwks'] });

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
            'https://console.guiders.es',
            'https://admin.guiders.es',
          ]
        : ['http://localhost:4200', 'http://localhost:4201', '*'],
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
    .addCookieAuth('access_token', {
      type: 'http',
      in: 'cookie',
      scheme: 'bearer',
    })
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
  logger.log(`Global prefix: api (excluded: /docs, /docs-json, /jwks)`);
  logger.log(`CORS origin: ${JSON.stringify(corsOptions.origin)}`);
  logger.log(`Application is running on port ${process.env.PORT ?? 3000}`);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
// Se invoca bootstrap y se maneja la promesa correctamente para evitar warnings de promesas no gestionadas
bootstrap().catch((err) => {
  // Se registra el error en caso de fallo en el arranque
  console.error('Error during bootstrap:', err);
});
