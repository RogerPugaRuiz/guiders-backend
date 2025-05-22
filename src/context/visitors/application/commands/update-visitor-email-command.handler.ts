import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  IVisitorRepository,
  VISITOR_REPOSITORY,
} from 'src/context/visitors/domain/visitor.repository';
import { VisitorEmail } from 'src/context/visitors/domain/value-objects/visitor-email';
import { VisitorId } from 'src/context/visitors/domain/value-objects/visitor-id';
import { Result, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { UpdateVisitorEmailCommand } from './update-visitor-email.command';

@CommandHandler(UpdateVisitorEmailCommand)
export class UpdateVisitorEmailCommandHandler
  implements
    ICommandHandler<UpdateVisitorEmailCommand, Result<void, DomainError>>
{
  constructor(
    @Inject(VISITOR_REPOSITORY)
    private readonly visitorRepository: IVisitorRepository,
  ) {}

  // Ejecuta el comando para actualizar el email del visitante
  async execute(
    command: UpdateVisitorEmailCommand,
  ): Promise<Result<void, DomainError>> {
    // Buscar el visitante por ID
    const visitorId = VisitorId.create(command.visitorId);
    const visitorResult = await this.visitorRepository.findById(visitorId);
    if (visitorResult.isErr()) {
      return err(visitorResult.error);
    }
    const visitor = visitorResult.value;

    // Actualizar el email de forma inmutable
    const updatedVisitor = visitor.updateEmail(
      VisitorEmail.create(command.email),
    );

    // Guardar el visitante actualizado
    return this.visitorRepository.save(updatedVisitor);
  }
}
