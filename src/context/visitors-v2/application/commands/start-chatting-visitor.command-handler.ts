import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { StartChattingVisitorCommand } from './start-chatting-visitor.command';
import { Inject } from '@nestjs/common';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';

@CommandHandler(StartChattingVisitorCommand)
export class StartChattingVisitorCommandHandler
  implements ICommandHandler<StartChattingVisitorCommand>
{
  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly repository: VisitorV2Repository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: StartChattingVisitorCommand): Promise<void> {
    const id = new VisitorId(command.visitorId);
    const visitorResult = await this.repository.findById(id);
    if (visitorResult.isErr()) return;
    const visitor = visitorResult.unwrap();

    const agg = this.publisher.mergeObjectContext(visitor);
    agg.startChatting();
    await this.repository.save(agg);
    agg.commit();
  }
}
