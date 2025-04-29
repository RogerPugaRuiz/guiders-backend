import { ICommand } from '@nestjs/cqrs';

export class ParticipantSeenChatCommand implements ICommand {
  constructor(
    readonly params: {
      chatId: string;
      participantId: string;
      seenAt: Date;
    },
  ) {}
}
