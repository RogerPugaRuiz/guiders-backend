import { Body, Controller, Post } from '@nestjs/common';
import { UserAuthService } from './user-auth.service';

@Controller('auth')
export class UserAuthController {
  constructor(private readonly userAuthService: UserAuthService) {}

  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    return await this.userAuthService.login(username, password);
  }

  @Post('register')
  async register(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('apiKeyIds') apiKeyIds: string[],
  ) {
    console.log(`username: ${username}, password: ${password}`);
    return await this.userAuthService.register(username, password, apiKeyIds);
  }

  @Post('refresh')
  async refresh(
    @Body('refresh_token') refreshToken: string,
  ): Promise<{ access_token: string }> {
    return await this.userAuthService.refresh(refreshToken);
  }
}
