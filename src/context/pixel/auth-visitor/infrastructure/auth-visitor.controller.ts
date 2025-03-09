import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
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
  constructor(private readonly authVisitor: AuthVisitorService) {}

  @Post('token')
  async getToken(@Body('client') client: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    try {
      return await this.authVisitor.tokens(parseInt(client));
    } catch (error) {
      console.error(error);
      if (error instanceof VisitorAccountNotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      if (error instanceof ClientNotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException('Internal server error', 500);
    }
  }

  @Post('register')
  async register(
    @Body('apiKey') apiKey: string,
    @Body('client') client: string,
    @Body('userAgent') userAgent: string,
  ): Promise<void> {
    try {
      await this.authVisitor.register(apiKey, parseInt(client), userAgent);
    } catch (error) {
      if (error instanceof VisitorAccountAlreadyExistError) {
        throw new HttpException(error.message, 409);
      }

      throw new HttpException('Internal server error', 500);
    }
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string): Promise<{
    acces_token: string;
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
