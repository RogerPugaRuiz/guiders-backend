import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClaimChatCommand } from '../application/commands/claim-chat/claim-chat.command';
import { ReleaseChatClaimCommand } from '../application/commands/release-chat-claim/release-chat-claim.command';
import { FindAvailableChatsQuery } from '../application/queries/find-available-chats/find-available-chats.query';
import { FindClaimedChatsByComercialQuery } from '../application/queries/find-claimed-chats-by-comercial/find-claimed-chats-by-comercial.query';

export class ClaimChatDto {
  chatId: string;
  comercialId: string;
}

export class ReleaseChatClaimDto {
  chatId: string;
  comercialId: string;
}

@ApiTags('Chat Claims')
@Controller('chat-claims')
export class ChatClaimController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reclamar un chat' })
  @ApiResponse({ status: 200, description: 'Chat reclamado exitosamente' })
  @ApiResponse({ status: 400, description: 'El chat ya tiene un claim activo' })
  async claimChat(@Body() dto: ClaimChatDto): Promise<void> {
    const command = new ClaimChatCommand(dto.chatId, dto.comercialId);
    await this.commandBus.execute(command);
  }

  @Post('release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liberar el claim de un chat' })
  @ApiResponse({ status: 200, description: 'Claim liberado exitosamente' })
  @ApiResponse({
    status: 404,
    description: 'No se encontró un claim activo para el chat',
  })
  async releaseChatClaim(@Body() dto: ReleaseChatClaimDto): Promise<void> {
    const command = new ReleaseChatClaimCommand(dto.chatId, dto.comercialId);
    await this.commandBus.execute(command);
  }

  @Get('available')
  @ApiOperation({ summary: 'Obtener chats disponibles para reclamar' })
  @ApiResponse({ status: 200, description: 'Lista de chats disponibles' })
  async getAvailableChats(): Promise<any> {
    const query = new FindAvailableChatsQuery();
    return await this.queryBus.execute(query);
  }

  @Get('comercial/:comercialId')
  @ApiOperation({ summary: 'Obtener chats reclamados por un comercial' })
  @ApiResponse({
    status: 200,
    description: 'Lista de chats reclamados por el comercial',
  })
  async getClaimedChatsByComercial(
    @Param('comercialId') comercialId: string,
  ): Promise<any> {
    const query = new FindClaimedChatsByComercialQuery(comercialId);
    return await this.queryBus.execute(query);
  }
}
