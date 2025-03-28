import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    // Importar los módulos de los contextos
    AuthVisitorModule,
    AuthUserModule,
    WebsocketModule,
    ApiKeyModule,
    ChatModule,
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
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT!, 10) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'mydb',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Solo para desarrollo
    }),
  ],
  controllers: [AppController],
  providers: [AppService, TokenVerifyService],
})
export class AppModule {}
