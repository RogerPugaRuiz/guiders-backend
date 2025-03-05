import { Module } from '@nestjs/common';
import { UserAuthService } from './user-auth.service';
import { UserAuthController } from './user-auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAuthEntity } from './user-auth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserAuthEntity])],
  controllers: [UserAuthController],
  providers: [UserAuthService],
})
export class UserAuthModule {}
