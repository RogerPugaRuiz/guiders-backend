import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatEntity } from './chat.entity';
import { CHAT_REPOSITORY } from '../domain/chat/chat.repository';
import { TypeOrmChatService } from './typeORM-chat.service';
import { HttpModule } from '@nestjs/axios';
import { MessageEntity } from '../../message/infrastructure/entities/message.entity';
import { MESSAGE_REPOSITORY } from '../../message/domain/message.repository';
import { TypeOrmMessageService } from '../../message/infrastructure/typeORM-message.service';
import { ChatController } from './chat.controller';
import { MessagePaginateQueryHandler } from '../../message/application/paginate/message-paginate.query-handler';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { StartChatCommandHandler } from '../application/create/pending/start-chat.command-handler';
import { ParticipantsEntity } from './participants.entity';
import { ChatService } from './chat.service';
import { FindOneChatByIdQueryHandler } from '../application/find/by-id/find-one-chat-by-id.query-handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatEntity, MessageEntity, ParticipantsEntity]),
    HttpModule,
  ],
  controllers: [ChatController],
  providers: [
    { provide: CHAT_REPOSITORY, useClass: TypeOrmChatService },
    { provide: MESSAGE_REPOSITORY, useClass: TypeOrmMessageService },
    // usecases

    // handlers
    StartChatCommandHandler,

    // queries
    MessagePaginateQueryHandler,
    FindOneChatByIdQueryHandler,

    // events

    // services
    TokenVerifyService,

    ChatService,
  ],
  exports: [],
})
export class ChatModule {}
