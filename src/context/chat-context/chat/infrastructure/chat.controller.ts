import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { MessagePaginateQuery } from '../../message/application/paginate/message-paginate.query';
import { MessagePaginateQueryResult } from '../../message/application/paginate/message-paginate.query-handler';
import {
  AuthenticatedRequest,
  AuthGuard,
} from 'src/context/shared/infrastructure/guards/auth.guard';
import {
  RolesGuard,
  RequiredRoles,
} from 'src/context/shared/infrastructure/guards/role.guard';
import { PaginateEndOfStreamError } from '../../message/domain/errors';
import { GetChatByVisitorIdQuery } from '../application/query/find/visitor/get-chat-by-visitor-id.query';
import { GetChatByVisitorIdQueryResult } from '../application/query/find/visitor/get-chat-by-visitor-id.query-handler';

@Controller('chat')
export class ChatController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('visitor')
  @RequiredRoles('visitor')
  @UseGuards(AuthGuard, RolesGuard)
  async getChat(@Req() req: AuthenticatedRequest): Promise<any> {
    const { id } = req.user;
    const query = new GetChatByVisitorIdQuery(id);
    const result = await this.queryBus.execute<
      GetChatByVisitorIdQuery,
      GetChatByVisitorIdQueryResult
    >(query);
    return result.fold(
      (error) => {
        // Handle error
        console.error('Error fetching chat:', error.message);
        throw new HttpException(
          'Error fetching chat',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      },
      (response) => {
        // Handle success
        return response;
      },
    );
  }

  // get messages by chatId
  @Get(':chatId/messages')
  // @RequiredRoles('visitor')
  // @UseGuards(AuthGuard, RolesGuard)
  async messagePaginate(
    @Param('chatId') chatId: string,
    @Query('index') index: string,
    @Query('limit') limit: number = 10,
  ): Promise<any> {
    return { success: true };
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
