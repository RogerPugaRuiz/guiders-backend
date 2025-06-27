import {
  CommandHandler,
  EventPublisher,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { StartChatCommand } from './start-chat.command';
import { Inject } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../domain/chat/chat.repository';
import { Chat } from '../../../domain/chat/chat';
import { GetVisitorByIdQuery } from 'src/context/visitors/application/queries/get-visitor-by-id.query';
import { VisitorPrimitives } from 'src/context/visitors/domain/visitor';

@CommandHandler(StartChatCommand)
export class StartChatCommandHandler
  implements ICommandHandler<StartChatCommand>
{
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
    private readonly queryBus: QueryBus,
  ) {}
  async execute(command: StartChatCommand): Promise<any> {
    const { chatId, visitorId, companyId, timestamp } = command;
    let { visitorName } = command;

    // Si el visitante no tiene un nombre asignado, lo buscamos en el contexto de visitantes
    if (!visitorName) {
      const visitor: VisitorPrimitives | null = await this.queryBus.execute(
        new GetVisitorByIdQuery(visitorId),
      );
      visitorName = visitor?.name || 'Visitante Anónimo';
    }

    const chat = Chat.createPendingChat({
      chatId,
      companyId,
      visitor: {
        id: visitorId,
        name: visitorName,
      },
      createdAt: timestamp,
    });

    const chatAggregate = this.publisher.mergeObjectContext(chat);
    await this.chatRepository.save(chatAggregate);
    chatAggregate.commit();
  }
}
