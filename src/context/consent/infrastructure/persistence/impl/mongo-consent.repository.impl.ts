import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsentRepository } from '../../../domain/consent.repository';
import { VisitorConsent } from '../../../domain/visitor-consent.aggregate';
import { VisitorConsentMongoEntity } from '../entity/visitor-consent-mongo.entity';
import { VisitorConsentMapper } from '../mappers/visitor-consent.mapper';
import { Result, ok, err, okVoid } from '../../../../shared/domain/result';
import { ConsentPersistenceError } from '../../../domain/errors/consent.error';
import { VisitorId } from '../../../../visitors-v2/domain/value-objects/visitor-id';
import { ConsentType } from '../../../domain/value-objects/consent-type';

/**
 * Implementación MongoDB del repositorio de consentimientos
 */
@Injectable()
export class MongoConsentRepositoryImpl implements ConsentRepository {
  constructor(
    @InjectModel(VisitorConsentMongoEntity.name)
    private readonly model: Model<VisitorConsentMongoEntity>,
  ) {}

  async save(
    consent: VisitorConsent,
  ): Promise<Result<void, ConsentPersistenceError>> {
    try {
      const persistence = VisitorConsentMapper.toPersistence(consent);

      await this.model.findOneAndUpdate({ id: persistence.id }, persistence, {
        upsert: true,
        new: true,
      });

      return okVoid();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al guardar consentimiento: ${message}`,
      );
      return err(persistenceError);
    }
  }

  async findByVisitorId(
    visitorId: VisitorId,
  ): Promise<Result<VisitorConsent[], ConsentPersistenceError>> {
    try {
      const entities = await this.model
        .find({ visitorId: visitorId.getValue() })
        .sort({ createdAt: -1 })
        .exec();

      const consents = entities.map((entity) =>
        VisitorConsentMapper.toDomain(entity),
      );

      return ok(consents);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al buscar consentimientos: ${message}`,
      );
      return err(persistenceError);
    }
  }

  async findActiveConsentByType(
    visitorId: VisitorId,
    consentType: ConsentType,
  ): Promise<Result<VisitorConsent | null, ConsentPersistenceError>> {
    try {
      const entity = await this.model
        .findOne({
          visitorId: visitorId.getValue(),
          consentType: consentType.value,
          status: 'granted',
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        })
        .sort({ createdAt: -1 })
        .exec();

      if (!entity) {
        return ok(null);
      }

      const consent = VisitorConsentMapper.toDomain(entity);
      return ok(consent);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al buscar consentimiento activo: ${message}`,
      );
      return err(persistenceError);
    }
  }

  async hasActiveConsent(
    visitorId: VisitorId,
    consentType: ConsentType,
  ): Promise<Result<boolean, ConsentPersistenceError>> {
    try {
      const count = await this.model
        .countDocuments({
          visitorId: visitorId.getValue(),
          consentType: consentType.value,
          status: 'granted',
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        })
        .exec();

      return ok(count > 0);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al verificar consentimiento activo: ${message}`,
      );
      return err(persistenceError);
    }
  }

  async findExpiredConsents(): Promise<
    Result<VisitorConsent[], ConsentPersistenceError>
  > {
    try {
      const entities = await this.model
        .find({
          status: 'granted',
          expiresAt: { $lt: new Date(), $ne: null },
        })
        .sort({ expiresAt: 1 })
        .exec();

      const consents = entities.map((entity) =>
        VisitorConsentMapper.toDomain(entity),
      );

      return ok(consents);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al buscar consentimientos expirados: ${message}`,
      );
      return err(persistenceError);
    }
  }

  async findExpiringConsents(
    daysBeforeExpiration: number,
  ): Promise<Result<VisitorConsent[], ConsentPersistenceError>> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysBeforeExpiration);

      const entities = await this.model
        .find({
          status: 'granted',
          expiresAt: {
            $ne: null,
            $gt: now, // No expirados todavía
            $lte: futureDate, // Expiran en los próximos N días
          },
        })
        .sort({ expiresAt: 1 }) // Ordenar por los que expiran primero
        .exec();

      const consents = entities.map((entity) =>
        VisitorConsentMapper.toDomain(entity),
      );

      return ok(consents);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al buscar consentimientos próximos a expirar: ${message}`,
      );
      return err(persistenceError);
    }
  }
}
