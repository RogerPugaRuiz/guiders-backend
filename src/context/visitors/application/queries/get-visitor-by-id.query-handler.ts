import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  IVisitorRepository,
  VISITOR_REPOSITORY,
} from 'src/context/visitors/domain/visitor.repository';
import { VisitorId } from 'src/context/visitors/domain/value-objects/visitor-id';
import { GetVisitorByIdQuery } from './get-visitor-by-id.query';
import { VisitorPrimitives } from 'src/context/visitors/domain/visitor.aggregate';

@QueryHandler(GetVisitorByIdQuery)
export class GetVisitorByIdQueryHandler
  implements IQueryHandler<GetVisitorByIdQuery, VisitorPrimitives | null>
{
  constructor(
    @Inject(VISITOR_REPOSITORY)
    private readonly visitorRepository: IVisitorRepository,
  ) {}

  // Ejecuta la query para obtener los datos de un visitante
  async execute(query: GetVisitorByIdQuery): Promise<VisitorPrimitives | null> {
    // Buscar el visitante por ID
    const visitorId = VisitorId.create(query.visitorId);
    const visitorResult = await this.visitorRepository.findById(visitorId);

    // Si no se encuentra, devuelve null
    if (visitorResult.isErr()) {
      return null;
    }

    // Devuelve los datos primitivos del visitante
    return visitorResult.value.toPrimitives();
  }
}
