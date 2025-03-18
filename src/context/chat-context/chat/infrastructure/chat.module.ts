import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DbChatEntity } from './db-chat.entity';
import { CreateChatUseCase } from '../application/usecases/create-chat.usecase';
import { CHAT_REPOSITORY } from '../domain/chat.repository';
import { DbChatService } from './db-chat.service';
import { CreateChatCommandHandler } from '../application/handlers/create-chat.command-handler';
import { FindNewChatsUseCase } from '../application/usecases/find-new-chats.usecase';
import { FindNewChatsQueryHandler } from '../application/handlers/find-new-chats.query-handler';
import { RoomCreatedEventHandler } from '../application/handlers/create-chat.event-handler';

@Module({
  imports: [TypeOrmModule.forFeature([DbChatEntity])],
  controllers: [],
  providers: [
    { provide: CHAT_REPOSITORY, useClass: DbChatService },
    // usecases
    CreateChatUseCase,
    FindNewChatsUseCase,

    // handlers
    CreateChatCommandHandler,
    FindNewChatsQueryHandler,
    RoomCreatedEventHandler,
  ],
  exports: [CreateChatUseCase],
})
export class ChatModule {}
