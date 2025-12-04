import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../../shared/infrastructure/guards/auth.guard';
import { DualAuthGuard } from '../../../shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from '../../../shared/infrastructure/guards/role.guard';
import { Roles } from '../../../shared/infrastructure/roles.decorator';
import { StartTypingCommand } from '../../application/commands/start-typing.command';
import { StopTypingCommand } from '../../application/commands/stop-typing.command';
import { GetChatPresenceQuery } from '../../application/queries/get-chat-presence.query';
import { ChatPresenceDto } from '../../application/dtos/chat-presence.dto';

/**
 * Controller para operaciones relacionadas con presencia y typing indicators
 * Soporta autenticación dual: JWT Bearer token o cookies de sesión (BFF/Visitor)
 */
@ApiTags('Presence & Typing')
@Controller('presence')
@UseGuards(DualAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class PresenceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Obtener estado de presencia de los participantes de un chat
   */
  @Get('chat/:chatId')
  @Roles(['commercial', 'visitor'])
  @ApiOperation({
    summary: 'Obtener estado de presencia de participantes de un chat',
    description:
      'Retorna el estado de conexión, typing status y última actividad de todos los participantes del chat',
  })
  @ApiResponse({
    status: 200,
    description: 'Presencia obtenida exitosamente',
    type: ChatPresenceDto,
  })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async getChatPresence(
    @Param('chatId') chatId: string,
  ): Promise<ChatPresenceDto> {
    return this.queryBus.execute(new GetChatPresenceQuery(chatId));
  }

  /**
   * Indicar que el usuario está escribiendo
   */
  @Post('chat/:chatId/typing/start')
  @Roles(['commercial', 'visitor'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Indicar que el usuario está escribiendo',
    description:
      'Marca al usuario actual como "escribiendo" en el chat. El estado expira automáticamente en 3 segundos si no se actualiza.',
  })
  @ApiResponse({ status: 204, description: 'Typing indicator iniciado' })
  async startTyping(
    @Param('chatId') chatId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.id;
    const userRoles = request.user.roles || [];
    const userType = userRoles.includes('commercial')
      ? 'commercial'
      : 'visitor';

    await this.commandBus.execute(
      new StartTypingCommand(chatId, userId, userType),
    );
  }

  /**
   * Indicar que el usuario dejó de escribir
   */
  @Post('chat/:chatId/typing/stop')
  @Roles(['commercial', 'visitor'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Indicar que el usuario dejó de escribir',
    description:
      'Limpia el estado de "escribiendo" del usuario actual en el chat.',
  })
  @ApiResponse({ status: 204, description: 'Typing indicator detenido' })
  async stopTyping(
    @Param('chatId') chatId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.id;
    const userRoles = request.user.roles || [];
    const userType = userRoles.includes('commercial')
      ? 'commercial'
      : 'visitor';

    await this.commandBus.execute(
      new StopTypingCommand(chatId, userId, userType),
    );
  }
}
