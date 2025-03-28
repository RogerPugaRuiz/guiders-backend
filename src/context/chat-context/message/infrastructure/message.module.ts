import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './entities/message.entity';
import { MESSAGE_REPOSITORY } from '../domain/repository';
import { TypeOrmMessageRepository } from './repositories/type-orm-message-repository';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity]), HttpModule],
  controllers: [],
  providers: [
    { provide: MESSAGE_REPOSITORY, useClass: TypeOrmMessageRepository },

    // services
    TokenVerifyService,
  ],
})
export class MessageModule {}
