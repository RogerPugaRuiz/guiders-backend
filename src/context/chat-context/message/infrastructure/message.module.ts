import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './entities/message.entity';
import { MESSAGE_REPOSITORY } from '../domain/repository';
import { TypeOrmMessageRepository } from './repositories/type-orm-message-repository';
import { NewMessageUseCase } from '../application/usecases/new-message.usecase';
import { NewMessageCommandHandler } from '../application/handlers/new-message.command-handler';
import { GetMessageByChatUseCase } from '../application/usecases/get-message-by-chat.usecase';
import { MessageController } from './controllers/message.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity])],
  controllers: [MessageController],
  providers: [
    { provide: MESSAGE_REPOSITORY, useClass: TypeOrmMessageRepository },

    // usecases
    NewMessageUseCase,
    GetMessageByChatUseCase,

    // handlers
    NewMessageCommandHandler,
  ],
})
export class MessageModule {}
