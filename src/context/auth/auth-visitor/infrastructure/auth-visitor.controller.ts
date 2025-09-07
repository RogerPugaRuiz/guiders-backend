import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthVisitorService } from './services/auth-visitor.service';
import { ApiKeyNotFoundError, InvalidTokenError } from './services/errors';
import {
  ClientNotFoundError,
  InvalidDomainError,
  VisitorAccountAlreadyExistError,
  VisitorAccountNotFoundError,
} from '../application/error/auth-visitor.errors';
import {
  AccessTokenResponseDto,
  VisitorRefreshTokenRequestDto,
  RegisterVisitorRequestDto,
  TokenRequestDto,
  TokensResponseDto,
} from '../application/dtos/auth-visitor.dto';

@ApiTags('Pixel Visitor Auth')
@Controller('pixel')
export class AuthVisitorController {
  private readonly logger = new Logger(AuthVisitorController.name);

  constructor(private readonly authVisitor: AuthVisitorService) {}

  @Post('token')
  @ApiOperation({
    summary: 'Obtener par de tokens para visitante existente',
    description:
      'Devuelve access_token y refresh_token para un visitor previamente registrado. Requiere cabeceras Origin y Referer con mismo hostname.',
  })
  @ApiBody({ type: TokenRequestDto })
  @ApiCreatedResponse({
    description: 'Tokens emitidos correctamente',
    type: TokensResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Origin/Referer inválidos o no coinciden',
  })
  @ApiNotFoundResponse({
    description: 'Visitor o client no encontrado / dominio inválido',
  })
  async getToken(
    @Body() body: TokenRequestDto,
    @Headers('origin') origin: string | undefined,
    @Headers('referer') referer: string | undefined,
  ): Promise<TokensResponseDto> {
    try {
      if (!origin || !referer) {
        throw new HttpException('No origin or referer', 400);
      }
      const originUrl = new URL(origin);
      const refererUrl = new URL(referer);
      if (originUrl.hostname !== refererUrl.hostname) {
        throw new HttpException('Origin and referer do not match', 400);
      }
      const domain = originUrl.hostname;
      const normalizedDomain = domain.startsWith('www.')
        ? domain.slice(4)
        : domain;

      return await this.authVisitor.tokens({
        client: body.client,
        domain: normalizedDomain,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof VisitorAccountNotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      if (error instanceof ClientNotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Internal server error', 500);
    }
  }

  @Post('register')
  @ApiOperation({
    summary: 'Registrar visitante + emitir tokens',
    description:
      'Registra un visitante si no existe (por apiKey + client + dominio) y devuelve tokens. Si ya existe, re-emite tokens.',
  })
  @ApiBody({ type: RegisterVisitorRequestDto })
  @ApiCreatedResponse({
    description: 'Visitante registrado o existente: tokens emitidos',
    type: TokensResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Dominio inválido / Origin-Referer no coinciden',
  })
  @ApiNotFoundResponse({ description: 'API Key o Visitor no encontrado' })
  async register(
    @Body() body: RegisterVisitorRequestDto,
    @Headers('origin') origin: string | undefined,
    @Headers('referer') referer: string | undefined,
  ): Promise<TokensResponseDto> {
    if (!origin || !referer) {
      throw new HttpException('No origin or referer', 400);
    }
    const originUrl = new URL(origin);
    const refererUrl = new URL(referer);
    if (originUrl.hostname !== refererUrl.hostname) {
      throw new HttpException('Origin and referer do not match', 400);
    }
    const domain = originUrl.hostname;
    const normalizedDomain = domain.startsWith('www.')
      ? domain.slice(4)
      : domain;
    this.logger.log(`Registering visitor for domain ${normalizedDomain}`);
    try {
      await this.authVisitor.register(
        body.apiKey,
        body.client,
        body.userAgent,
        normalizedDomain,
      );

      return await this.authVisitor.tokens({
        client: body.client,
        domain: normalizedDomain,
      });
    } catch (error) {
      if (error instanceof VisitorAccountNotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error instanceof InvalidDomainError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof VisitorAccountAlreadyExistError) {
        try {
          return await this.authVisitor.tokens({
            client: body.client,
            domain: originUrl.hostname,
          });
        } catch (error) {
          if (error instanceof ApiKeyNotFoundError) {
            throw new HttpException(error.message, HttpStatus.NOT_FOUND);
          }
          if (error instanceof InvalidDomainError) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
          }
          throw error;
        }
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(`Internal server error: ${error}`, 500);
    }
  }

  @Post('token/refresh')
  @ApiOperation({
    summary: 'Refrescar access token',
    description:
      'Devuelve un nuevo access_token válido a partir de refresh_token.',
  })
  @ApiBody({ type: VisitorRefreshTokenRequestDto })
  @ApiCreatedResponse({
    description: 'Access token renovado',
    type: AccessTokenResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido' })
  async refresh(
    @Body() body: VisitorRefreshTokenRequestDto,
  ): Promise<AccessTokenResponseDto> {
    try {
      return await this.authVisitor.refresh(body.refresh_token);
    } catch (error) {
      if (
        error instanceof InvalidTokenError ||
        error instanceof ApiKeyNotFoundError
      ) {
        throw new HttpException(error.message, 401);
      }
      throw new HttpException('Internal server error', 500);
    }
  }
}
