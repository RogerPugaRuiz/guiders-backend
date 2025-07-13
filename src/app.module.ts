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
import { WebsocketModule } from './context/real-time/infrastructure/websocket.module';
// import { OpenSearchModule } from './context/shared/infrastructure/open-search/open-search.module';
import { AuthUserModule } from './context/auth/auth-user/infrastructure/auth-user.module';
import { ChatModule } from './context/conversations/chat/infrastructure/chat.module';
import { HttpModule } from '@nestjs/axios';
import { TokenVerifyService } from './context/shared/infrastructure/token-verify.service';
import { TrackingModule } from './context/tracking/tracking.module';
import { MessageModule } from './context/conversations/message/infrastructure/message.module';
import { VisitorsModule } from './context/visitors/infrastructure/visitors.module';
import { CompanyModule } from './context/company/company.module';

@Module({
  imports: [
    // Importar los módulos de los contextos
    AuthVisitorModule,
    AuthUserModule,
    WebsocketModule,
    ApiKeyModule,
    VisitorsModule,
    ChatModule,
    MessageModule,
    TrackingModule,
    CompanyModule,
    // OpenSearchModule,
    CqrsModule.forRoot(),
    HttpModule,
    JwtModule.register({
      global: true,
      secret: process.env.GLOBAL_TOKEN_SECRET,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
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
    return {
      type: 'postgres', // Tipo de base de datos explícito
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
      synchronize: isE2ETest, // Solo sincronizar en tests e2e
      autoLoadEntities: isE2ETest, // Solo cargar entidades automáticamente en tests e2e
    };
  }

  // Método estático para hacer testeable la factory function de Mongoose
  static createMongooseOptions(configService: ConfigService) {
    const nodeEnv = configService.get<string>('NODE_ENV');
    const isTest = nodeEnv === 'test';

    // Configuración de MongoDB
    const mongoUser = isTest
      ? configService.get<string>('TEST_MONGODB_USERNAME', 'admin')
      : configService.get<string>('MONGODB_USERNAME', 'admin');

    const mongoPassword = isTest
      ? configService.get<string>('TEST_MONGODB_PASSWORD', 'password')
      : configService.get<string>('MONGODB_PASSWORD', 'password');

    const mongoHost = configService.get<string>('MONGODB_HOST', 'localhost');
    const mongoPort = configService.get<string>('MONGODB_PORT', '27017');
    const mongoDatabase = isTest
      ? configService.get<string>('TEST_MONGODB_DATABASE', 'guiders-test')
      : configService.get<string>('MONGODB_DATABASE', 'guiders');

    // Construir URI con credenciales si están disponibles
    let mongoUri: string;
    if (mongoUser && mongoPassword) {
      // Codificar la contraseña para manejar caracteres especiales
      const encodedPassword = encodeURIComponent(mongoPassword);
      // Intentar primero con authSource=admin, luego con la base de datos específica
      mongoUri = `mongodb://${mongoUser}:${encodedPassword}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`;
    } else {
      mongoUri = `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`;
    }

    // Log detallado para debugging
    console.log('MongoDB Configuration:');
    console.log(`  User: ${mongoUser}`);
    console.log(`  Password: ${mongoPassword ? '[HIDDEN]' : '[NOT SET]'}`);
    console.log(`  Host: ${mongoHost}`);
    console.log(`  Port: ${mongoPort}`);
    console.log(`  Database: ${mongoDatabase}`);
    console.log(`  URI: ${mongoUri.replace(/:[^:@]+@/, ':***@')}`);

    const mongoOptions: Record<string, unknown> = {
      uri: mongoUri,
      // Eliminamos las opciones obsoletas useNewUrlParser y useUnifiedTopology
      // que causan warnings en versiones modernas de MongoDB driver
    };

    return mongoOptions;
  }

  constructor(private readonly configService: ConfigService) {
    // Configuración de variables de entorno
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

    this.logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
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
      `MONGODB_PASSWORD: ${MONGODB_PASSWORD ? '[HIDDEN]' : '[NOT SET]'}`,
    );
    this.logger.log(`MONGODB_DATABASE: ${MONGODB_DATABASE}`);

    this.logger.log(`ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY}`);
  }
}
