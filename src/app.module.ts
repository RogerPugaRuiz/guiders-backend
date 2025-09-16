import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import { AppService } from './app.service';
import { AuthVisitorModule } from './context/auth/auth-visitor/infrastructure/auth-visitor.module';
import { ApiKeyModule } from './context/auth/api-key/infrastructure/api-key.module';
// import { OpenSearchModule } from './context/shared/infrastructure/open-search/open-search.module';
import { AuthUserModule } from './context/auth/auth-user/infrastructure/auth-user.module';
import { BFFModule } from './context/auth/bff/infrastructure/bff.module';
import { HttpModule } from '@nestjs/axios';
import { TokenVerifyService } from './context/shared/infrastructure/token-verify.service';
import { TrackingModule } from './context/tracking/tracking.module';
import { VisitorsModule } from './context/visitors/infrastructure/visitors.module';
import { VisitorsV2Module } from './context/visitors-v2/visitors-v2.module';
import { CompanyModule } from './context/company/company.module';
import { ConversationsV2Module } from './context/conversations-v2/conversations-v2.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    // Importar los módulos de los contextos
    AuthVisitorModule,
    AuthUserModule,
    BFFModule,
    ApiKeyModule,
    VisitorsModule,
    VisitorsV2Module,
    TrackingModule,
    CompanyModule,
    ConversationsV2Module,
    WebSocketModule,
    // OpenSearchModule,
    CqrsModule.forRoot(),
    HttpModule,
    JwtModule.register({
      global: true,
      secret: process.env.GLOBAL_TOKEN_SECRET,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: AppModule.getEnvFilePath(),
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '::',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        AppModule.createTypeOrmOptions(configService),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        AppModule.createMongooseOptions(configService),
    }),
  ],
  controllers: [AppController],
  providers: [AppService, TokenVerifyService],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  // Método estático para determinar el archivo de configuración según el entorno
  static getEnvFilePath(): string {
    const nodeEnv = process.env.NODE_ENV;

    switch (nodeEnv) {
      case 'production':
        return '.env.production';
      case 'staging':
        return '.env.staging';
      case 'test':
        return '.env.test';
      default:
        return '.env';
    }
  }

  // Método estático para hacer testeable la factory function de TypeORM
  static createTypeOrmOptions(
    configService: ConfigService,
  ): TypeOrmModuleOptions {
    // Selección dinámica de variables según NODE_ENV
    const nodeEnv = configService.get<string>('NODE_ENV');
    const isTest = nodeEnv === 'test';

    // Determinar si es un test e2e basado en variables de entorno o ubicación
    // Si estamos ejecutando desde la carpeta test/ es un test e2e, de lo contrario es un test unitario
    const isE2ETest =
      isTest &&
      (process.env.E2E_TEST === 'true' ||
        process.cwd().includes('/test') ||
        new Error().stack?.includes('/test/'));

    // Se retorna un objeto estrictamente tipado para TypeOrmModuleOptions
    // Control puntual mediante TYPEORM_SYNC (no recomendado permanente)
    const allowSync = configService.get<string>('TYPEORM_SYNC') === 'true';
    if (allowSync && !isE2ETest) {
      console.warn(
        `[TypeORM Config] synchronize=TRUE activado por TYPEORM_SYNC (nodeEnv=${nodeEnv}). Usar migraciones para cambios definitivos.`,
      );
    }

    return {
      type: 'postgres',
      host: isTest
        ? configService.get<string>('TEST_DATABASE_HOST', 'localhost')
        : configService.get<string>('DATABASE_HOST', 'localhost'),
      port: isTest
        ? Number(configService.get<string>('TEST_DATABASE_PORT', '5432'))
        : Number(configService.get<string>('DATABASE_PORT', '5432')),
      username: isTest
        ? configService.get<string>('TEST_DATABASE_USERNAME', 'postgres')
        : configService.get<string>('DATABASE_USERNAME', 'postgres'),
      password: isTest
        ? configService.get<string>('TEST_DATABASE_PASSWORD', 'password')
        : configService.get<string>('DATABASE_PASSWORD', 'password'),
      database: isTest
        ? configService.get<string>('TEST_DATABASE', 'mydb')
        : configService.get<string>('DATABASE', 'mydb'),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: allowSync || isE2ETest,
      autoLoadEntities: allowSync || isE2ETest,
    };
  }

  // Método estático para hacer testeable la factory function de Mongoose
  static createMongooseOptions(configService: ConfigService) {
    const logger = new Logger('MongooseConfiguration');
    const nodeEnv = configService.get<string>('NODE_ENV');
    const isTest = nodeEnv === 'test';

    logger.log('=== MONGODB CONFIGURATION DEBUG ===');
    logger.log(`NODE_ENV: ${nodeEnv}`);
    logger.log(`Is Test Environment: ${isTest}`);

    // Configuración de MongoDB siguiendo las mejores prácticas de NestJS
    const mongoUser = isTest
      ? configService.get<string>('TEST_MONGODB_ROOT_USERNAME')
      : configService.get<string>('MONGODB_ROOT_USERNAME');

    const mongoPassword = isTest
      ? configService.get<string>('TEST_MONGODB_ROOT_PASSWORD')
      : configService.get<string>('MONGODB_ROOT_PASSWORD');

    const mongoHost = isTest
      ? configService.get<string>('TEST_MONGODB_HOST', 'localhost')
      : configService.get<string>('MONGODB_HOST', 'localhost');
    const mongoPort = isTest
      ? configService.get<string>('TEST_MONGODB_PORT', '27017')
      : configService.get<string>('MONGODB_PORT', '27017');
    const mongoDatabase = isTest
      ? configService.get<string>('TEST_MONGODB_DATABASE', 'guiders-test')
      : configService.get<string>('MONGODB_DATABASE', 'guiders');

    // Logs detallados de las variables
    logger.log('Raw Environment Variables:');
    logger.log(`  MONGODB_PASSWORD: ${mongoPassword ? '[HIDDEN]' : 'NOT SET'}`);
    logger.log(`  MONGODB_HOST: ${mongoHost || 'NOT SET'}`);
    logger.log(`  MONGODB_PORT: ${mongoPort || 'NOT SET'}`);
    logger.log(`  MONGODB_DATABASE: ${mongoDatabase || 'NOT SET'}`);

    // Construir URI siguiendo el estándar de NestJS
    let uri: string;
    if (mongoUser && mongoPassword) {
      // Codificar credenciales para manejar caracteres especiales
      const encodedUser = encodeURIComponent(mongoUser);
      const encodedPassword = encodeURIComponent(mongoPassword);
      uri = `mongodb://${encodedUser}:${encodedPassword}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`;
    } else {
      logger.warn(
        'MongoDB credentials are not set. Using default connection without authentication.',
      );
      throw new Error(
        'MongoDB credentials are required. Please set MONGODB_USERNAME and MONGODB_PASSWORD in your environment variables.',
      );
    }

    logger.log('Processed MongoDB Configuration:');
    logger.log(`  User: ${mongoUser || 'NOT SET'}`);
    logger.log(`  Password: ${mongoPassword ? mongoPassword : '[NOT SET]'}`);
    logger.log(`  Host: ${mongoHost}`);
    logger.log(`  Port: ${mongoPort}`);
    logger.log(`  Database: ${mongoDatabase}`);

    // Mostrar URI sin contraseña para debugging
    const safeUri = uri.replace(/:([^:@]+)@/, ':[HIDDEN]@');
    logger.log(`  Final URI (safe): ${safeUri}`);

    // Configuración estándar de NestJS Mongoose según la documentación oficial
    const mongooseOptions = {
      uri,
      // Configuraciones estándar recomendadas
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    };

    logger.log('MongoDB Options Object:');
    logger.log(JSON.stringify({ ...mongooseOptions, uri: safeUri }, null, 2));
    logger.log('=== END MONGODB CONFIGURATION DEBUG ===');

    return mongooseOptions;
  }

  constructor(private readonly configService: ConfigService) {
    // Configuración de variables de entorno
    this.logger.log('=== ENVIRONMENT CONFIGURATION DEBUG ===');
    this.logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    this.logger.log(`Config file path: ${AppModule.getEnvFilePath()}`);

    const ENCRYPTION_KEY = this.configService.get<string>('ENCRYPTION_KEY');
    const GLOBAL_TOKEN_SECRET = this.configService.get<string>(
      'GLOBAL_TOKEN_SECRET',
    );
    const DATABASE_HOST = this.configService.get<string>('DATABASE_HOST');
    const DATABASE_PORT = this.configService.get<number>('DATABASE_PORT');
    const DATABASE_USERNAME =
      this.configService.get<string>('DATABASE_USERNAME');
    const DATABASE_PASSWORD =
      this.configService.get<string>('DATABASE_PASSWORD');
    const DATABASE = this.configService.get<string>('DATABASE');
    const MONGODB_HOST = this.configService.get<string>('MONGODB_HOST');
    const MONGODB_PORT = this.configService.get<string>('MONGODB_PORT');
    const MONGODB_USERNAME = this.configService.get<string>('MONGODB_USERNAME');
    const MONGODB_PASSWORD = this.configService.get<string>('MONGODB_PASSWORD');
    const MONGODB_DATABASE = this.configService.get<string>('MONGODB_DATABASE');

    this.logger.log(`ENCRYPTION_KEY: ${ENCRYPTION_KEY}`);
    this.logger.log(`GLOBAL_TOKEN_SECRET: ${GLOBAL_TOKEN_SECRET}`);
    this.logger.log(`DATABASE_HOST: ${DATABASE_HOST}`);
    this.logger.log(`DATABASE_PORT: ${DATABASE_PORT}`);
    this.logger.log(`DATABASE_USERNAME: ${DATABASE_USERNAME}`);
    this.logger.log(`DATABASE_PASSWORD: ${DATABASE_PASSWORD}`);
    this.logger.log(`DATABASE: ${DATABASE}`);
    this.logger.log(`MONGODB_HOST: ${MONGODB_HOST}`);
    this.logger.log(`MONGODB_PORT: ${MONGODB_PORT}`);
    this.logger.log(`MONGODB_USERNAME: ${MONGODB_USERNAME}`);
    this.logger.log(
      `MONGODB_PASSWORD: ${MONGODB_PASSWORD ? MONGODB_PASSWORD : '[NOT SET]'}`,
    );
    this.logger.log(`MONGODB_DATABASE: ${MONGODB_DATABASE}`);

    this.logger.log(`ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY}`);
    this.logger.log('=== END ENVIRONMENT CONFIGURATION DEBUG ===');
  }
}
