/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GuidersClientWebsocketGateway } from './guiders-client-websocket/guiders-client-websocket.gateway';
import { GuidersControlWebsocketGateway } from './guiders-control-websocket/guiders-control-websocket.gateway';
import { ClientsService } from './shared/service/client.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ApiKeyAuthModule } from './api-key-auth/api-key-auth.module';
import { UserAuthModule } from './user-auth/user-auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyEntity } from './api-key-auth/api-key.entity';
import { EncryptionService } from './shared/service/encryption.service';
import { DeviceFingerprintsEntity } from './device/device-fingerprints.entity';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [
    CqrsModule.forRoot(),
    JwtModule.register({
      global: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '::',
    }),
    ApiKeyAuthModule,
    UserAuthModule,
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
    TypeOrmModule.forFeature([ApiKeyEntity, DeviceFingerprintsEntity]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ClientsService,
    GuidersClientWebsocketGateway,
    GuidersControlWebsocketGateway,
    EncryptionService,
  ],
})
export class AppModule {}
