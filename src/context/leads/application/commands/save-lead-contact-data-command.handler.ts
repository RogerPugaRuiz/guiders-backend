import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { SaveLeadContactDataCommand } from './save-lead-contact-data.command';
import {
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../domain/lead-contact-data.repository';
import { LeadContactDataPrimitives } from '../../domain/services/crm-sync.service';
import { LeadContactDataSavedEvent } from '../../domain/events/lead-synced.event';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from 'src/context/visitors-v2/domain/visitor-v2.repository';
import { VisitorId } from 'src/context/visitors-v2/domain/value-objects/visitor-id';

@CommandHandler(SaveLeadContactDataCommand)
export class SaveLeadContactDataCommandHandler
  implements ICommandHandler<SaveLeadContactDataCommand>
{
  private readonly logger = new Logger(SaveLeadContactDataCommandHandler.name);

  constructor(
    @Inject(LEAD_CONTACT_DATA_REPOSITORY)
    private readonly repository: ILeadContactDataRepository,
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: SaveLeadContactDataCommand,
  ): Promise<Result<string, DomainError>> {
    const { input } = command;

    this.logger.log(
      `Guardando datos de contacto para visitor ${input.visitorId}`,
    );

    // Verificar si ya existen datos para este visitor
    const existsResult = await this.repository.exists(
      input.visitorId,
      input.companyId,
    );

    if (existsResult.isErr()) {
      return err(existsResult.error);
    }

    const exists = existsResult.unwrap();
    const now = new Date();

    if (exists) {
      // Actualizar datos existentes
      const findResult = await this.repository.findByVisitorId(
        input.visitorId,
        input.companyId,
      );

      if (findResult.isErr()) {
        return err(findResult.error);
      }

      const existingData = findResult.unwrap();
      if (!existingData) {
        // No debería pasar, pero por seguridad
        return this.createNewContactData(input, now);
      }

      // Merge datos existentes con nuevos
      const updatedData: LeadContactDataPrimitives = {
        ...existingData,
        nombre: input.nombre || existingData.nombre,
        apellidos: input.apellidos || existingData.apellidos,
        email: input.email || existingData.email,
        telefono: input.telefono || existingData.telefono,
        dni: input.dni || existingData.dni,
        poblacion: input.poblacion || existingData.poblacion,
        additionalData: {
          ...existingData.additionalData,
          ...input.additionalData,
        },
        extractedFromChatId:
          input.extractedFromChatId || existingData.extractedFromChatId,
        updatedAt: now,
      };

      const updateResult = await this.repository.update(updatedData);

      if (updateResult.isErr()) {
        return err(updateResult.error);
      }

      this.logger.log(
        `Datos de contacto actualizados para visitor ${input.visitorId}`,
      );

      // Convertir visitor a LEAD si tiene datos de contacto válidos
      await this.convertVisitorToLeadIfNeeded(
        input.visitorId,
        input.email,
        input.telefono,
      );

      return ok(existingData.id);
    }

    // Crear nuevos datos
    return this.createNewContactData(input, now);
  }

  /**
   * Convierte el visitor a LEAD si tiene email o teléfono.
   * Esto dispara el evento VisitorLifecycleChangedEvent que activará
   * la sincronización con CRM (LeadCars).
   */
  private async convertVisitorToLeadIfNeeded(
    visitorId: string,
    email?: string,
    telefono?: string,
  ): Promise<void> {
    // Solo convertir si hay datos de contacto válidos
    if (!email && !telefono) {
      this.logger.debug(
        `Visitor ${visitorId} sin email ni teléfono. No se convierte a LEAD.`,
      );
      return;
    }

    try {
      const visitorResult = await this.visitorRepository.findById(
        VisitorId.create(visitorId),
      );

      if (visitorResult.isErr()) {
        this.logger.warn(
          `No se pudo obtener visitor ${visitorId} para convertir a LEAD: ${visitorResult.error.message}`,
        );
        return;
      }

      const visitor = visitorResult.unwrap();

      // Solo convertir si no es ya LEAD o CONVERTED
      if (visitor.isLead() || visitor.isConverted()) {
        this.logger.debug(
          `Visitor ${visitorId} ya es LEAD o CONVERTED. No se cambia lifecycle.`,
        );
        return;
      }

      // Convertir a LEAD
      const visitorCtx = this.publisher.mergeObjectContext(visitor);
      visitorCtx.convertToLead();

      const updateResult = await this.visitorRepository.update(visitorCtx);

      if (updateResult.isErr()) {
        this.logger.error(
          `Error actualizando visitor ${visitorId} a LEAD: ${updateResult.error.message}`,
        );
        return;
      }

      // CRÍTICO: commit() publica el evento VisitorLifecycleChangedEvent
      // que dispara SyncLeadOnLifecycleChangedEventHandler
      visitorCtx.commit();

      this.logger.log(
        `Visitor ${visitorId} convertido a LEAD. Se disparará sincronización con CRM.`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error convirtiendo visitor ${visitorId} a LEAD: ${errorMessage}`,
      );
    }
  }

  private async createNewContactData(
    input: SaveLeadContactDataCommand['input'],
    now: Date,
  ): Promise<Result<string, DomainError>> {
    const id = Uuid.random().value;

    const data: LeadContactDataPrimitives = {
      id,
      visitorId: input.visitorId,
      companyId: input.companyId,
      nombre: input.nombre,
      apellidos: input.apellidos,
      email: input.email,
      telefono: input.telefono,
      dni: input.dni,
      poblacion: input.poblacion,
      additionalData: input.additionalData,
      extractedFromChatId: input.extractedFromChatId,
      extractedAt: now,
      updatedAt: now,
    };

    const saveResult = await this.repository.save(data);

    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Publicar evento
    // Nota: Como no usamos un aggregate aquí, publicamos el evento manualmente
    this.publisher
      .mergeObjectContext({
        apply: () => {},
        getUncommittedEvents: () => [
          new LeadContactDataSavedEvent({
            visitorId: input.visitorId,
            companyId: input.companyId,
            hasEmail: !!input.email,
            hasTelefono: !!input.telefono,
            extractedFromChatId: input.extractedFromChatId,
            savedAt: now.toISOString(),
          }),
        ],
        commit: function () {
          // El EventPublisher maneja esto
        },
      } as any)
      .commit();

    this.logger.log(
      `Datos de contacto creados para visitor ${input.visitorId} (id: ${id})`,
    );

    // Convertir visitor a LEAD si tiene datos de contacto válidos
    await this.convertVisitorToLeadIfNeeded(
      input.visitorId,
      input.email,
      input.telefono,
    );

    return ok(id);
  }
}
