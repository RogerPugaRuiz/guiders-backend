import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { GoOfflineVisitorCommand } from './go-offline-visitor.command';
import { Inject } from '@nestjs/common';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';

@CommandHandler(GoOfflineVisitorCommand)
export class GoOfflineVisitorCommandHandler
  implements ICommandHandler<GoOfflineVisitorCommand>
{
  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly repository: VisitorV2Repository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: GoOfflineVisitorCommand): Promise<void> {
    const id = new VisitorId(command.visitorId);
    const visitorResult = await this.repository.findById(id);
    if (visitorResult.isErr()) return;
    const visitor = visitorResult.unwrap();

    const agg = this.publisher.mergeObjectContext(visitor);
    agg.goOffline();
    await this.repository.save(agg);
    agg.commit();
  }
}
