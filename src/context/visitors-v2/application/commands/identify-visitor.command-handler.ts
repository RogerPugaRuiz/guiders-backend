import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { IdentifyVisitorCommand } from './identify-visitor.command';
import { IdentifyVisitorResponseDto } from '../dtos/identify-visitor-response.dto';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../domain/visitor-v2.repository';
import { VisitorV2 } from '../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { TenantId } from '../../domain/value-objects/tenant-id';
import { SiteId } from '../../domain/value-objects/site-id';
import { VisitorFingerprint } from '../../domain/value-objects/visitor-fingerprint';
import {
  VisitorLifecycleVO,
  VisitorLifecycle,
} from '../../domain/value-objects/visitor-lifecycle';
import {
  CompanyRepository,
  COMPANY_REPOSITORY,
} from '../../../company/domain/company.repository';
import {
  ValidateDomainApiKey,
  VALIDATE_DOMAIN_API_KEY,
} from '../../../auth/auth-visitor/application/services/validate-domain-api-key';
import { VisitorAccountApiKey } from '../../../auth/auth-visitor/domain/models/visitor-account-api-key';

@CommandHandler(IdentifyVisitorCommand)
export class IdentifyVisitorCommandHandler
  implements ICommandHandler<IdentifyVisitorCommand, IdentifyVisitorResponseDto>
{
  private readonly logger = new Logger(IdentifyVisitorCommandHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
    @Inject(VALIDATE_DOMAIN_API_KEY)
    private readonly apiKeyValidator: ValidateDomainApiKey,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: IdentifyVisitorCommand,
  ): Promise<IdentifyVisitorResponseDto> {
    try {
      this.logger.log(
        `Identificando visitante: fingerprint=${command.fingerprint}, domain=${command.domain}`,
      );

      // Validar API Key
      const apiKeyValid = await this.apiKeyValidator.validate({
        apiKey: new VisitorAccountApiKey(command.apiKey),
        domain: command.domain,
      });

      if (!apiKeyValid) {
        throw new Error('API Key inválida para el dominio proporcionado');
      }

      // Resolver dominio a tenantId y siteId
      const companyResult = await this.companyRepository.findByDomain(
        command.domain,
      );

      if (companyResult.isErr()) {
        throw new Error(
          `No se encontró una empresa para el dominio: ${command.domain}`,
        );
      }

      const company = companyResult.value;
      const sites = company.getSites();
      const sitePrimitives = sites.toPrimitives();

      this.logger.log(`🏢 Empresa encontrada: ${company.getId().getValue()}`);
      this.logger.log(`🌐 Sitios disponibles: ${sitePrimitives.length}`);
      sitePrimitives.forEach((site, index) => {
        this.logger.log(
          `   ${index + 1}. ID: ${site.id}, domain: ${site.canonicalDomain}, aliases: ${JSON.stringify(site.domainAliases)}`,
        );
      });

      const targetSite = sitePrimitives.find(
        (site) =>
          site.canonicalDomain === command.domain ||
          site.domainAliases.includes(command.domain),
      );

      if (!targetSite) {
        throw new Error(
          `No se encontró un sitio específico para el dominio: ${command.domain}`,
        );
      }

      this.logger.log(
        `🎯 Sitio seleccionado: ID=${targetSite.id}, domain=${targetSite.canonicalDomain}`,
      );

      // Crear value objects
      const fingerprint = new VisitorFingerprint(command.fingerprint);
      const siteId = new SiteId(targetSite.id);
      const tenantId = new TenantId(company.getId().getValue());

      this.logger.log(
        `Buscando visitante existente: fingerprint=${fingerprint.value}, siteId=${siteId.value}`,
      );

      // Buscar visitante existente por fingerprint y siteId
      const existingVisitorResult =
        await this.visitorRepository.findByFingerprintAndSite(
          fingerprint,
          siteId,
        );

      let visitor: VisitorV2;
      let isNewVisitor = false;

      if (existingVisitorResult.isOk()) {
        // Visitante existente - actualizar con nueva sesión
        visitor = existingVisitorResult.value;
        this.logger.log(
          `✅ Visitante existente encontrado: ${visitor.getId().value}`,
        );

        // Iniciar nueva sesión
        visitor.startNewSession();
      } else {
        // Visitante nuevo - crear con estado anónimo
        isNewVisitor = true;
        this.logger.log(
          `❌ Visitante NO encontrado. Razón: ${existingVisitorResult.error.message}`,
        );
        this.logger.log('🆕 Creando nuevo visitante anónimo');

        visitor = VisitorV2.create({
          id: VisitorId.random(),
          tenantId,
          siteId,
          fingerprint,
          lifecycle: new VisitorLifecycleVO(VisitorLifecycle.ANON),
        });

        this.logger.log(`🆕 Nuevo visitante creado: ${visitor.getId().value}`);
      }

      // Persistir cambios con eventos
      const visitorContext = this.publisher.mergeObjectContext(visitor);
      const saveResult = await this.visitorRepository.save(visitorContext);

      if (saveResult.isErr()) {
        this.logger.error(
          'Error al guardar visitante:',
          saveResult.error.message,
        );
        throw new Error('Error al guardar visitante');
      }

      // Commit eventos
      visitorContext.commit();

      // Obtener sesión activa
      const activeSessions = visitor.getActiveSessions();
      const currentSession = activeSessions[activeSessions.length - 1]; // La más reciente

      this.logger.log(
        `Visitante identificado exitosamente: ${visitor.getId().value}, sesión: ${currentSession.getId().value}`,
      );

      return new IdentifyVisitorResponseDto({
        visitorId: visitor.getId().value,
        sessionId: currentSession.getId().value,
        lifecycle: visitor.getLifecycle().getValue(),
        isNewVisitor,
      });
    } catch (error) {
      this.logger.error('Error al identificar visitante:', error);
      throw error;
    }
  }
}
