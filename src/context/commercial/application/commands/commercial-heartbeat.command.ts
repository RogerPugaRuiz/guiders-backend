import { ICommand } from '@nestjs/cqrs';

/**
 * Comando para registrar el heartbeat de un comercial
 */
export class CommercialHeartbeatCommand implements ICommand {
  constructor(public readonly commercialId: string) {}
}
