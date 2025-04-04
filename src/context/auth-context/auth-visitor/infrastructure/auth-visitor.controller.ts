import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { AuthVisitorService } from './services/auth-visitor.service';
import { ApiKeyNotFoundError, InvalidTokenError } from './services/errors';
import {
  ClientNotFoundError,
  VisitorAccountAlreadyExistError,
  VisitorAccountNotFoundError,
} from '../application/error/auth-visitor.errors';

@Controller('pixel')
export class AuthVisitorController {
  private readonly logger = new Logger(AuthVisitorController.name);

  constructor(private readonly authVisitor: AuthVisitorService) {}

  @Post('token')
  async getToken(
    @Body('client') client: string,
    @Headers('origin') origin: string | undefined,
    @Headers('referer') referer: string | undefined,
  ): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
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

      return await this.authVisitor.tokens({
        client: parseInt(client),
        domain,
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
  async register(
    @Body('apiKey') apiKey: string,
    @Body('client') client: string,
    @Body('userAgent') userAgent: string,
    @Headers('origin') origin: string | undefined,
    @Headers('referer') referer: string | undefined,
  ): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    if (!origin || !referer) {
      throw new HttpException('No origin or referer', 400);
    }
    const originUrl = new URL(origin);
    const refererUrl = new URL(referer);
    if (originUrl.hostname !== refererUrl.hostname) {
      throw new HttpException('Origin and referer do not match', 400);
    }
    const domain = originUrl.hostname;
    this.logger.log(`Registering visitor for domain ${domain}`);
    try {
      await this.authVisitor.register(
        apiKey,
        parseInt(client),
        userAgent,
        domain,
      );

      return await this.authVisitor.tokens({
        client: parseInt(client),
        domain,
      });
    } catch (error) {
      if (error instanceof VisitorAccountNotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error instanceof VisitorAccountAlreadyExistError) {
        try {
          return {
            access_token: '',
            refresh_token: '',
          };
          // return await this.authVisitor.tokens({
          //   client: parseInt(client),
          //   domain: originUrl.hostname,
          // });
        } catch (error) {
          if (error instanceof ApiKeyNotFoundError) {
            throw new HttpException(error.message, 401);
          }
          throw error;
        }
      }

      throw new HttpException(`Internal server error: ${error}`, 500);
    }
  }

  @Post('token/refresh')
  async refresh(@Body('refresh_token') refreshToken: string): Promise<{
    access_token: string;
  }> {
    try {
      return await this.authVisitor.refresh(refreshToken);
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
