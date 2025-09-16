import { Controller, Get, Head, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

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

  @Get('websocket-test')
  getWebSocketTest(@Res() res: Response) {
    const filePath = join(__dirname, '..', 'static', 'websocket-test.html');
    const content = readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  }

  @Get('protected')
  @UseGuards(AuthGuard('jwt'))
  getProtected(): string {
    return 'This is a protected route';
  }
}
