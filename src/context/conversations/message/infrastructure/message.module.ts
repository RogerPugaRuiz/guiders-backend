import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageEntity } from './entities/message.entity';
import {
  MessageMongooseEntity,
  MessageMongooseSchema,
} from './persistence/entity/message-mongoose.mongodb-entity';
import { HttpModule } from '@nestjs/axios';
import { MESSAGE_REPOSITORY } from '../domain/message.repository';
import { MessagePaginateQueryHandler } from '../application/paginate/message-paginate.query-handler';
import { SaveMessageOnChatUpdatedWithNewMessageEventHandler } from '../application/events/save-message-on-chat-updated-with-new-message-event.handler';
import { CHAT_MESSAGE_ENCRYPTOR } from '../../chat/application/services/chat-message-encryptor';
import { ChatMessageEncryptorService } from '../../chat/infrastructure/chat-message-encryptor.service';
import { MongoMessageRepository } from './persistence/impl/mongo-message.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageEntity]),
    MongooseModule.forFeature([
      { name: MessageMongooseEntity.name, schema: MessageMongooseSchema },
    ]),
    HttpModule,
  ],
  providers: [
    { provide: MESSAGE_REPOSITORY, useClass: MongoMessageRepository },
    { provide: CHAT_MESSAGE_ENCRYPTOR, useClass: ChatMessageEncryptorService },

    // queries
    MessagePaginateQueryHandler,
    // event handlers
    SaveMessageOnChatUpdatedWithNewMessageEventHandler,
  ],
  exports: [MESSAGE_REPOSITORY, CHAT_MESSAGE_ENCRYPTOR],
})
export class MessageModule {}
