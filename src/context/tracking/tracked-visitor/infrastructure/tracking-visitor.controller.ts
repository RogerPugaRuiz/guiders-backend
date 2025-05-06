import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from 'src/context/shared/infrastructure/guards/auth.guard';
import {
  RequiredRoles,
  RolesGuard,
} from 'src/context/shared/infrastructure/guards/role.guard';
import { PaginatedCursorTrackingVisitorQuery } from '../application/paginate/paginated-cursor-tracking-visitor.query';

@Controller('visitors')
export class TrackingVisitorController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequiredRoles('visitor')
  @UseGuards(AuthGuard, RolesGuard)
  async getVisitors(
    @Query('limit') limit: string = '10',
    @Query('cursor') cursor?: string,
  ) {
    const limitNumber = parseInt(limit, 10);
    return Promise.resolve({
      items: [],
      total: 0,
      nextCursor: null,
      hasMore: false,
    });
    // const query = new PaginatedCursorTrackingVisitorQuery({
    //   limit: limitNumber,
    //   cursor: cursor ? new Date(cursor) : undefined,
    // });
  }
}
