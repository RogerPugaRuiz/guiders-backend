import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCurrentVisitorIntentQuery } from './get-current-visitor-intent.query';
import {
  IIntentDetectorRepository,
  INTENT_DETECTOR_REPOSITORY,
} from 'src/context/tracking/features/tracking-events/domain/intent-detector.repository';
import { VisitorId } from 'src/context/tracking/features/tracking-events/domain/value-objects/visitor-id';
import { Inject, Injectable } from '@nestjs/common';

// Handler para obtener la intención actual de un visitante
@QueryHandler(GetCurrentVisitorIntentQuery)
@Injectable()
export class GetCurrentVisitorIntentQueryHandler
  implements IQueryHandler<GetCurrentVisitorIntentQuery>
{
  // Inyectar el repositorio usando el símbolo para compatibilidad con el test y el módulo
  constructor(
    @Inject(INTENT_DETECTOR_REPOSITORY)
    private readonly intentRepository: IIntentDetectorRepository,
  ) {}

  async execute(query: GetCurrentVisitorIntentQuery) {
    const visitorId = VisitorId.create(query.visitorId);
    // Busca la intención más reciente para el visitante
    const result = await this.intentRepository.findOne(visitorId);
    return result;
  }
}
