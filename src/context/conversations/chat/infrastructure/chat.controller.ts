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
import { FindOneChatByIdQuery } from '../../chat/application/read/find-one-chat-by-id.query';
import { FindChatListWithFiltersQuery } from '../../chat/application/read/find-chat-list-with-filters.query';
import { ChatNotFoundError } from '../../chat/domain/chat/errors/errors';
import { ChatResponseDto } from '../../chat/application/dtos/chat-response.dto';
import { Result } from 'src/context/shared/domain/result';
import { ChatPrimitives } from '../../chat/domain/chat/chat';

@Controller()
export class ChatController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly chatService: ChatService,
  ) {}
  // Listar chats del usuario autenticado (solo para usuarios con rol commercial)
  @Get('chats')
  @RequiredRoles('commercial')
  @UseGuards(AuthGuard, RolesGuard)
  async getChatList(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('include') include?: string,
  ): Promise<{ chats: ChatPrimitives[] }> {
    const { id: participantId } = req.user;

    // Convertir limit a number de forma segura
    const parsedLimit = limit ? Number(limit) || 50 : 50;

    // Procesar parámetro include
    const includeFields = include
      ? include.split(',').map((field) => field.trim())
      : [];

    const query = FindChatListWithFiltersQuery.create({
      participantId,
      limit: parsedLimit,
      include: includeFields,
    });

    const result = await this.queryBus.execute<
      FindChatListWithFiltersQuery,
      { chats: ChatPrimitives[] }
    >(query);

    return result;
  }

  @Post('chat/:chatId')
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
  @Get('chat/:chatId/messages')
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

  @Get('chat/:chatId')
  @RequiredRoles('visitor')
  @UseGuards(AuthGuard, RolesGuard)
  async getChatById(@Param('chatId') chatId: string): Promise<ChatResponseDto> {
    const result = await this.queryBus.execute<
      FindOneChatByIdQuery,
      Result<{ chat: ChatPrimitives }, ChatNotFoundError>
    >(new FindOneChatByIdQuery(chatId));
    return result.fold(
      () => {
        throw new HttpException('Chat not found', HttpStatus.NOT_FOUND);
      },
      (value) => new ChatResponseDto(value.chat),
    );
  }
}
