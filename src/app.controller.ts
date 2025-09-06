import { Controller, Get, Head, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Head('health')
  healthCheck(): void {
    return;
  }

  @Get('protected')
  @UseGuards(AuthGuard('jwt'))
  getProtected(): string {
    return 'This is a protected route';
  }
}
