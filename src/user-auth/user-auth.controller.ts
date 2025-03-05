import { Body, Controller, Post } from '@nestjs/common';
import { UserAuthService } from './user-auth.service';

@Controller('auth')
export class UserAuthController {
  constructor(private readonly userAuthService: UserAuthService) {}

  @Post('login')
  login(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    return this.userAuthService.login(username, password);
  }

  @Post('register')
  register(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('apiKeyIds') apiKeyIds: string[],
  ) {
    console.log(`username: ${username}, password: ${password}`);
    return this.userAuthService.register(username, password, apiKeyIds);
  }

  @Post('refresh')
  refresh(@Body('refresh_token') refreshToken: string) {
    return this.userAuthService.refresh(refreshToken);
  }
}
