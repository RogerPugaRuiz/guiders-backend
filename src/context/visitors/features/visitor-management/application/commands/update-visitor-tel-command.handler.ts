import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  IVisitorRepository,
  VISITOR_REPOSITORY,
} from 'src/context/visitors/domain/visitor.repository';
import { VisitorTel } from 'src/context/visitors/domain/value-objects/visitor-tel';
import { VisitorId } from 'src/context/visitors/domain/value-objects/visitor-id';
import { Result, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { UpdateVisitorTelCommand } from './update-visitor-tel.command';

@CommandHandler(UpdateVisitorTelCommand)
export class UpdateVisitorTelCommandHandler
  implements ICommandHandler<UpdateVisitorTelCommand, Result<void, DomainError>>
{
  constructor(
    @Inject(VISITOR_REPOSITORY)
    private readonly visitorRepository: IVisitorRepository,
  ) {}

  // Ejecuta el comando para actualizar el teléfono del visitante
  async execute(
    command: UpdateVisitorTelCommand,
  ): Promise<Result<void, DomainError>> {
    // Buscar el visitante por ID
    const visitorId = VisitorId.create(command.visitorId);
    const visitorResult = await this.visitorRepository.findById(visitorId);
    if (visitorResult.isErr()) {
      return err(visitorResult.error);
    }
    const visitor = visitorResult.value;

    // Actualizar el teléfono de forma inmutable
    const updatedVisitor = visitor.updateTel(VisitorTel.create(command.tel));

    // Guardar el visitante actualizado
    return this.visitorRepository.save(updatedVisitor);
  }
}
