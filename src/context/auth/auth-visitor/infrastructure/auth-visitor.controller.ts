import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  Inject,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
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
  PixelMetadataResponseDto,
} from '../application/dtos/auth-visitor.dto';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from '../../api-key/domain/repository/api-key.repository';
import { ApiKeyValue } from '../../api-key/domain/model/api-key-value';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../../company/domain/company.repository';

@ApiTags('Pixel Visitor Auth')
@Controller('pixel')
export class AuthVisitorController {
  private readonly logger = new Logger(AuthVisitorController.name);

  constructor(
    private readonly authVisitor: AuthVisitorService,
    @Inject(API_KEY_REPOSITORY)
    private readonly apiKeyRepository: ApiKeyRepository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
  ) {}

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

  @Get('metadata')
  @ApiOperation({
    summary: 'Obtener metadatos del sitio por API Key',
    description:
      'Devuelve tenantId y siteId necesarios para tracking basándose en el apiKey proporcionado. ' +
      'Este endpoint permite al frontend obtener los identificadores internos sin necesidad de ' +
      'conocer el dominio o realizar validaciones complejas.',
  })
  @ApiQuery({
    name: 'apiKey',
    required: true,
    type: String,
    description: 'API Key pública del sitio',
    example: '12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0',
  })
  @ApiOkResponse({
    description: 'Metadatos obtenidos exitosamente',
    type: PixelMetadataResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'API Key no encontrada o inválida',
  })
  @ApiBadRequestResponse({
    description: 'API Key no proporcionada o formato inválido',
  })
  async getMetadata(
    @Query('apiKey') apiKey: string,
  ): Promise<PixelMetadataResponseDto> {
    try {
      if (!apiKey) {
        throw new HttpException('API Key es requerida', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(
        `Consultando metadata para apiKey: ${apiKey.substring(0, 10)}...`,
      );

      // Buscar ApiKey en el repositorio
      const apiKeyValue = ApiKeyValue.create(apiKey);
      const apiKeyEntity =
        await this.apiKeyRepository.getApiKeyByApiKey(apiKeyValue);

      if (!apiKeyEntity) {
        throw new HttpException('API Key no encontrada', HttpStatus.NOT_FOUND);
      }

      // Obtener domain del ApiKey
      const domain = apiKeyEntity.domain.getValue();
      this.logger.log(`API Key válida. Domain: ${domain}`);

      // Buscar company por domain
      const companyResult = await this.companyRepository.findByDomain(domain);

      if (companyResult.isErr()) {
        this.logger.error(`No se encontró company para domain: ${domain}`);
        throw new HttpException(
          'No se encontró una empresa para este API Key',
          HttpStatus.NOT_FOUND,
        );
      }

      const company = companyResult.value;
      const tenantId = company.getId().getValue();

      // Buscar site que coincida con el domain
      const sites = company.getSites();
      const sitePrimitives = sites.toPrimitives();

      this.logger.log(
        `Empresa encontrada: ${tenantId}. Sitios disponibles: ${sitePrimitives.length}`,
      );

      const targetSite = sitePrimitives.find(
        (site) =>
          site.canonicalDomain === domain ||
          site.domainAliases.includes(domain),
      );

      if (!targetSite) {
        this.logger.error(
          `No se encontró site específico para domain: ${domain}`,
        );
        throw new HttpException(
          'No se encontró un sitio específico para este dominio',
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(
        `Site encontrado: ${targetSite.id} (${targetSite.canonicalDomain})`,
      );

      return new PixelMetadataResponseDto(tenantId, targetSite.id, domain);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error al obtener metadata: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        'Error interno al obtener metadata',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
