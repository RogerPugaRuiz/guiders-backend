import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  HttpException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RevokeConsentCommand } from '../../application/commands/revoke-consent.command';
import { RenewConsentCommand } from '../../application/commands/renew-consent.command';
import { GetVisitorConsentHistoryQuery } from '../../application/queries/get-visitor-consent-history.query';
import { GetVisitorAuditLogsQuery } from '../../application/queries/get-visitor-audit-logs.query';
import { RevokeConsentDto } from '../../application/dtos/revoke-consent.dto';
import { RenewConsentDto } from '../../application/dtos/renew-consent.dto';
import { ConsentHistoryResponseDto } from '../../application/dtos/consent-response.dto';
import { AuditLogListResponseDto } from '../../application/dtos/audit-log-response.dto';
import { DualAuthGuard } from '../../../shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from '../../../shared/infrastructure/guards/role.guard';
import { Roles } from '../../../shared/infrastructure/roles.decorator';
import { Result } from '../../../shared/domain/result';
import { VisitorConsentPrimitives } from '../../domain/visitor-consent.aggregate';
import { ConsentAuditLogPrimitives } from '../../domain/consent-audit-log.aggregate';
import { ConsentError } from '../../domain/errors/consent.error';

/**
 * Controller para gestión de consentimientos
 * Endpoints para cumplir con RGPD:
 * - Art. 7.3: Derecho a retirar el consentimiento
 * - Art. 15: Derecho de acceso del interesado
 */
@ApiTags('Consent')
@Controller('consents')
@UseGuards(DualAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConsentController {
  private readonly logger = new Logger(ConsentController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Revoca un consentimiento existente
   * RGPD Art. 7.3: El interesado tendrá derecho a retirar su consentimiento en cualquier momento
   */
  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @Roles(['visitor', 'commercial', 'admin'])
  @ApiOperation({
    summary: 'Revocar un consentimiento',
    description:
      'Permite a un visitante revocar un consentimiento previamente otorgado (RGPD Art. 7.3)',
  })
  @ApiResponse({
    status: 200,
    description: 'Consentimiento revocado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Consentimiento no encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  async revokeConsent(
    @Body() dto: RevokeConsentDto,
  ): Promise<{ message: string }> {
    try {
      const command = new RevokeConsentCommand(
        dto.visitorId,
        dto.consentType,
        dto.reason,
      );

      const result: Result<void, ConsentError> =
        await this.commandBus.execute(command);

      if (result.isErr()) {
        const error = result.error;
        this.logger.error(`Error al revocar consentimiento: ${error.message}`);

        // Manejar tipos específicos de errores
        if (error.message.includes('no encontrado')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }

        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log(
        `Consentimiento revocado: visitorId=${dto.visitorId}, type=${dto.consentType}`,
      );

      return {
        message: 'Consentimiento revocado exitosamente',
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al revocar consentimiento: ${message}`);
      throw new HttpException(
        'Error al revocar consentimiento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Renueva un consentimiento existente extendiendo su fecha de expiración
   * GDPR Art. 7.1: Mantener registro actualizado del consentimiento
   */
  @Post('renew')
  @HttpCode(HttpStatus.OK)
  @Roles(['visitor', 'commercial', 'admin'])
  @ApiOperation({
    summary: 'Renovar un consentimiento',
    description:
      'Permite renovar un consentimiento extendiendo su fecha de expiración (GDPR Art. 7.1)',
  })
  @ApiResponse({
    status: 200,
    description: 'Consentimiento renovado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Consentimiento no encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o consentimiento no renovable',
  })
  async renewConsent(
    @Body() dto: RenewConsentDto,
  ): Promise<{ message: string }> {
    try {
      const command = new RenewConsentCommand(
        dto.visitorId,
        dto.consentType,
        new Date(dto.newExpiresAt),
      );

      const result: Result<void, ConsentError> =
        await this.commandBus.execute(command);

      if (result.isErr()) {
        const error = result.error;
        this.logger.error(`Error al renovar consentimiento: ${error.message}`);

        // Manejar tipos específicos de errores
        if (error.message.toLowerCase().includes('no se encontró')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }

        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log(
        `Consentimiento renovado: visitorId=${dto.visitorId}, type=${dto.consentType}`,
      );

      return {
        message: 'Consentimiento renovado exitosamente',
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al renovar consentimiento: ${message}`);
      throw new HttpException(
        'Error al renovar consentimiento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene el historial completo de consentimientos de un visitante
   * RGPD Art. 15: Derecho de acceso del interesado
   */
  @Get('visitors/:visitorId')
  @Roles(['visitor', 'commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener historial de consentimientos',
    description:
      'Obtiene todos los consentimientos de un visitante (RGPD Art. 15: Derecho de acceso)',
  })
  @ApiParam({
    name: 'visitorId',
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de consentimientos obtenido exitosamente',
    type: ConsentHistoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de visitante inválido',
  })
  async getConsentHistory(
    @Param('visitorId') visitorId: string,
  ): Promise<ConsentHistoryResponseDto> {
    try {
      const query = new GetVisitorConsentHistoryQuery(visitorId);

      const result: Result<VisitorConsentPrimitives[], ConsentError> =
        await this.queryBus.execute(query);

      if (result.isErr()) {
        const error = result.error;
        this.logger.error(`Error al obtener historial: ${error.message}`);
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      const response = new ConsentHistoryResponseDto(result.value);

      this.logger.log(
        `Historial obtenido: visitorId=${visitorId}, total=${response.total}`,
      );

      return response;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al obtener historial: ${message}`);
      throw new HttpException(
        'Error al obtener historial de consentimientos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene los audit logs (registros de auditoría) de un visitante
   * RGPD Art. 5.2: Responsabilidad proactiva - demostrar cumplimiento
   * RGPD Art. 30: Registro de las actividades de tratamiento
   */
  @Get('visitors/:visitorId/audit-logs')
  @Roles(['visitor', 'commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener audit logs de consentimientos',
    description:
      'Obtiene todos los registros de auditoría de consentimientos de un visitante (RGPD Art. 5.2 y Art. 30)',
  })
  @ApiParam({
    name: 'visitorId',
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs obtenidos exitosamente',
    type: AuditLogListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de visitante inválido',
  })
  async getVisitorAuditLogs(
    @Param('visitorId') visitorId: string,
  ): Promise<AuditLogListResponseDto> {
    try {
      const query = new GetVisitorAuditLogsQuery(visitorId);

      const result: Result<ConsentAuditLogPrimitives[], ConsentError> =
        await this.queryBus.execute(query);

      if (result.isErr()) {
        const error = result.error;
        this.logger.error(`Error al obtener audit logs: ${error.message}`);
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      const response = new AuditLogListResponseDto(result.value);

      this.logger.log(
        `Audit logs obtenidos: visitorId=${visitorId}, total=${response.total}`,
      );

      return response;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al obtener audit logs: ${message}`);
      throw new HttpException(
        'Error al obtener audit logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
