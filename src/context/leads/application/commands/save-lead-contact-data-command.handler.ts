import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { SaveLeadContactDataCommand } from './save-lead-contact-data.command';
import {
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../domain/lead-contact-data.repository';
import { LeadContactDataPrimitives } from '../../domain/services/crm-sync.service';
import { LeadContactDataSavedEvent } from '../../domain/events/lead-synced.event';

@CommandHandler(SaveLeadContactDataCommand)
export class SaveLeadContactDataCommandHandler
  implements ICommandHandler<SaveLeadContactDataCommand>
{
  private readonly logger = new Logger(SaveLeadContactDataCommandHandler.name);

  constructor(
    @Inject(LEAD_CONTACT_DATA_REPOSITORY)
    private readonly repository: ILeadContactDataRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: SaveLeadContactDataCommand,
  ): Promise<Result<string, DomainError>> {
    const { input } = command;

    this.logger.log(
      `Guardando datos de contacto para visitor ${input.visitorId}`,
    );

    // Verificar si ya existen datos para este visitor
    const existingResult = await this.repository.findByVisitorId(
      input.visitorId,
      input.companyId,
    );

    if (existingResult.isErr()) {
      return err(existingResult.error);
    }

    const existing = existingResult.unwrap();

    if (existing) {
      // Actualizar datos existentes (merge parcial)
      const updatedData: LeadContactDataPrimitives = {
        ...existing,
        nombre: input.nombre ?? existing.nombre,
        apellidos: input.apellidos ?? existing.apellidos,
        email: input.email ?? existing.email,
        telefono: input.telefono ?? existing.telefono,
        dni: input.dni ?? existing.dni,
        poblacion: input.poblacion ?? existing.poblacion,
        additionalData: {
          ...existing.additionalData,
          ...input.additionalData,
        },
        extractedFromChatId:
          input.extractedFromChatId ?? existing.extractedFromChatId,
        extractedAt: new Date(),
      };

      const updateResult = await this.repository.update(updatedData);
      if (updateResult.isErr()) {
        return err(updateResult.error);
      }

      this.logger.log(
        `Datos de contacto actualizados para visitor ${input.visitorId}`,
      );

      return ok(existing.id);
    }

    // Crear nuevos datos
    const newData = this.buildNewLeadContactData(input);
    const saveResult = await this.repository.save(newData);

    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    this.logger.log(
      `Nuevos datos de contacto creados para visitor ${input.visitorId} con id ${newData.id}`,
    );

    // Publicar evento de datos guardados
    this.eventBus.publish(
      new LeadContactDataSavedEvent({
        visitorId: newData.visitorId,
        companyId: newData.companyId,
        hasEmail: !!newData.email,
        hasTelefono: !!newData.telefono,
        extractedFromChatId: newData.extractedFromChatId,
        savedAt: new Date().toISOString(),
      }),
    );

    return ok(newData.id);
  }

  private buildNewLeadContactData(
    input: SaveLeadContactDataCommand['input'],
  ): LeadContactDataPrimitives {
    const now = new Date();
    return {
      id: uuidv4(),
      visitorId: input.visitorId,
      companyId: input.companyId,
      nombre: input.nombre,
      apellidos: input.apellidos,
      email: input.email,
      telefono: input.telefono,
      dni: input.dni,
      poblacion: input.poblacion,
      additionalData: input.additionalData ?? {},
      extractedFromChatId: input.extractedFromChatId,
      extractedAt: now,
    };
  }
}
