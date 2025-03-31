import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatEntity } from './chat.entity';
import { CHAT_REPOSITORY } from '../domain/chat/chat.repository';
import { TypeOrmChatService } from './typeORM-chat.service';
import { HttpModule } from '@nestjs/axios';
import { MessageEntity } from '../../message/infrastructure/entities/message.entity';
import { FindCommercialChatsQueryHandler } from '../application/query/find/commercial/find-commercial-chats.query-handler';
import { RegisterChatCommandHandler } from '../application/command/create/register-chat.command-handler';
import { RegisterChatOnVisitorConnection } from '../application/event/chat/register-chat-on-visitor-connection';
import { SaveMessageOnRealTimeMessageSendEvent } from '../application/event/message/save-message-on-real-time-message-send.event';
import { MESSAGE_REPOSITORY } from '../../message/domain/message.repository';
import { TypeOrmMessageService } from '../../message/infrastructure/typeORM-message.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatEntity, MessageEntity]), HttpModule],
  controllers: [],
  providers: [
    { provide: CHAT_REPOSITORY, useClass: TypeOrmChatService },
    { provide: MESSAGE_REPOSITORY, useClass: TypeOrmMessageService },
    // usecases

    // handlers
    FindCommercialChatsQueryHandler,
    RegisterChatCommandHandler,
    RegisterChatOnVisitorConnection,
    // events
    SaveMessageOnRealTimeMessageSendEvent,
  ],
  exports: [],
})
export class ChatModule {}
