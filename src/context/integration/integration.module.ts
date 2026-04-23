import { Module } from '@nestjs/common';
import { IntegrationApiKeyModule } from '../auth/integration-api-key/infrastructure/integration-api-key.module';
import { ConversationsV2Module } from '../conversations-v2/conversations-v2.module';
import { IntegrationController } from './infrastructure/controllers/integration.controller';

@Module({
  imports: [IntegrationApiKeyModule, ConversationsV2Module],
  controllers: [IntegrationController],
})
export class IntegrationModule {}
