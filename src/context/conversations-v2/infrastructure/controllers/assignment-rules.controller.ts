import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

// Shared types
import { Result } from 'src/context/shared/domain/result';

// Guards y decoradores
import { Roles } from 'src/context/shared/infrastructure/roles.decorator';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';
import {
  AuthGuard,
  AuthenticatedRequest,
} from 'src/context/shared/infrastructure/guards/auth.guard';

// Commands y Queries
import { CreateAssignmentRulesCommand } from '../../application/commands/create-assignment-rules.command';
import { GetApplicableAssignmentRulesQuery } from '../../application/queries/get-applicable-assignment-rules.query';
import { GetApplicableAssignmentRulesError } from '../../application/queries/get-applicable-assignment-rules.query-handler';

// DTOs
import {
  CreateAssignmentRulesDto,
  AssignmentRulesResponseDto,
} from '../dto/assignment-rules.dto';

// Value Objects
import { AssignmentRules } from '../../domain/value-objects/assignment-rules';

/**
 * Controlador para gestión de reglas de auto-asignamiento
 */
@ApiTags('Reglas de Auto-asignamiento')
@ApiBearerAuth()
@Controller('v2/assignment-rules')
@UseGuards(AuthGuard, RolesGuard)
export class AssignmentRulesController {
  private readonly logger = new Logger(AssignmentRulesController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Crea nuevas reglas de auto-asignamiento
   */
  @Post()
  @Roles(['admin', 'supervisor'])
  @ApiOperation({
    summary: 'Crear reglas de auto-asignamiento',
    description:
      'Crea nuevas reglas de auto-asignación para una empresa o sitio específico',
  })
  @ApiResponse({
    status: 201,
    description: 'Reglas creadas exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Reglas creadas exitosamente' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos suficientes' })
  async createRules(
    @Body() createDto: CreateAssignmentRulesDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(
        `Usuario ${req.user?.id} creando reglas para empresa ${createDto.companyId}`,
      );

      const command = new CreateAssignmentRulesCommand(createDto);
      await this.commandBus.execute(command);

      return {
        success: true,
        message: 'Reglas de auto-asignación creadas exitosamente',
      };
    } catch (error) {
      this.logger.error(
        `Error al crear reglas para empresa ${createDto.companyId}:`,
        error,
      );
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene las reglas aplicables para una empresa/sitio
   */
  @Get('companies/:companyId/applicable')
  @Roles(['admin', 'supervisor', 'commercial'])
  @ApiOperation({
    summary: 'Obtener reglas aplicables',
    description:
      'Obtiene las reglas de auto-asignamiento más específicas para una empresa/sitio',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID de la empresa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'siteId',
    required: false,
    description: 'ID del sitio (opcional)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Reglas obtenidas exitosamente',
    type: AssignmentRulesResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No se encontraron reglas' })
  async getApplicableRules(
    @Param('companyId') companyId: string,
    @Query('siteId') siteId?: string,
    @Req() req?: AuthenticatedRequest,
  ): Promise<AssignmentRulesResponseDto> {
    try {
      this.logger.log(
        `Usuario ${req?.user?.id} obteniendo reglas para empresa ${companyId}${
          siteId ? ` y sitio ${siteId}` : ''
        }`,
      );

      const query = new GetApplicableAssignmentRulesQuery(companyId, siteId);
      const result: Result<
        AssignmentRules | null,
        GetApplicableAssignmentRulesError
      > = await this.queryBus.execute(query);

      if (result.isOk()) {
        const rules = result.value;
        if (!rules) {
          throw new HttpException(
            'No se encontraron reglas aplicables',
            HttpStatus.NOT_FOUND,
          );
        }

        return this.mapToResponseDto(rules);
      } else {
        const errorMessage = result.error.message || 'Error desconocido';
        this.logger.error(
          `Error en query de reglas aplicables: ${errorMessage}`,
        );
        throw new HttpException('Error del sistema', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      this.logger.error(
        `Error al obtener reglas para empresa ${companyId}:`,
        error,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Mapea un value object AssignmentRules a DTO de respuesta
   */
  private mapToResponseDto(rules: AssignmentRules): AssignmentRulesResponseDto {
    return {
      companyId: rules.companyId,
      siteId: rules.siteId,
      isActive: rules.isActive,
      defaultStrategy: rules.defaultStrategy,
      workingHours: rules.workingHours,
      fallbackStrategy: rules.fallbackStrategy,
      priorities: rules.priorities,
      maxChatsPerCommercial: rules.maxChatsPerCommercial,
      maxWaitTimeSeconds: rules.maxWaitTimeSeconds,
      enableSkillBasedRouting: rules.enableSkillBasedRouting,
      createdAt: rules.createdAt,
      updatedAt: rules.updatedAt,
    };
  }
}
