import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAuthEntity } from './user-auth.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserAuthService {
  constructor(
    @InjectRepository(UserAuthEntity)
    private readonly userAuthRepo: Repository<UserAuthEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userAuthRepo.findOne({
      where: { email: username },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.password !== password) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const secret = this.configService.get<string>('USER_AUTH_JWT_SECRET');

    const payload_access_token = {
      sub: user.id,
      email: user.email,
      token_type: 'access',
    };
    const access_token = this.jwtService.sign(payload_access_token, {
      secret,
      expiresIn: '1m',
    });

    const payload_refresh_token = {
      sub: user.id,
      email: user.email,
      token_type: 'refresh',
    };

    const refresh_token = this.jwtService.sign(payload_refresh_token, {
      secret,
      expiresIn: '1d',
    });

    return { access_token, refresh_token };
  }
}
