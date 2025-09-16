import { ICommand } from '@nestjs/cqrs';

export class EndSessionCommand implements ICommand {
  constructor(
    public readonly sessionId: string,
    public readonly visitorId?: string, // Opcional para validación adicional
    public readonly reason?: string, // Razón del cierre (opcional)
  ) {}
}
