import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CommercialSchema,
  CommercialSchemaDefinition,
} from './schemas/commercial.schema';
import { CommercialMapper } from './mappers/commercial.mapper';
import { MongoCommercialRepositoryImpl } from './impl/mongo-commercial.repository.impl';
import { COMMERCIAL_REPOSITORY } from '../../domain/commercial.repository';

/**
 * Módulo de persistencia MongoDB para Commercial
 * Configura esquemas, repositorios y mappers necesarios para la integración con MongoDB
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommercialSchema.name, schema: CommercialSchemaDefinition },
    ]),
  ],
  providers: [
    // Mapper
    CommercialMapper,

    // Repositorio MongoDB
    {
      provide: COMMERCIAL_REPOSITORY,
      useClass: MongoCommercialRepositoryImpl,
    },

    // Implementación directa para testing
    MongoCommercialRepositoryImpl,
  ],
  exports: [
    COMMERCIAL_REPOSITORY,
    CommercialMapper,
    MongoCommercialRepositoryImpl,
  ],
})
export class CommercialPersistenceModule {}

/**
 * Módulo de testing para Commercial
 * Configuración específica para tests de integración con MongoDB
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommercialSchema.name, schema: CommercialSchemaDefinition },
    ]),
  ],
  providers: [CommercialMapper, MongoCommercialRepositoryImpl],
  exports: [CommercialMapper, MongoCommercialRepositoryImpl],
})
export class CommercialPersistenceTestingModule {}
