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
}
