import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthUserService } from './services/auth-user.service';
import { ValidationError } from 'src/context/shared/domain/validation.error';
import { UserAlreadyExistsError } from '../application/errors/user-already-exists.error';
import { UnauthorizedError } from '../application/errors/unauthorized.error';

@Controller('user/auth')
export class AuthUserController {
  private readonly logger = new Logger(AuthUserController.name);
  constructor(private readonly authUserService: AuthUserService) {}

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    try {
      const tokens = await this.authUserService.login(email, password);
      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      };
    } catch (error) {
      this.logger.error('Error logging in user', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UnauthorizedError) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    try {
      await this.authUserService.register(email, password);
    } catch (error) {
      this.logger.error('Error registering user', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UserAlreadyExistsError) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    try {
      const tokens = await this.authUserService.refresh(refreshToken);
      return {
        access_token: tokens.accessToken,
      };
    } catch (error) {
      this.logger.error('Error refreshing token', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UnauthorizedError) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logout')
  async logout(@Body('refresh_token') refreshToken: string) {
    try {
      await this.authUserService.logout(refreshToken);
    } catch (error) {
      this.logger.error('Error logging out user', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UnauthorizedError) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      } else {
        throw new HttpException(
          'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  @Get('validate')
  async validate(@Headers('Authorization') bearerToken: string) {
    const [prefix, accessToken] = bearerToken.split(' ');
    if (prefix !== 'Bearer') {
      throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
    }
    try {
      const payload = await this.authUserService.validate(accessToken);
      return payload;
    } catch (error) {
      this.logger.error('Error validating token', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UnauthorizedException) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
