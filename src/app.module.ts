import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { AppService } from './app.service';
import { AuthVisitorModule } from './context/auth/auth-visitor/infrastructure/auth-visitor.module';
import { ApiKeyModule } from './context/auth/api-key/infrastructure/api-key.module';
import { WebsocketModule } from './context/real-time/websocket/infrastructure/websocket.module';
// import { OpenSearchModule } from './context/shared/infrastructure/open-search/open-search.module';
import { AuthUserModule } from './context/auth/auth-user/infrastructure/auth-user.module';
import { ChatModule } from './context/chat/chat/infrastructure/chat.module';
import { HttpModule } from '@nestjs/axios';
import { TokenVerifyService } from './context/shared/infrastructure/token-verify.service';
import { TrackingModule } from './context/tracking/tracking.module';
import { MessageModule } from './context/chat/message/infrastructure/message.module';

@Module({
  imports: [
    // Importar los módulos de los contextos
    AuthVisitorModule,
    AuthUserModule,
    WebsocketModule,
    ApiKeyModule,
    ChatModule,
    MessageModule,
    TrackingModule,
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
      useFactory: (configService: ConfigService) => {
        // Selección dinámica de variables según NODE_ENV
        const nodeEnv = configService.get<string>('NODE_ENV');
        const isTest = nodeEnv === 'test';
        const isProduction = nodeEnv === 'production';
        const synchronize = isTest || isProduction ? false : true;

        console.log(
          `NODE_ENV: ${nodeEnv}, isTest: ${isTest}, isProduction: ${isProduction}, synchronize: ${synchronize}`,
        );
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
          synchronize: synchronize,
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, TokenVerifyService],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);
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
    this.logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    this.logger.log(`ENCRYPTION_KEY: ${ENCRYPTION_KEY}`);
    this.logger.log(`GLOBAL_TOKEN_SECRET: ${GLOBAL_TOKEN_SECRET}`);
    this.logger.log(`DATABASE_HOST: ${DATABASE_HOST}`);
    this.logger.log(`DATABASE_PORT: ${DATABASE_PORT}`);
    this.logger.log(`DATABASE_USERNAME: ${DATABASE_USERNAME}`);
    this.logger.log(`DATABASE_PASSWORD: ${DATABASE_PASSWORD}`);
    this.logger.log(`DATABASE: ${DATABASE}`);

    this.logger.log(`ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY}`);
  }
}
