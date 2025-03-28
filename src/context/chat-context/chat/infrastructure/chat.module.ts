import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatEntity } from './chat.entity';
import { CHAT_REPOSITORY } from '../domain/chat.repository';
import { TypeOrmChatService } from './typeORM-chat.service';
import { HttpModule } from '@nestjs/axios';
import { MessageEntity } from '../../message/infrastructure/entities/message.entity';
import { FindCommercialChatsQueryHandler } from '../application/query/find/commercial/find-commercial-chats.query-handler';

@Module({
  imports: [TypeOrmModule.forFeature([ChatEntity, MessageEntity]), HttpModule],
  controllers: [],
  providers: [
    { provide: CHAT_REPOSITORY, useClass: TypeOrmChatService },
    // usecases

    // handlers
    FindCommercialChatsQueryHandler,
  ],
  exports: [],
})
export class ChatModule {}
