import { Module } from '@nestjs/common';
import { ApiKeyAuthService } from './api-key-auth.service';
import { ApiKeyAuthController } from './api-key-auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { ApiKeyEntity } from './api-key.entity';
import { EncryptionService } from 'src/shared/service/encryption.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity])],
  controllers: [ApiKeyAuthController],
  providers: [ApiKeyAuthService, EncryptionService],
})
export class ApiKeyAuthModule {}
