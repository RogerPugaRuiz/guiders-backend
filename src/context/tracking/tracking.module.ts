import { Module } from '@nestjs/common';
import { CreateTrackingEventCommandHandler } from './application/commands/create-tracking-event-command.handler';

@Module({
  imports: [],
  controllers: [],
  providers: [
    // Registro del handler de comando para que NestJS lo detecte y pueda inyectarlo
    CreateTrackingEventCommandHandler,
  ],
})
export class TrackingModule {}
