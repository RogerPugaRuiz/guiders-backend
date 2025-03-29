import { ICommand } from '@nestjs/cqrs';

export class RegisterChatCommand implements ICommand {
  constructor(
    readonly visitorId: string,
    readonly commercialId: string | null,
  ) {}

  public static create(params: {
    visitorId: string;
    commercialId?: string;
  }): RegisterChatCommand {
    return new RegisterChatCommand(
      params.visitorId,
      params.commercialId ?? null,
    );
  }
}
