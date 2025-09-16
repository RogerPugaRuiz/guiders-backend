import { ICommand } from '@nestjs/cqrs';

export class UpdateSessionHeartbeatCommand implements ICommand {
  constructor(
    public readonly sessionId: string,
    public readonly visitorId?: string, // Opcional para validación adicional
  ) {}
}
