import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { GetVisitorCurrentPageQuery } from './get-visitor-current-page.query';
import { GetVisitorCurrentPageResponseDto } from '../dtos/get-visitor-current-page-response.dto';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../domain/visitor-v2.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';

@QueryHandler(GetVisitorCurrentPageQuery)
export class GetVisitorCurrentPageQueryHandler
  implements
    IQueryHandler<GetVisitorCurrentPageQuery, GetVisitorCurrentPageResponseDto>
{
  private readonly logger = new Logger(GetVisitorCurrentPageQueryHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async execute(
    query: GetVisitorCurrentPageQuery,
  ): Promise<GetVisitorCurrentPageResponseDto> {
    this.logger.log(
      `Obteniendo página actual del visitante: ${query.visitorId}`,
    );

    const visitorId = new VisitorId(query.visitorId);
    const result = await this.visitorRepository.findById(visitorId);

    if (result.isErr()) {
      this.logger.warn(`Visitante no encontrado: ${query.visitorId}`);
      throw new NotFoundException(
        `Visitante no encontrado: ${query.visitorId}`,
      );
    }

    const visitor = result.unwrap();

    return {
      currentUrl: visitor.getCurrentUrl() || null,
      updatedAt: visitor.getUpdatedAt(),
    };
  }
}
