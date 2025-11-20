import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { GoOnlineVisitorCommand } from './go-online-visitor.command';
import { Inject } from '@nestjs/common';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';

@CommandHandler(GoOnlineVisitorCommand)
export class GoOnlineVisitorCommandHandler
  implements ICommandHandler<GoOnlineVisitorCommand>
{
  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly repository: VisitorV2Repository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: GoOnlineVisitorCommand): Promise<void> {
    const id = new VisitorId(command.visitorId);
    const visitorResult = await this.repository.findById(id);
    if (visitorResult.isErr()) return; // se podría mapear error
    const visitor = visitorResult.unwrap();

    const agg = this.publisher.mergeObjectContext(visitor);
    agg.goOnline();
    await this.repository.save(agg);
    agg.commit();
  }
}
