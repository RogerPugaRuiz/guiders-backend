import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  IVisitorRepository,
  VISITOR_REPOSITORY,
} from 'src/context/visitors/domain/visitor.repository';
import { VisitorName } from 'src/context/visitors/domain/value-objects/visitor-name';
import { VisitorId } from 'src/context/visitors/domain/value-objects/visitor-id';
import { Result, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { UpdateVisitorNameCommand } from './update-visitor-name.command';

@CommandHandler(UpdateVisitorNameCommand)
export class UpdateVisitorNameCommandHandler
  implements
    ICommandHandler<UpdateVisitorNameCommand, Result<void, DomainError>>
{
  constructor(
    @Inject(VISITOR_REPOSITORY)
    private readonly visitorRepository: IVisitorRepository,
  ) {}

  // Ejecuta el comando para actualizar el nombre del visitante
  async execute(
    command: UpdateVisitorNameCommand,
  ): Promise<Result<void, DomainError>> {
    // Buscar el visitante por ID
    const visitorId = VisitorId.create(command.visitorId);
    const visitorResult = await this.visitorRepository.findById(visitorId);
    if (visitorResult.isErr()) {
      return err(visitorResult.error);
    }
    const visitor = visitorResult.value;

    // Actualizar el nombre de forma inmutable
    const updatedVisitor = visitor.updateName(VisitorName.create(command.name));

    // Guardar el visitante actualizado
    return this.visitorRepository.save(updatedVisitor);
  }
}
