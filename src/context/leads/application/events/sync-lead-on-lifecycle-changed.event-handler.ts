/**
 * Event handler que sincroniza leads con CRM cuando el visitor cambia a LEAD
 * Sigue el patrón: <Acción>On<Evento>EventHandler
 */

import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { VisitorLifecycleChangedEvent } from 'src/context/visitors-v2/domain/events/visitor-state-changed.event';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from 'src/context/visitors-v2/domain/visitor-v2.repository';
import { VisitorId } from 'src/context/visitors-v2/domain/value-objects/visitor-id';
import {
  ICrmCompanyConfigRepository,
  CRM_COMPANY_CONFIG_REPOSITORY,
} from '../../domain/crm-company-config.repository';
import {
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../domain/lead-contact-data.repository';
import { SyncLeadToCrmCommand } from '../commands/sync-lead-to-crm.command';

@EventsHandler(VisitorLifecycleChangedEvent)
export class SyncLeadOnLifecycleChangedEventHandler
  implements IEventHandler<VisitorLifecycleChangedEvent>
{
  private readonly logger = new Logger(
    SyncLeadOnLifecycleChangedEventHandler.name,
  );

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    @Inject(CRM_COMPANY_CONFIG_REPOSITORY)
    private readonly configRepository: ICrmCompanyConfigRepository,
    @Inject(LEAD_CONTACT_DATA_REPOSITORY)
    private readonly contactDataRepository: ILeadContactDataRepository,
  ) {}

  async handle(event: VisitorLifecycleChangedEvent): Promise<void> {
    const { id: visitorId, newLifecycle, previousLifecycle } = event.attributes;

    // Solo procesar cuando el lifecycle cambia a LEAD
    if (newLifecycle.toUpperCase() !== 'LEAD') {
      return;
    }

    this.logger.log(
      `Visitor ${visitorId} cambió a LEAD (desde ${previousLifecycle}). Evaluando sincronización con CRM.`,
    );

    try {
      // 1. Obtener datos del visitor para obtener companyId (tenantId)
      const visitorResult = await this.visitorRepository.findById(
        VisitorId.create(visitorId),
      );

      if (visitorResult.isErr()) {
        this.logger.warn(
          `Visitor ${visitorId} no encontrado: ${visitorResult.error.message}`,
        );
        return;
      }

      const visitor = visitorResult.unwrap();
      const visitorPrimitives = visitor.toPrimitives();
      const companyId = visitorPrimitives.tenantId;

      if (!companyId) {
        this.logger.warn(`Visitor ${visitorId} sin tenantId (companyId)`);
        return;
      }

      // 2. Verificar si hay configuración de CRM habilitada para esta empresa
      const configsResult =
        await this.configRepository.findEnabledByCompanyId(companyId);

      if (configsResult.isErr()) {
        this.logger.error(
          `Error obteniendo configuración CRM para empresa ${companyId}: ${configsResult.error.message}`,
        );
        return;
      }

      const configs = configsResult.unwrap();

      if (configs.length === 0) {
        this.logger.debug(
          `No hay CRMs habilitados para empresa ${companyId}. Omitiendo sincronización.`,
        );
        return;
      }

      // Verificar si el evento trigger 'lifecycle_to_lead' está configurado
      const configsWithTrigger = configs.filter((c) =>
        c.triggerEvents.includes('lifecycle_to_lead'),
      );

      if (configsWithTrigger.length === 0) {
        this.logger.debug(
          `No hay CRMs configurados para disparar en lifecycle_to_lead. Omitiendo.`,
        );
        return;
      }

      // 3. Verificar si hay datos de contacto para este visitor
      const contactDataResult =
        await this.contactDataRepository.findByVisitorId(visitorId, companyId);

      if (contactDataResult.isErr()) {
        this.logger.error(
          `Error obteniendo datos de contacto para visitor ${visitorId}: ${contactDataResult.error.message}`,
        );
        return;
      }

      const contactData = contactDataResult.unwrap();

      if (!contactData) {
        this.logger.warn(
          `No hay datos de contacto para visitor ${visitorId}. El lead no se sincronizará.`,
        );
        return;
      }

      // Verificar datos mínimos para sincronización
      if (!contactData.email && !contactData.telefono) {
        this.logger.warn(
          `Visitor ${visitorId} no tiene email ni teléfono. No se sincronizará con CRM.`,
        );
        return;
      }

      // 4. Ejecutar sincronización con CRM
      this.logger.log(
        `Sincronizando visitor ${visitorId} con ${configsWithTrigger.length} CRM(s) configurados`,
      );

      await this.commandBus.execute(
        new SyncLeadToCrmCommand({
          visitorId,
          companyId,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error en sincronización CRM para visitor ${visitorId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      // No relanzamos - el evento ya ocurrió
    }
  }
}
