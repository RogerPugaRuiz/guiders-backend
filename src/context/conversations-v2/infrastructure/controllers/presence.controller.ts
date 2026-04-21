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
  ApiParam,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../../shared/infrastructure/guards/auth.guard';
import { DualAuthGuard } from '../../../shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from '../../../shared/infrastructure/guards/role.guard';
import { Roles } from '../../../shared/infrastructure/roles.decorator';
import { ApiAuthErrors } from '../../../shared/infrastructure/swagger';
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
@ApiCookieAuth('access_token')
@ApiAuthErrors()
export class PresenceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Obtener estado de presencia de los participantes de un chat
   */
  @Get('chat/:chatId')
  @Roles(['admin', 'commercial', 'visitor'])
  @ApiOperation({
    summary: 'Obtener estado de presencia de participantes de un chat',
    description:
      'Devuelve el estado de conexión, indicador de typing y timestamp de última actividad para todos los participantes (visitor, agentes, admins) del chat indicado. Operación de sólo lectura.',
  })
  @ApiParam({
    name: 'chatId',
    description: 'UUID del chat cuyo estado de presencia se quiere consultar.',
    example: '550e8400-e29b-41d4-a716-446655440000',
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
  @Roles(['admin', 'commercial', 'visitor'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Indicar que el usuario está escribiendo',
    description:
      'Marca al usuario autenticado como "escribiendo" en el chat indicado. Emite un evento de typing a los demás participantes vía WebSocket. El estado expira automáticamente a los 3 segundos si no se renueva, por lo que el cliente debe re-emitir mientras el usuario siga tecleando (con debounce recomendado).',
  })
  @ApiParam({
    name: 'chatId',
    description: 'UUID del chat donde se inicia el indicador de typing.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 204, description: 'Typing indicator iniciado' })
  async startTyping(
    @Param('chatId') chatId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.id;
    const userRoles = request.user.roles || [];
    const userType =
      userRoles.includes('commercial') || userRoles.includes('admin')
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
  @Roles(['admin', 'commercial', 'visitor'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Indicar que el usuario dejó de escribir',
    description:
      'Limpia explícitamente el estado de "escribiendo" del usuario autenticado en el chat indicado y notifica a los demás participantes vía WebSocket. Es una operación idempotente: invocarla cuando no hay typing activo no produce error.',
  })
  @ApiParam({
    name: 'chatId',
    description: 'UUID del chat donde se detiene el indicador de typing.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 204, description: 'Typing indicator detenido' })
  async stopTyping(
    @Param('chatId') chatId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.id;
    const userRoles = request.user.roles || [];
    const userType =
      userRoles.includes('commercial') || userRoles.includes('admin')
        ? 'commercial'
        : 'visitor';

    await this.commandBus.execute(
      new StopTypingCommand(chatId, userId, userType),
    );
  }
}
