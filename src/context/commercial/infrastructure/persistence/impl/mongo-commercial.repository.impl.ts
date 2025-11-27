import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommercialRepository } from '../../../domain/commercial.repository';
import { Commercial } from '../../../domain/commercial.aggregate';
import { CommercialId } from '../../../domain/value-objects/commercial-id';
import { CommercialConnectionStatus } from '../../../domain/value-objects/commercial-connection-status';
import { Result, ok, err, okVoid } from '../../../../shared/domain/result';
import { DomainError } from '../../../../shared/domain/domain.error';
import { Criteria } from '../../../../shared/domain/criteria';
import { CommercialSchema } from '../schemas/commercial.schema';
import { CommercialMapper } from '../mappers/commercial.mapper';

/**
 * Error específico para problemas de persistencia de comerciales
 */
export class CommercialPersistenceError extends DomainError {
  constructor(message: string) {
    super(`CommercialPersistenceError: ${message}`);
    this.name = 'CommercialPersistenceError';
  }
}

/**
 * Error específico cuando no se encuentra un comercial
 */
export class CommercialNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Comercial con ID '${id}' no encontrado`);
    this.name = 'CommercialNotFoundError';
  }
}

/**
 * Implementación MongoDB del repositorio de Commercial
 * Utiliza Mongoose para interactuar con MongoDB
 */
@Injectable()
export class MongoCommercialRepositoryImpl implements CommercialRepository {
  private readonly logger = new Logger(MongoCommercialRepositoryImpl.name);

  constructor(
    @InjectModel('Commercial')
    private readonly commercialModel: Model<CommercialSchema>,
  ) {}

  /**
   * Guarda un comercial en MongoDB
   */
  async save(commercial: Commercial): Promise<Result<void, DomainError>> {
    try {
      const schema = CommercialMapper.toSchema(commercial);

      // Usar upsert para evitar duplicados
      await this.commercialModel.findOneAndUpdate({ id: schema.id }, schema, {
        upsert: true,
        new: true,
      });

      return okVoid();
    } catch (error) {
      const errorMessage = `Error al guardar comercial: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CommercialPersistenceError(errorMessage));
    }
  }

  /**
   * Busca un comercial por su ID
   */
  async findById(id: CommercialId): Promise<Result<Commercial, DomainError>> {
    try {
      const schema = await this.commercialModel.findOne({
        id: id.value,
      });

      if (!schema) {
        return err(new CommercialNotFoundError(id.value));
      }

      const commercial = CommercialMapper.toDomain(schema);
      return ok(commercial);
    } catch (error) {
      const errorMessage = `Error al buscar comercial por ID: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CommercialPersistenceError(errorMessage));
    }
  }

  /**
   * Busca comerciales por estado de conexión
   */
  async findByConnectionStatus(
    status: CommercialConnectionStatus,
  ): Promise<Result<Commercial[], DomainError>> {
    try {
      const schemas = await this.commercialModel
        .find({
          connectionStatus: status.value,
        })
        .sort({ lastActivity: -1 });

      const commercials = CommercialMapper.toDomainList(schemas);
      return ok(commercials);
    } catch (error) {
      const errorMessage = `Error al buscar comerciales por estado: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CommercialPersistenceError(errorMessage));
    }
  }

  /**
   * Busca todos los comerciales
   */
  async findAll(): Promise<Result<Commercial[], DomainError>> {
    try {
      const schemas = await this.commercialModel
        .find()
        .sort({ lastActivity: -1 });

      const commercials = CommercialMapper.toDomainList(schemas);
      return ok(commercials);
    } catch (error) {
      const errorMessage = `Error al buscar todos los comerciales: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CommercialPersistenceError(errorMessage));
    }
  }

  /**
   * Elimina un comercial por su ID
   */
  async delete(id: CommercialId): Promise<Result<void, DomainError>> {
    try {
      const result = await this.commercialModel.deleteOne({
        id: id.value,
      });

      if (result.deletedCount === 0) {
        return err(new CommercialNotFoundError(id.value));
      }

      return okVoid();
    } catch (error) {
      const errorMessage = `Error al eliminar comercial: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CommercialPersistenceError(errorMessage));
    }
  }

  /**
   * Actualiza un comercial existente
   */
  async update(commercial: Commercial): Promise<Result<void, DomainError>> {
    try {
      const schema = CommercialMapper.toSchema(commercial);

      const result = await this.commercialModel.findOneAndUpdate(
        { id: schema.id },
        schema,
        { new: true },
      );

      if (!result) {
        return err(new CommercialNotFoundError(schema.id || 'unknown'));
      }

      return okVoid();
    } catch (error) {
      const errorMessage = `Error al actualizar comercial: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CommercialPersistenceError(errorMessage));
    }
  }

  /**
   * Busca comerciales usando criterios
   * Implementación básica - puede expandirse según necesidades
   */

  async match(
    __criteria: Criteria<Commercial>,
  ): Promise<Result<Commercial[], DomainError>> {
    try {
      // Para implementación inicial, usamos find básico
      // En el futuro se puede implementar conversión de criterios a queries MongoDB
      const schemas = await this.commercialModel
        .find()
        .sort({ lastActivity: -1 });

      const commercials = CommercialMapper.toDomainList(schemas);
      return ok(commercials);
    } catch (error) {
      const errorMessage = `Error al buscar comerciales con criterios: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CommercialPersistenceError(errorMessage));
    }
  }

  /**
   * Busca un comercial usando criterios específicos
   */

  async findOne(
    __criteria: Criteria<Commercial>,
  ): Promise<Result<Commercial, DomainError>> {
    try {
      // Para implementación inicial, buscamos el primero ordenado por actividad
      const schema = await this.commercialModel
        .findOne()
        .sort({ lastActivity: -1 });

      if (!schema) {
        return err(new CommercialNotFoundError('criterios específicos'));
      }

      const commercial = CommercialMapper.toDomain(schema);
      return ok(commercial);
    } catch (error) {
      const errorMessage = `Error al buscar comercial con criterios: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CommercialPersistenceError(errorMessage));
    }
  }

  /**
   * Busca comerciales activos (no expirados)
   */
  async findActiveCommercials(
    timeoutMinutes = 5,
  ): Promise<Result<Commercial[], DomainError>> {
    try {
      const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

      const schemas = await this.commercialModel
        .find({
          connectionStatus: 'CONNECTED',
          lastActivity: { $gte: timeoutDate },
        })
        .sort({ lastActivity: -1 });

      const commercials = CommercialMapper.toDomainList(schemas);
      return ok(commercials);
    } catch (error) {
      const errorMessage = `Error al buscar comerciales activos: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CommercialPersistenceError(errorMessage));
    }
  }

  /**
   * Busca un comercial por fingerprint y tenant
   * NOTA: Por ahora ignora tenantId ya que Commercial no tiene campo tenant
   * El filtering por tenant se manejará a nivel de aplicación si es necesario
   */
  async findByFingerprintAndTenant(
    fingerprint: string,
    _tenantId: string,
  ): Promise<Result<Commercial | null, DomainError>> {
    try {
      this.logger.debug(
        `Buscando comercial con fingerprint: ${fingerprint}`,
      );

      // Buscar comercial que tenga este fingerprint en su array
      const schema = await this.commercialModel
        .findOne({
          knownFingerprints: fingerprint,
        })
        .exec();

      if (!schema) {
        this.logger.debug(
          `No se encontró comercial con fingerprint: ${fingerprint}`,
        );
        return ok(null);
      }

      const commercial = CommercialMapper.toDomain(schema);
      this.logger.log(
        `✅ Fingerprint ${fingerprint} pertenece a comercial: ${commercial.id.value}`,
      );
      return ok(commercial);
    } catch (error) {
      const errorMessage = `Error al buscar comercial por fingerprint: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CommercialPersistenceError(errorMessage));
    }
  }
}
