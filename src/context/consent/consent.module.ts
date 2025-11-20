import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import {
  VisitorConsentMongoEntity,
  VisitorConsentMongoEntitySchema,
} from './infrastructure/persistence/entity/visitor-consent-mongo.entity';
import {
  ConsentAuditLogMongoEntity,
  ConsentAuditLogMongoEntitySchema,
} from './infrastructure/persistence/entity/consent-audit-log-mongo.entity';
import { MongoConsentRepositoryImpl } from './infrastructure/persistence/impl/mongo-consent.repository.impl';
import { MongoConsentAuditLogRepositoryImpl } from './infrastructure/persistence/impl/mongo-consent-audit-log.repository.impl';
import { CONSENT_REPOSITORY } from './domain/consent.repository';
import { CONSENT_AUDIT_LOG_REPOSITORY } from './domain/consent-audit-log.repository';
import { RecordConsentCommandHandler } from './application/commands/record-consent.command-handler';
import { DenyConsentCommandHandler } from './application/commands/deny-consent.command-handler';
import { RevokeConsentCommandHandler } from './application/commands/revoke-consent.command-handler';
import { RenewConsentCommandHandler } from './application/commands/renew-consent.command-handler';
import { GetVisitorConsentHistoryQueryHandler } from './application/queries/get-visitor-consent-history.query-handler';
import { GetVisitorAuditLogsQueryHandler } from './application/queries/get-visitor-audit-logs.query-handler';
import { ConsentController } from './infrastructure/controllers/consent.controller';
import { ConsentExpirationService } from './application/services/consent-expiration.service';
import { CheckExpiringConsentsService } from './application/services/check-expiring-consents.service';
import { LogConsentGrantedEventHandler } from './application/events/log-consent-granted-event.handler';
import { LogConsentDeniedEventHandler } from './application/events/log-consent-denied-event.handler';
import { LogConsentRevokedEventHandler } from './application/events/log-consent-revoked-event.handler';
import { LogConsentExpiredEventHandler } from './application/events/log-consent-expired-event.handler';
import { LogConsentRenewedEventHandler } from './application/events/log-consent-renewed-event.handler';
import { TokenVerifyService } from '../shared/infrastructure/token-verify.service';
import { BffSessionAuthService } from '../shared/infrastructure/services/bff-session-auth.service';
import { VisitorSessionAuthService } from '../shared/infrastructure/services/visitor-session-auth.service';
import { VisitorsV2Module } from '../visitors-v2/visitors-v2.module';

/**
 * Módulo de Consent - Gestión de consentimientos RGPD
 *
 * Proporciona funcionalidad para:
 * - Registrar consentimientos de visitantes (RGPD Art. 7.1)
 * - Revocar consentimientos (RGPD Art. 7.3)
 * - Consultar historial de consentimientos (RGPD Art. 15)
 */
@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
    JwtModule.register({}),
    ConfigModule,
    HttpModule,
    forwardRef(() => VisitorsV2Module), // Importar para acceso a VISITOR_V2_REPOSITORY
    MongooseModule.forFeature([
      {
        name: VisitorConsentMongoEntity.name,
        schema: VisitorConsentMongoEntitySchema,
      },
      {
        name: ConsentAuditLogMongoEntity.name,
        schema: ConsentAuditLogMongoEntitySchema,
      },
    ]),
  ],
  controllers: [ConsentController],
  providers: [
    // Repositories
    {
      provide: CONSENT_REPOSITORY,
      useClass: MongoConsentRepositoryImpl,
    },
    {
      provide: CONSENT_AUDIT_LOG_REPOSITORY,
      useClass: MongoConsentAuditLogRepositoryImpl,
    },

    // Command Handlers
    RecordConsentCommandHandler,
    DenyConsentCommandHandler,
    RevokeConsentCommandHandler,
    RenewConsentCommandHandler,

    // Query Handlers
    GetVisitorConsentHistoryQueryHandler,
    GetVisitorAuditLogsQueryHandler,

    // Event Handlers
    LogConsentGrantedEventHandler,
    LogConsentDeniedEventHandler,
    LogConsentRevokedEventHandler,
    LogConsentExpiredEventHandler,
    LogConsentRenewedEventHandler,

    // Services
    ConsentExpirationService,
    CheckExpiringConsentsService,

    // Servicios necesarios para DualAuthGuard (con soporte completo para autenticación de visitantes)
    TokenVerifyService,
    BffSessionAuthService,
    VisitorSessionAuthService, // Añadido para soportar autenticación con cookie 'sid' de visitante
  ],
  exports: [CONSENT_REPOSITORY, CONSENT_AUDIT_LOG_REPOSITORY],
})
export class ConsentModule {}
