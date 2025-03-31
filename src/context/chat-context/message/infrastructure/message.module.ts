import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './entities/message.entity';
import { HttpModule } from '@nestjs/axios';
import { MESSAGE_REPOSITORY } from '../domain/message.repository';
import { TypeOrmMessageService } from './typeORM-message.service';
import { MessagePaginateQueryHandler } from '../application/paginate/message-paginate.query-handler';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity]), HttpModule],
  providers: [
    { provide: MESSAGE_REPOSITORY, useClass: TypeOrmMessageService },

    // queries
    MessagePaginateQueryHandler,
  ],
})
export class MessageModule {}
