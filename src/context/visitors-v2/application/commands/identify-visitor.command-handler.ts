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

@CommandHandler(IdentifyVisitorCommand)
export class IdentifyVisitorCommandHandler
  implements ICommandHandler<IdentifyVisitorCommand, IdentifyVisitorResponseDto>
{
  private readonly logger = new Logger(IdentifyVisitorCommandHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: IdentifyVisitorCommand,
  ): Promise<IdentifyVisitorResponseDto> {
    try {
      this.logger.log(
        `Identificando visitante: fingerprint=${command.fingerprint}, siteId=${command.siteId}`,
      );

      // Crear value objects
      const fingerprint = new VisitorFingerprint(command.fingerprint);
      const siteId = new SiteId(command.siteId);
      const tenantId = new TenantId(command.tenantId);

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
          `Visitante existente encontrado: ${visitor.getId().value}`,
        );

        // Iniciar nueva sesión
        visitor.startNewSession();
      } else {
        // Visitante nuevo - crear con estado anónimo
        isNewVisitor = true;
        this.logger.log('Creando nuevo visitante anónimo');

        visitor = VisitorV2.create({
          id: VisitorId.random(),
          tenantId,
          siteId,
          fingerprint,
          lifecycle: new VisitorLifecycleVO(VisitorLifecycle.ANON),
        });
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
