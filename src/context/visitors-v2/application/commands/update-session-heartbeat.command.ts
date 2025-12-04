import { ICommand } from '@nestjs/cqrs';
import { ActivityType } from '../dtos/update-session-heartbeat.dto';

export class UpdateSessionHeartbeatCommand implements ICommand {
  constructor(
    public readonly sessionId: string,
    public readonly visitorId?: string, // Opcional para validación adicional
    public readonly activityType?: ActivityType, // Tipo de actividad: heartbeat (solo mantiene sesión) o user-interaction (reactiva a ONLINE)
  ) {}
}
