import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatSchemaDefinition } from '../schemas/chat.schema';
import { MessageSchemaDefinition } from '../schemas/message.schema';
import { ChatMapper } from '../mappers/chat.mapper';
import { MessageMapper } from '../mappers/message.mapper';
import { MongoChatRepositoryImpl } from './impl/mongo-chat.repository.impl';
import { MongoMessageRepositoryImpl } from './impl/mongo-message.repository.simple';
import { CHAT_V2_REPOSITORY } from '../../domain/chat.repository';
import { MESSAGE_V2_REPOSITORY } from '../../domain/message.repository';

/**
 * Módulo de persistencia MongoDB para Conversations V2
 * Configura esquemas, repositorios y mappers necesarios para la integración con MongoDB
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Chat', schema: ChatSchemaDefinition },
      { name: 'Message', schema: MessageSchemaDefinition },
    ]),
  ],
  providers: [
    // Mappers
    ChatMapper,
    MessageMapper,

    // Repositorios MongoDB
    {
      provide: CHAT_V2_REPOSITORY,
      useClass: MongoChatRepositoryImpl,
    },
    {
      provide: MESSAGE_V2_REPOSITORY,
      useClass: MongoMessageRepositoryImpl,
    },

    // Implementaciones directas para testing
    MongoChatRepositoryImpl,
    MongoMessageRepositoryImpl,
  ],
  exports: [
    CHAT_V2_REPOSITORY,
    MESSAGE_V2_REPOSITORY,
    ChatMapper,
    MessageMapper,
    MongoChatRepositoryImpl,
    MongoMessageRepositoryImpl,
  ],
})
export class ConversationsV2PersistenceModule {}

/**
 * Módulo de testing para Conversations V2
 * Configuración específica para tests de integración con MongoDB
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Chat', schema: ChatSchemaDefinition },
      { name: 'Message', schema: MessageSchemaDefinition },
    ]),
  ],
  providers: [
    ChatMapper,
    MessageMapper,
    MongoChatRepositoryImpl,
    MongoMessageRepositoryImpl,
  ],
  exports: [
    ChatMapper,
    MessageMapper,
    MongoChatRepositoryImpl,
    MongoMessageRepositoryImpl,
  ],
})
export class ConversationsV2TestingModule {}
