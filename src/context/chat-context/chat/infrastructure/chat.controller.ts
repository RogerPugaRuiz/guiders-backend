import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { MessagePaginateQuery } from '../../message/application/paginate/message-paginate.query';
import { MessagePaginateQueryResult } from '../../message/application/paginate/message-paginate.query-handler';
import { AuthGuard } from 'src/context/shared/infrastructure/guards/auth.guard';
import {
  RolesGuard,
  RequiredRoles,
} from 'src/context/shared/infrastructure/guards/role.guard';
import { PaginateEndOfStreamError } from '../../message/domain/errors';

@Controller('chat')
export class ChatController {
  constructor(private readonly queryBus: QueryBus) {}
  // get messages by chatId
  @Get(':chatId/messages')
  @RequiredRoles('visitor', 'commercial')
  @UseGuards(AuthGuard, RolesGuard)
  async messagePaginate(
    @Param('chatId') chatId: string,
    @Query('index') index: string,
    @Query('limit') limit: number = 10,
  ): Promise<any> {
    const query = MessagePaginateQuery.create({
      chatId,
      index,
      limit,
    });

    const result = await this.queryBus.execute<
      MessagePaginateQuery,
      MessagePaginateQueryResult
    >(query);

    return result.fold(
      (errors) => {
        // Handle error
        console.error('Error fetching messages:', errors.message);

        if (errors.has(PaginateEndOfStreamError.getName())) {
          throw new HttpException(
            'No more messages available',
            HttpStatus.NO_CONTENT,
          );
        }

        throw new HttpException(
          'Error fetching messages',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      },
      (response) => {
        // Handle success
        console.log('Fetched messages:', response);
        return response;
      },
    );
  }
}
