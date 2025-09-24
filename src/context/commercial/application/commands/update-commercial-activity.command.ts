import { ICommand } from '@nestjs/cqrs';

export class UpdateCommercialActivityCommand implements ICommand {
  constructor(public readonly commercialId: string) {}
}
