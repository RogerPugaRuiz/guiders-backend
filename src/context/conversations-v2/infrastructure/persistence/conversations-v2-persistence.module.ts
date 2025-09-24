import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatSchemaDefinition } from '../schemas/chat.schema';
import { MessageSchemaDefinition } from '../schemas/message.schema';
import { ChatMapper } from '../mappers/chat.mapper';
import { MessageMapper } from '../mappers/message.mapper';
import { MongoChatRepositoryImpl } from './impl/mongo-chat.repository.impl';
import { MongoMessageRepositorySimple } from './impl/mongo-message.repository.simple';
import { MongoAssignmentRulesRepository } from './impl/mongo-assignment-rules.repository.impl';
import { CHAT_V2_REPOSITORY } from '../../domain/chat.repository';
import { MESSAGE_V2_REPOSITORY } from '../../domain/message.repository';
import { ASSIGNMENT_RULES_REPOSITORY } from '../../domain/assignment-rules.repository';
import {
  AssignmentRulesMongoEntity,
  AssignmentRulesMongoEntitySchema,
} from './entity/assignment-rules-mongoose.entity';
import { AssignmentRulesMapper } from './impl/mappers/assignment-rules.mapper';

/**
 * Módulo de persistencia MongoDB para Conversations V2
 * Configura esquemas, repositorios y mappers necesarios para la integración con MongoDB
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Chat', schema: ChatSchemaDefinition },
      { name: 'Message', schema: MessageSchemaDefinition },
      {
        name: AssignmentRulesMongoEntity.name,
        schema: AssignmentRulesMongoEntitySchema,
      },
    ]),
  ],
  providers: [
    // Mappers
    ChatMapper,
    MessageMapper,
    AssignmentRulesMapper,

    // Repositorios MongoDB
    {
      provide: CHAT_V2_REPOSITORY,
      useClass: MongoChatRepositoryImpl,
    },
    {
      provide: MESSAGE_V2_REPOSITORY,
      useClass: MongoMessageRepositorySimple,
    },
    {
      provide: ASSIGNMENT_RULES_REPOSITORY,
      useClass: MongoAssignmentRulesRepository,
    },

    // Implementaciones directas para testing
    MongoChatRepositoryImpl,
    MongoMessageRepositorySimple,
    MongoAssignmentRulesRepository,
  ],
  exports: [
    CHAT_V2_REPOSITORY,
    MESSAGE_V2_REPOSITORY,
    ASSIGNMENT_RULES_REPOSITORY,
    ChatMapper,
    MessageMapper,
    AssignmentRulesMapper,
    MongoChatRepositoryImpl,
    MongoMessageRepositorySimple,
    MongoAssignmentRulesRepository,
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
      {
        name: AssignmentRulesMongoEntity.name,
        schema: AssignmentRulesMongoEntitySchema,
      },
    ]),
  ],
  providers: [
    ChatMapper,
    MessageMapper,
    AssignmentRulesMapper,
    MongoChatRepositoryImpl,
    MongoMessageRepositorySimple,
    MongoAssignmentRulesRepository,
  ],
  exports: [
    ChatMapper,
    MessageMapper,
    AssignmentRulesMapper,
    MongoChatRepositoryImpl,
    MongoMessageRepositorySimple,
    MongoAssignmentRulesRepository,
  ],
})
export class ConversationsV2TestingModule {}
