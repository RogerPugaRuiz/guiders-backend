// Handler del comando para actualizar la página actual del visitante
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateVisitorCurrentPageCommand } from './update-visitor-current-page.command';
import { Inject } from '@nestjs/common';
import {
  IVisitorRepository,
  VISITOR_REPOSITORY,
} from 'src/context/visitors/domain/visitor.repository';
import { VisitorCurrentPage } from 'src/context/visitors/domain/value-objects/visitor-current-page';
import { VisitorId } from 'src/context/visitors/domain/value-objects/visitor-id';
import { Result, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

@CommandHandler(UpdateVisitorCurrentPageCommand)
export class UpdateVisitorCurrentPageCommandHandler
  implements ICommandHandler<UpdateVisitorCurrentPageCommand>
{
  constructor(
    @Inject(VISITOR_REPOSITORY)
    private readonly visitorRepository: IVisitorRepository,
  ) {}

  // Ejecuta el comando para actualizar la página actual
  async execute(
    command: UpdateVisitorCurrentPageCommand,
  ): Promise<Result<void, DomainError>> {
    // Buscar el visitante por ID
    const visitorId = VisitorId.create(command.visitorId);
    const visitorResult = await this.visitorRepository.findById(visitorId);
    if (visitorResult.isErr()) {
      return err(visitorResult.error);
    }
    const visitor = visitorResult.value;
    // Actualizar la página actual de forma inmutable
    const updatedVisitor = visitor.updateCurrentPage(
      new VisitorCurrentPage(command.currentPage),
    );
    // Guardar el visitante actualizado
    return this.visitorRepository.save(updatedVisitor);
  }
}
