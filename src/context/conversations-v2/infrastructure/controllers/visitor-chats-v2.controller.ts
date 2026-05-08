import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Req,
  Header,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from 'src/context/shared/infrastructure/guards/auth.guard';
import { OptionalAuthGuard } from 'src/context/shared/infrastructure/guards/optional-auth.guard';

import { ChatListResponseDto } from '../../application/dtos/chat-response.dto';
import { PaginationDto } from '../../application/dtos/chat-query.dto';
import { GetChatsWithFiltersQuery } from '../../application/queries/get-chats-with-filters.query';
import {
  ApiAuthErrors,
  ApiInternalServerError,
} from 'src/context/shared/infrastructure/swagger';

/**
 * Controller que expone los chats indexados por visitante.
 * Se separa de ChatV2Controller para evitar ambigüedad de paths con
 * `/v2/chats/:chatId/...` (regla `no-ambiguous-paths` de OpenAPI).
 *
 * Ruta resultante: GET /api/v2/visitors/:visitorId/chats
 */
@ApiTags('Chats V2')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@ApiAuthErrors()
@ApiInternalServerError()
@Controller('v2/visitors')
export class VisitorChatsV2Controller {
  private readonly logger = new Logger(VisitorChatsV2Controller.name);

  constructor(private readonly queryBus: QueryBus) {}

  /**
   * Obtiene chats de un visitante específico
   * Soporta autenticación por JWT (Bearer token) o sesión de visitante V2 (cookie 'sid')
   */
  @Get(':visitorId/chats')
  @UseGuards(OptionalAuthGuard)
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiBearerAuth()
  @ApiCookieAuth('sid')
  @ApiHeader({
    name: 'X-Guiders-Sid',
    description: 'Session ID del visitante como cabecera HTTP alternativa',
    required: false,
    example: 'temp_1758226307441_5bjqvmz1vf3',
  })
  @ApiOperation({
    summary: 'Obtener chats de un visitante con paginación cursor',
    description:
      'Retorna el historial de chats de un visitante específico usando paginación basada en cursor. ' +
      'Soporta múltiples tipos de autenticación:\n' +
      '1. **Bearer Token (JWT)**: Para comerciales, administradores y supervisores que pueden acceder a chats de cualquier visitante\n' +
      '2. **Cookie de sesión (sid)**: Para visitantes que solo pueden acceder a sus propios chats\n' +
      '3. **Header X-Guiders-Sid**: Cabecera HTTP alternativa para enviar el session ID\n' +
      '4. **Cookies adicionales**: x-guiders-sid, guiders_session_id (accesibles desde JavaScript)\n' +
      'La validación de permisos se realiza automáticamente según el tipo de autenticación. ' +
      'Orden de prioridad: Body > Header X-Guiders-Sid > Cookie sid > Cookie x-guiders-sid > Cookie guiders_session_id',
  })
  @ApiParam({
    name: 'visitorId',
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Cursor para paginación (opcional)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Número máximo de chats a retornar (1-100)',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de chats del visitante obtenida exitosamente',
    type: ChatListResponseDto,
  })
  async getVisitorChats(
    @Param('visitorId') visitorId: string,
    @Query() queryParams: PaginationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ChatListResponseDto> {
    try {
      this.logger.log(`Obteniendo chats del visitante ${visitorId}`);

      // Determinar el nivel de acceso según la autenticación
      let accessLevel: 'public' | 'visitor' | 'staff' = 'public';

      if (req.user) {
        this.logger.log(
          `Usuario autenticado: ${req.user.id} con roles: ${JSON.stringify(req.user.roles)}`,
        );

        const userRoles = req.user.roles || [];
        const isCommercialOrAdmin = userRoles.some((role) =>
          ['commercial', 'admin', 'supervisor'].includes(role),
        );
        const isVisitor = userRoles.includes('visitor');

        if (isVisitor) {
          if (req.user.id !== visitorId) {
            throw new HttpException(
              'Los visitantes solo pueden acceder a sus propios chats',
              HttpStatus.FORBIDDEN,
            );
          }
          accessLevel = 'visitor';
        } else if (isCommercialOrAdmin) {
          accessLevel = 'staff';
        } else {
          throw new HttpException(
            'Permisos insuficientes para acceder a chats de visitantes',
            HttpStatus.FORBIDDEN,
          );
        }
      } else {
        this.logger.log('Sin autenticación - acceso público a chats básicos');
      }

      this.logger.log(`Query params recibidos: ${JSON.stringify(queryParams)}`);
      this.logger.log(`Nivel de acceso determinado: ${accessLevel}`);

      const filters = {
        visitorId: visitorId,
        ...(accessLevel === 'public' && { publicOnly: true }),
      };

      this.logger.log(`Filtros aplicados: ${JSON.stringify(filters)}`);

      const userId = req.user?.id || visitorId;
      const userRoles = req.user?.roles || ['visitor'];

      const query = GetChatsWithFiltersQuery.create({
        userId: userId,
        userRoles: userRoles,
        filters: filters,
        sort: { field: 'createdAt', direction: 'DESC' },
        cursor: queryParams.cursor,
        limit: queryParams.limit || 20,
      });

      this.logger.log(
        `Query creado: ${JSON.stringify({
          userId: userId,
          userRoles: userRoles,
          filters: filters,
          cursor: queryParams.cursor,
          limit: queryParams.limit || 20,
        })}`,
      );

      const result: ChatListResponseDto = await this.queryBus.execute(query);

      this.logger.log(
        `Resultado obtenido: ${result.total} chats encontrados, ${result.chats.length} en esta página`,
      );

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener chats del visitante ${visitorId}:`,
        error,
      );
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
