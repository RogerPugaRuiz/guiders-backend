import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './entities/message.entity';
import { HttpModule } from '@nestjs/axios';
import { MESSAGE_REPOSITORY } from '../domain/message.repository';
import { TypeOrmMessageService } from './typeORM-message.service';
import { MessagePaginateQueryHandler } from '../application/paginate/message-paginate.query-handler';
import { SaveMessageOnChatUpdatedWithNewMessageEventHandler } from '../application/events/save-message-on-chat-updated-with-new-message-event.handler';
import { ChatMessageEncryptionService } from './services/chat-message-encryption.service';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity]), HttpModule],
  providers: [
    { provide: MESSAGE_REPOSITORY, useClass: TypeOrmMessageService },

    // services
    ChatMessageEncryptionService,

    // queries
    MessagePaginateQueryHandler,
    // event handlers
    SaveMessageOnChatUpdatedWithNewMessageEventHandler,
  ],
  exports: [ChatMessageEncryptionService],
})
export class MessageModule {}
