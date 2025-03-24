import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './entities/message.entity';
import { MESSAGE_REPOSITORY } from '../domain/repository';
import { TypeOrmMessageRepository } from './type-orm-message-repository';
import { NewMessageUseCase } from '../application/usecases/new-message.usecase';
import { NewMessageCommandHandler } from '../application/handlers/new-message.command-handler';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity])],
  controllers: [],
  providers: [
    { provide: MESSAGE_REPOSITORY, useClass: TypeOrmMessageRepository },

    // usecases
    NewMessageUseCase,

    // handlers
    NewMessageCommandHandler,
  ],
})
export class MessageModule {}
