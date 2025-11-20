import { ICommand } from '@nestjs/cqrs';

export class DisconnectCommercialCommand implements ICommand {
  constructor(public readonly commercialId: string) {}
}
