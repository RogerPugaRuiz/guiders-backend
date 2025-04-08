import { IQuery } from '@nestjs/cqrs';

export class FindOneChatByParticipantQuery implements IQuery {
  constructor(readonly participantId: string) {}
}
