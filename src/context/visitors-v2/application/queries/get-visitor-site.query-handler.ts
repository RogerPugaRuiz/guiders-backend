import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { GetVisitorSiteQuery } from './get-visitor-site.query';
import { GetVisitorSiteResponseDto } from '../dtos/get-visitor-site-response.dto';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../domain/visitor-v2.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';

@QueryHandler(GetVisitorSiteQuery)
export class GetVisitorSiteQueryHandler
  implements IQueryHandler<GetVisitorSiteQuery, GetVisitorSiteResponseDto>
{
  private readonly logger = new Logger(GetVisitorSiteQueryHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async execute(
    query: GetVisitorSiteQuery,
  ): Promise<GetVisitorSiteResponseDto> {
    this.logger.log(`Obteniendo siteId del visitante: ${query.visitorId}`);

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
      visitorId: visitor.getId().getValue(),
      siteId: visitor.getSiteId().getValue(),
      tenantId: visitor.getTenantId().getValue(),
    };
  }
}
