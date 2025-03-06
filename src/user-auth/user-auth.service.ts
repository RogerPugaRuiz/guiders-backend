import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { UserAuthEntity } from './user-auth.entity';
import { EntityManager, In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ApiKeyEntity } from 'src/api-key-auth/api-key.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserAuthService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    @InjectRepository(UserAuthEntity)
    private readonly userAuthRepo: Repository<UserAuthEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userAuthRepo.findOne({
      where: { email: username },
      relations: ['apiKeys'], // Incluir la relación con ApiKeyEntity
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (typeof user.password !== 'string') {
      throw new UnauthorizedException('Invalid password format');
    }

    const isPasswordValid = await validatePassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const secret = this.configService.get<string>('USER_AUTH_JWT_SECRET');

    const payload_access_token = {
      sub: user.id,
      email: user.email,
      typ: 'access',
      jti: uuidv4(),
    };
    const access_token = this.jwtService.sign(payload_access_token, {
      secret,
      expiresIn: '5m',
    });

    const payload_refresh_token = {
      sub: user.id,
      email: user.email,
      typ: 'refresh',
      jti: uuidv4(),
    };

    const refresh_token = this.jwtService.sign(payload_refresh_token, {
      secret,
      expiresIn: '1d',
    });

    return { access_token, refresh_token };
  }

  async register(username: string, password: string, apiKeyIds: string[]) {
    const user = await this.userAuthRepo.findOne({
      where: { email: username },
      relations: ['apiKeys'], // Incluir la relación con ApiKeyEntity
    });
    if (user) {
      throw new UnauthorizedException('Usuario ya registrado');
    }

    const hashedPassword = await generateHash(password);
    // const newUser = this.userAuthRepo.create({
    //   email: username,
    //   password: hashedPassword,
    //   apiKeys: [],
    // });

    // Guardar el nuevo usuario primero
    const savedUser = new UserAuthEntity();
    savedUser.email = username;
    savedUser.password = hashedPassword;

    // Obtener las apiKeys por sus IDs y asignarlas al nuevo usuario
    if (apiKeyIds && apiKeyIds.length > 0) {
      const apiKeys = await this.userAuthRepo.manager.findBy(ApiKeyEntity, {
        id: In(apiKeyIds),
      });
      console.log(apiKeys);
      savedUser.apiKeys = apiKeys;
      await this.userAuthRepo.save(savedUser);
    }

    return { message: 'Usuario registrado' };
  }

  async refresh(refreshToken: string) {
    const decoded = this.jwtService.decode<{
      sub: string;
      email: string;
      typ: string;
      jti: string;
    }>(refreshToken);
    if (!decoded || decoded.typ !== 'refresh') {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.userAuthRepo.findOne({
      where: { id: decoded.sub },
      relations: ['apiKeys'], // In the future, we may want to include the apiKeys
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const secret = this.configService.get<string>('USER_AUTH_JWT_SECRET');

    try {
      this.jwtService.verify(refreshToken, { secret });
    } catch (error: any) {
      throw new UnauthorizedException('Token inválido');
    }

    const payload_access_token = {
      sub: user.id,
      email: user.email,
      typ: 'access',
      jti: uuidv4(),
    };
    const access_token = this.jwtService.sign(payload_access_token, {
      secret,
      expiresIn: '5m',
    });

    return { access_token };
  }
}

async function validatePassword(
  password: string,
  userPasswordHash: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return await bcrypt.compare(password, userPasswordHash);
}

async function generateHash(password: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return await bcrypt.hash(password, 10);
}
