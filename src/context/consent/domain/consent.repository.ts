import { Result } from '../../shared/domain/result';
import { ConsentPersistenceError } from './errors/consent.error';
import { VisitorConsent } from './visitor-consent.aggregate';
import { VisitorId } from '../../visitors-v2/domain/value-objects/visitor-id';
import { ConsentType } from './value-objects/consent-type';

/**
 * Interfaz del repositorio de consentimientos
 * Define el contrato para la persistencia de consentimientos
 */
export interface ConsentRepository {
  /**
   * Guarda un consentimiento
   */
  save(consent: VisitorConsent): Promise<Result<void, ConsentPersistenceError>>;

  /**
   * Busca consentimientos por visitorId
   */
  findByVisitorId(
    visitorId: VisitorId,
  ): Promise<Result<VisitorConsent[], ConsentPersistenceError>>;

  /**
   * Busca el último consentimiento activo de un tipo específico para un visitante
   */
  findActiveConsentByType(
    visitorId: VisitorId,
    consentType: ConsentType,
  ): Promise<Result<VisitorConsent | null, ConsentPersistenceError>>;

  /**
   * Verifica si un visitante tiene un consentimiento activo de un tipo
   */
  hasActiveConsent(
    visitorId: VisitorId,
    consentType: ConsentType,
  ): Promise<Result<boolean, ConsentPersistenceError>>;

  /**
   * Encuentra todos los consentimientos que han expirado
   * (tienen fecha de expiración pasada y estado 'granted')
   */
  findExpiredConsents(): Promise<
    Result<VisitorConsent[], ConsentPersistenceError>
  >;

  /**
   * Encuentra todos los consentimientos próximos a expirar
   * @param daysBeforeExpiration Número de días antes de la expiración
   * @returns Consentimientos que expirarán en los próximos N días
   */
  findExpiringConsents(
    daysBeforeExpiration: number,
  ): Promise<Result<VisitorConsent[], ConsentPersistenceError>>;
}

/**
 * Token de inyección de dependencias para el repositorio
 */
export const CONSENT_REPOSITORY = Symbol('ConsentRepository');
