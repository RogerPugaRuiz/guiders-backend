import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DbChatEntity } from './db-chat.entity';
import { NewChatUseCase } from '../application/usecases/new-chat.usecase';
import { CHAT_REPOSITORY } from '../domain/chat.repository';
import { DbChatService } from './db-chat.service';
import { NewChatCommandHandler } from '../application/handlers/new-chat.command-handler';
import { FindNewChatsUseCase } from '../application/usecases/find-new-chats.usecase';
import { FindNewChatsQueryHandler } from '../application/handlers/find-new-chats.query-handler';
import { CreateChatOnVisitorConnectedEventHandler } from '../application/handlers/create-chat-on-visitor-connected.event-handler';
import { FindChatByVisitorQueryHandler } from '../application/handlers/find-chat-by-visitor.query-handler';

@Module({
  imports: [TypeOrmModule.forFeature([DbChatEntity])],
  controllers: [],
  providers: [
    { provide: CHAT_REPOSITORY, useClass: DbChatService },
    // usecases
    NewChatUseCase,
    FindNewChatsUseCase,

    // handlers
    NewChatCommandHandler,
    CreateChatOnVisitorConnectedEventHandler,
    FindNewChatsQueryHandler,
    FindChatByVisitorQueryHandler,
  ],
  exports: [],
})
export class ChatModule {}
