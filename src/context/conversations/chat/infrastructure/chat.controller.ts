import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
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
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly chatService: ChatService,
  ) {}

  @Get('visitor')
  @RequiredRoles('visitor')
  @UseGuards(AuthGuard, RolesGuard)
  async getChat(@Req() req: AuthenticatedRequest): Promise<any> {
    const { id } = req.user;
    return Promise.resolve({});
  }

  @Post(':chatId')
  @RequiredRoles('visitor')
  @UseGuards(AuthGuard, RolesGuard)
  async startChat(
    @Param('chatId') chatId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<any> {
    const { id: visitorId, username: visitorName } = req.user;
    return await this.chatService.startChat(chatId, visitorId, visitorName);
  }

  // get messages by chatId
  @Get(':chatId/messages')
  @RequiredRoles('visitor', 'commercial')
  @UseGuards(AuthGuard, RolesGuard)
  async messagePaginate(
    @Param('chatId') chatId: string,
    @Query('limit') limit: string = '10',
    @Query('cursor') cursor?: string,
  ): Promise<any> {
    // Convertir limit a number de forma segura
    const parsedLimit = Number(limit) || 10;
    const query = MessagePaginateQuery.create({
      chatId,
      cursor,
      limit: parsedLimit,
    });

    const result = await this.queryBus.execute<
      MessagePaginateQuery,
      MessagePaginateQueryResult
    >(query);

    return result.fold(
      (error) => {
        // Manejar error
        if (error instanceof PaginateEndOfStreamError) {
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
        // Manejar éxito
        console.log('Fetched messages:', response);
        return response;
      },
    );
  }
}
