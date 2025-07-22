import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateVisitorConnectionTimeCommand } from './update-visitor-connection-time.command';
import { IVisitorRepository } from '../../domain/visitor.repository';
import { VISITOR_REPOSITORY } from '../../domain/visitor.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { VisitorConnectionTime } from '../../domain/value-objects/visitor-connection-time';
import { ok, err, Result } from 'src/context/shared/domain/result';
import { VisitorNotFoundError } from '../../domain/errors/visitor.error';

@CommandHandler(UpdateVisitorConnectionTimeCommand)
export class UpdateVisitorConnectionTimeCommandHandler
  implements ICommandHandler<UpdateVisitorConnectionTimeCommand>
{
  constructor(
    @Inject(VISITOR_REPOSITORY)
    private readonly visitorRepository: IVisitorRepository,
  ) {}

  async execute(
    command: UpdateVisitorConnectionTimeCommand,
  ): Promise<Result<void, VisitorNotFoundError>> {
    // Buscar el visitante por ID
    const visitorId = VisitorId.create(command.visitorId);
    const findResult = await this.visitorRepository.findById(visitorId);

    if (findResult.isErr()) {
      return err(findResult.error);
    }

    const visitor = findResult.value;

    // Crear el nuevo tiempo de conexión
    const connectionTime = new VisitorConnectionTime(command.connectionTime);

    // Actualizar el visitante
    const updatedVisitor = visitor.updateConnectionTime(connectionTime);

    // Guardar los cambios
    const saveResult = await this.visitorRepository.save(updatedVisitor);

    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    return ok(undefined);
  }
}
