import { Injectable } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { StartChatCommand } from '../application/create/pending/start-chat.command';

@Injectable()
export class ChatService {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  public async startChat(
    chatId: string,
    visitorId: string,
    companyId: string,
    visitorName?: string,
  ): Promise<void> {
    const command = new StartChatCommand(
      chatId,
      visitorId,
      companyId,
      visitorName,
    );
    await this.commandBus.execute(command);
  }
}
