import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { AppService } from './app.service';
import { AuthVisitorModule } from './context/auth-context/auth-visitor/infrastructure/auth-visitor.module';
import { ApiKeyModule } from './context/auth-context/api-key/infrastructure/api-key.module';
import { WebsocketModule } from './context/real-time-context/websocket/infrastructure/websocket.module';
// import { OpenSearchModule } from './context/shared/infrastructure/open-search/open-search.module';
import { AuthUserModule } from './context/auth-context/auth-user/infrastructure/auth-user.module';
import { ChatModule } from './context/chat-context/chat/infrastructure/chat.module';
import { HttpModule } from '@nestjs/axios';
import { TokenVerifyService } from './context/shared/infrastructure/token-verify.service';
import { TrackingModule } from './context/tracking-context/tracking.module';

@Module({
  imports: [
    // Importar los módulos de los contextos
    AuthVisitorModule,
    AuthUserModule,
    WebsocketModule,
    ApiKeyModule,
    ChatModule,
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
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '::',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT!, 10) || 5432,
      username: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE || 'mydb',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Solo para desarrollo
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
