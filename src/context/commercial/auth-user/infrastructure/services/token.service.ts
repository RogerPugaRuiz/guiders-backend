import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserTokenService } from '../../application/service/user-token-service';

@Injectable()
export class TokenService implements UserTokenService {
  constructor(private readonly jwtService: JwtService) {}

  generate(data: any): Promise<{ accessToken: string; refreshToken: string }> {
    throw new Error('Method not implemented.');
  }
  verify(token: string): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
