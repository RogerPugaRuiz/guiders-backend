import { ICommand } from '@nestjs/cqrs';

export class ConnectUserCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly roles: string[],
    public readonly socketId: string,
    public readonly companyId?: string,
  ) {}
}
