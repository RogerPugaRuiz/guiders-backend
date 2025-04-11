import { IQuery } from '@nestjs/cqrs';

export class FindChatListByParticipantQuery implements IQuery {
  constructor(readonly participantId: string) {}
}
