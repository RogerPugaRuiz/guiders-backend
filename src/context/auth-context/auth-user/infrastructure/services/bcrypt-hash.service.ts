import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserPasswordHasher } from '../../application/service/user-password-hasher';

@Injectable()
export class BcryptHashService implements UserPasswordHasher {
  private readonly saltRounds = 10;

  async hash(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}
