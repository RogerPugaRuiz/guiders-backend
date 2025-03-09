import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
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
}
