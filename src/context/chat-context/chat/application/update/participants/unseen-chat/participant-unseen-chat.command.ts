import { ICommand } from '@nestjs/cqrs';

export class ParticipantUnseenChatCommand implements ICommand {
  constructor(
    readonly params: {
      chatId: string;
      participantId: string;
      unseenAt: Date;
    },
  ) {}
}
