/**
 * Controller para generar sugerencias de respuesta con IA
 * Permite a los comerciales obtener sugerencias antes de responder al visitante
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { DualAuthGuard } from 'src/context/shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';
import { Roles } from 'src/context/shared/infrastructure/roles.decorator';
import { GenerateSuggestionCommand } from '../../application/commands/generate-suggestion.command';
import { ImproveTextCommand } from '../../application/commands/improve-text.command';
import {
  RequestSuggestionsDto,
  SuggestionResponseDto,
} from '../../application/dtos/ai-response.dto';
import {
  ImproveTextDto,
  ImproveTextResponseDto,
} from '../../application/dtos/improve-text.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId?: string;
    roles?: string[];
  };
}

@ApiTags('LLM Suggestions')
@Controller('v2/llm')
@UseGuards(DualAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class LlmSuggestionsController {
  private readonly logger = new Logger(LlmSuggestionsController.name);

  constructor(private readonly commandBus: CommandBus) {}

  @Post('suggestions')
  @Roles(['commercial', 'admin', 'supervisor'])
  @ApiOperation({
    summary: 'Generar sugerencias de respuesta para comercial',
    description:
      'Genera hasta 3 sugerencias de respuesta basadas en el contexto del chat para ayudar al comercial a responder al visitante.',
  })
  @ApiBody({ type: RequestSuggestionsDto })
  @ApiResponse({
    status: 201,
    description: 'Sugerencias generadas correctamente',
    type: SuggestionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos (falta chatId o companyId)',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description:
      'No tiene permisos (requiere rol commercial, admin o supervisor)',
  })
  async generateSuggestions(
    @Body() dto: RequestSuggestionsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SuggestionResponseDto> {
    // Obtener companyId del JWT o del body
    const companyId = req.user.companyId || dto.companyId;

    if (!companyId) {
      throw new BadRequestException(
        'El companyId es requerido (en el token o en el body)',
      );
    }

    this.logger.debug(
      `Generando sugerencias para comercial ${req.user.id} en chat ${dto.chatId}`,
    );

    const command = new GenerateSuggestionCommand(
      dto.chatId,
      req.user.id,
      companyId,
      dto.lastMessageContent,
    );

    return this.commandBus.execute(command);
  }

  @Post('improve')
  @Roles(['commercial', 'admin', 'supervisor'])
  @ApiOperation({
    summary: 'Mejorar texto para hacerlo más profesional',
    description:
      'Mejora un texto existente para que tenga una estructura más profesional pero manteniendo un tono humano y natural.',
  })
  @ApiBody({ type: ImproveTextDto })
  @ApiResponse({
    status: 201,
    description: 'Texto mejorado correctamente',
    type: ImproveTextResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos (falta text o companyId)',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description:
      'No tiene permisos (requiere rol commercial, admin o supervisor)',
  })
  async improveText(
    @Body() dto: ImproveTextDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ImproveTextResponseDto> {
    // Obtener companyId del JWT o del body
    const companyId = req.user.companyId || dto.companyId;

    if (!companyId) {
      throw new BadRequestException(
        'El companyId es requerido (en el token o en el body)',
      );
    }

    this.logger.debug(
      `Mejorando texto para usuario ${req.user.id} (${dto.text.length} caracteres)`,
    );

    const command = new ImproveTextCommand(dto.text, req.user.id, companyId);

    return this.commandBus.execute(command);
  }
}
